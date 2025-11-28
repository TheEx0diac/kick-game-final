import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameState, TargetWord, ValidWordsMap, LeaderboardEntry, RecentActivityItem, WordInfo } from './types';
import { 
    FALLBACK_TARGETS, 
    parseTargetFile, 
    parseDictionaryFile, 
    canFormWord, 
    buildFrequencyMap, 
    getWordScore, 
    shuffleWord,
    playSound,
    fetchDefaultFile,
    setGlobalVolume
} from './utils';
import { chatService } from './services/chatService';
import { LoadingScreen, ConnectionScreen } from './components/SetupScreens';
import { GameHeader, WordGrid, ScrambledLetters } from './components/Gameplay';
import { AdminPanel, GameOver } from './components/Overlays';
import { Sidebar, RecentActivityBar } from './components/Sidebar';

const App = () => {
    // --- STATE ---
    const [gameState, setGameState] = useState<GameState>('SETUP');
    const [targetDictionary, setTargetDictionary] = useState<TargetWord[]>([]);
    const [fullDictionary, setFullDictionary] = useState<Set<string>>(new Set());
    const [connectionStatus, setConnectionStatus] = useState('IDLE');
    const [logs, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    // Config State
    const [priorityWordsInput, setPriorityWordsInput] = useState('');
    const [volume, setVolume] = useState(0.5);

    // Game State
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [timer, setTimer] = useState(60);
    const [currentRoot, setCurrentRoot] = useState('');
    const [scrambled, setScrambled] = useState('');
    const [validWords, setValidWords] = useState<ValidWordsMap>({});
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [recentWords, setRecentWords] = useState<RecentActivityItem[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    // Refs
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const gameStateRef = useRef<GameState>('SETUP');
    const validWordsRef = useRef<ValidWordsMap>({});

    // --- COMPUTED ---
    const displayWords = useMemo(() => {
        const groups: Record<string, WordInfo[]> = {};
        Object.keys(validWords).forEach(w => {
            const info = validWords[w] as WordInfo;
            if (info.isTarget) {
                const len = w.length.toString();
                if(!groups[len]) groups[len] = [];
                groups[len].push({ ...info });
            }
        });
        Object.keys(groups).forEach(len => groups[len].sort((a,b) => a.word.localeCompare(b.word)));
        return groups;
    }, [validWords]);

    const wordsRemaining = useMemo(() => {
        return (Object.values(validWords) as WordInfo[]).filter(w => w.isTarget && !w.found).length;
    }, [validWords]);

    const totalTargetWords = useMemo(() => {
        return (Object.values(validWords) as WordInfo[]).filter(w => w.isTarget).length;
    }, [validWords]);

    // --- EFFECTS ---
    useEffect(() => {
        if (targetDictionary.length > 0 && fullDictionary.size > 0) {
            setTimeout(() => {
                setGameState('MENU');
                gameStateRef.current = 'MENU';
            }, 1000);
        }
    }, [targetDictionary, fullDictionary]);

    useEffect(() => {
        setGlobalVolume(volume);
    }, [volume]);

    // --- HANDLERS ---
    const addLog = (msg: string) => {
        const t = new Date().toLocaleTimeString().split(' ')[0];
        setLogs(prev => [`[${t}] ${msg}`, ...prev].slice(0, 50));
    };

    const handleTargetLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const content = ev.target?.result as string;
                const targets = parseTargetFile(content);
                setTargetDictionary(targets);
                addLog(`Loaded ${targets.length} target words.`);
                setError(null);
            } catch(err) {
                console.error(err);
                setError("Failed to parse target list.");
            }
        };
        reader.readAsText(file);
    };

    const handleFullDictLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            const set = parseDictionaryFile(content);
            setFullDictionary(set);
            addLog(`Loaded ${set.size} dictionary words.`);
            setError(null);
        };
        reader.readAsText(file);
    };

    const handleLoadDefaults = async () => {
        try {
            setError(null);
            addLog("Downloading default dictionaries...");
            
            const [targetText, dictText] = await Promise.all([
                fetchDefaultFile('./targets.txt'),
                fetchDefaultFile('./dictionary.txt')
            ]);
            
            const targets = parseTargetFile(targetText);
            const set = parseDictionaryFile(dictText);
            
            setTargetDictionary(targets);
            setFullDictionary(set);
            addLog("Default dictionaries loaded successfully!");
            
        } catch(err: any) {
            console.error(err);
            setError("Could not load default files. Please upload manually.");
        }
    };

    const useFallback = () => {
        setTargetDictionary(FALLBACK_TARGETS);
        const fullSet = new Set(FALLBACK_TARGETS.map(t => t.word));
        setFullDictionary(fullSet);
    };

    const handleConnect = (chatId: string, key: string, cluster: string, admin: boolean) => {
        setIsAdmin(admin);
        setConnectionStatus('CONNECTING');
        setLogs([]);
        
        chatService.connect(
            key, 
            cluster, 
            chatId,
            (content, user) => processGuess(content, user),
            (msg) => addLog(msg),
            (status) => {
                if (status === 'connected') {
                    setConnectionStatus('CONNECTED');
                    startLevel(1);
                } else {
                    setConnectionStatus('IDLE');
                }
            }
        );
    };

    const stopGame = () => {
        chatService.disconnect();
        if (timerRef.current) clearInterval(timerRef.current);
        setGameState('MENU');
        gameStateRef.current = 'MENU';
        setConnectionStatus('IDLE');
        setScore(0);
        setLeaderboard([]);
    };

    // --- MAIN LEVEL GENERATION LOGIC ---
    const startLevel = (lvl: number) => {
        setLevel(lvl);
        gameStateRef.current = 'PLAYING';
        setGameState('PLAYING');
        setRecentWords([]);

        // --- DIFFICULTY CONFIGURATION ---
        let rootLen = 7;     // Minimum characters for the scrambled word
        let minTargetLen = 3; // Minimum length for a word to be on the board
        let maxTargetLen = 4; // Maximum length for a word to be on the board (soft cap)
        let time = 90;
        
        // Caps: Maximum number of words allowed for a specific length
        // -1 means unlimited.
        let caps: Record<number, number> = { 3: -1, 4: -1, 5: -1, 6: -1, 7: -1 };

        // Scale Logic
        if (lvl <= 6) {
            // Rounds 1-6: 3 & 4 letter words only.
            // Root must be at least 7 to provide enough letters (as requested).
            rootLen = 7; 
            minTargetLen = 3;
            maxTargetLen = 4;
            time = 90;
        } 
        else if (lvl <= 9) {
            // Rounds 7-9: Add 5 letter words.
            rootLen = 7;
            minTargetLen = 3;
            maxTargetLen = 5;
            // Start reducing 3 letter words slightly (cap at 6)
            caps[3] = 6;
            time = 110;
        } 
        else if (lvl <= 14) {
            // Round 10+: NO 3 letter words. Add 6 letter words.
            rootLen = 8; // Bump root to ensure enough long words
            minTargetLen = 4; // Drop 3s
            maxTargetLen = 6;
            // Cap 4 letter words to ensure difficulty rises
            caps[4] = 5;
            time = 130;
        } 
        else if (lvl <= 19) {
            // Round 15+: Add 7 letter words.
            rootLen = 9;
            minTargetLen = 4; 
            maxTargetLen = 7;
            caps[4] = 3; // Very few 4s
            caps[5] = 6;
            time = 150;
        }
        else {
            // Round 20+: Add 8+ letter words (Extreme)
            rootLen = 10;
            minTargetLen = 5; // Drop 4s?
            maxTargetLen = 10;
            caps[5] = 4;
            time = 180;
        }

        setTimer(time);

        // Parse Priority Words
        const priorityWords = priorityWordsInput
            .split(',')
            .map(w => w.trim().toUpperCase())
            .filter(w => w.length >= 3 && /^[A-Z]+$/.test(w));

        // 1. Candidate Search
        // We look for root words in the target dict that meet the rootLen requirement
        // We relax the "isTargetable" check for root candidates because the root word itself
        // doesn't HAVE to be a common target word (though it helps).
        let candidates = targetDictionary.filter(item => item.word.length === rootLen);
        
        // Fallback: If no strict matches, look for anything >= rootLen
        if (candidates.length < 50) {
            candidates = targetDictionary.filter(item => item.word.length >= rootLen);
        }

        if (candidates.length === 0) {
            addLog("Error: No words found for this level config.");
            return;
        }

        // 2. Selection Loop
        // We need to find a root that generates at least 12 valid TARGET words.
        let bestRoot = '';
        let bestTargets: string[] = [];
        let bestBonuses: string[] = [];
        const MIN_TARGETS = 12;

        for(let attempt=0; attempt<30; attempt++) {
            const rootObj = candidates[Math.floor(Math.random() * candidates.length)];
            const rootMap = buildFrequencyMap(rootObj.word);
            
            const validSubWords: string[] = [];
            fullDictionary.forEach(word => {
                 if (canFormWord(word, rootMap)) validSubWords.push(word);
            });

            const getTargetInfo = (word: string) => {
                const t = targetDictionary.find(i => i.word === word);
                return t ? { isTargetable: t.isTargetable, index: t.originalIndex } : { isTargetable: false, index: 999999 };
            };

            // Bucket Sorting
            const potentialTargets: string[] = [];
            const potentialBonuses: string[] = [];
            
            // Track counts for caps
            const counts: Record<number, number> = { 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0 };

            // Inject Priority Words first
            for (const pw of priorityWords) {
                if (canFormWord(pw, rootMap) && !potentialTargets.includes(pw)) {
                     // Priority words ignore caps and length restrictions (mostly)
                     potentialTargets.push(pw);
                }
            }

            // Sort subwords by "Commonness" first
            validSubWords.sort((a, b) => {
                const infoA = getTargetInfo(a);
                const infoB = getTargetInfo(b);
                if (infoA.isTargetable !== infoB.isTargetable) return infoA.isTargetable ? -1 : 1;
                return infoA.index - infoB.index;
            });

            for (const word of validSubWords) {
                if (potentialTargets.includes(word)) continue; // Already added
                
                const len = word.length;
                const info = getTargetInfo(word);

                let isBonus = false;

                // Rule 1: Must be within length bounds
                if (len < minTargetLen) isBonus = true;
                
                // Rule 2: Note on Max Length - If it's bigger than maxTargetLen, it's a bonus
                // UNLESS it is the Root Word itself, which makes players feel smart.
                // But for the grid, we want to keep it clean. So Big words = Bonus.
                if (len > maxTargetLen) isBonus = true;

                // Rule 3: Must be "Targetable" (Common word)
                if (!info.isTargetable) isBonus = true;

                // Rule 4: Check Caps
                const currentCount = counts[len] || 0;
                const cap = caps[len] !== undefined ? caps[len] : -1;
                if (!isBonus && cap !== -1 && currentCount >= cap) {
                    isBonus = true;
                }

                if (isBonus) {
                    potentialBonuses.push(word);
                } else {
                    potentialTargets.push(word);
                    if (counts[len] !== undefined) counts[len]++;
                    else counts[len] = 1;
                }
            }
            
            // Check if this root is good enough
            if (potentialTargets.length >= MIN_TARGETS) {
                bestRoot = rootObj.word;
                bestTargets = potentialTargets;
                bestBonuses = potentialBonuses;
                break; // Found a valid level
            } else {
                // Keep track of the "best bad option" just in case
                if (!bestRoot || potentialTargets.length > bestTargets.length) {
                    bestRoot = rootObj.word;
                    bestTargets = potentialTargets;
                    bestBonuses = potentialBonuses;
                }
            }
        }

        // If we really couldn't find 12, we just proceed with what we have
        setCurrentRoot(bestRoot);
        setScrambled(shuffleWord(bestRoot));

        const map: ValidWordsMap = {};
        // Main Targets
        bestTargets.forEach(w => map[w] = { 
            word: w, found: false, user: null, points: getWordScore(w), isTarget: true, revealedIndices: [] 
        });
        // Bonus Words
        bestBonuses.forEach(w => map[w] = { 
            word: w, found: false, user: null, points: getWordScore(w), isTarget: false, revealedIndices: [] 
        });

        setValidWords(map);
        validWordsRef.current = map;

        if(timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimer(prev => {
                if (prev <= 10 && prev > 0) playSound('tick');
                const halfTime = Math.floor(time / 2);
                if (prev === halfTime) triggerHints();
                if (prev === 16) triggerSingleLetterHint();
                if (prev <= 1) { 
                    handleGameOver(); 
                    return 0; 
                }
                return prev - 1;
            });
        }, 1000);
    };

    const triggerHints = () => {
        setValidWords(prev => {
            const next = { ...prev };
            let changed = false;
            Object.keys(next).forEach(w => {
                if (next[w].isTarget && !next[w].found) {
                    const len = w.length;
                    const unrevealed = [];
                    for(let i=0; i<len; i++) { if(!next[w].revealedIndices.includes(i)) unrevealed.push(i); }
                    if (unrevealed.length > 0) {
                        const rand = unrevealed[Math.floor(Math.random() * unrevealed.length)];
                        next[w] = { ...next[w], revealedIndices: [...next[w].revealedIndices, rand] };
                        changed = true;
                    }
                }
            });
            validWordsRef.current = changed ? next : prev;
            return changed ? next : prev;
        });
    };

    const triggerSingleLetterHint = () => {
        setValidWords(prev => {
            const next = { ...prev };
            const unfoundTargets = Object.keys(next).filter(w => next[w].isTarget && !next[w].found);
            if (unfoundTargets.length > 0) {
                let changed = false;
                unfoundTargets.forEach(word => {
                     const len = word.length;
                     const unrevealed = [];
                     for(let i=0; i<len; i++) { if(!next[word].revealedIndices.includes(i)) unrevealed.push(i); }
                     if (unrevealed.length > 0) {
                         const rand = unrevealed[Math.floor(Math.random() * unrevealed.length)];
                         next[word] = { ...next[word], revealedIndices: [...next[word].revealedIndices, rand] };
                         changed = true;
                     }
                });
                if (changed) {
                    validWordsRef.current = next;
                    return next;
                }
            }
            return prev;
        });
    };

    const processGuess = (text: string, user: string, overridePts?: number) => {
        if (gameStateRef.current !== 'PLAYING') return;
        const word = text.toString().toUpperCase().trim();
        if (!word) return;

        const map = validWordsRef.current;
        if (map[word] && !map[word].found) {
            const info = map[word];
            const pts = overridePts !== undefined ? overridePts : info.points;
            
            const newMap = { ...map, [word]: { ...info, found: true, user: user, points: pts } };
            setValidWords(newMap);
            validWordsRef.current = newMap;
            setScore(s => s + pts);
            
            playSound('correct');

            setRecentWords(prev => {
                const newEntry = { id: Date.now(), word, user, points: pts, isBonus: !info.isTarget };
                return [...prev, newEntry].slice(-8);
            });

            if (pts > 0) {
                setLeaderboard(prev => {
                    const idx = prev.findIndex(p => p.username === user);
                    if (idx >= 0) {
                        const updated = [...prev];
                        updated[idx] = { ...updated[idx], score: updated[idx].score + pts };
                        return updated.sort((a,b) => b.score - a.score);
                    }
                    return [...prev, { username: user, score: pts }].sort((a,b) => b.score - a.score);
                });
            }

            if (info.isTarget) {
                const targets = (Object.values(newMap) as WordInfo[]).filter(v => v.isTarget);
                if (targets.every(v => v.found)) {
                    playSound('levelUp');
                    if(timerRef.current) clearInterval(timerRef.current);
                    setTimeout(() => startLevel(level + 1), 2000);
                }
            }
        }
    };

    const handleGameOver = () => { 
        if (timerRef.current) clearInterval(timerRef.current!); 
        playSound('gameOver');
        gameStateRef.current = 'GAMEOVER'; 
        setGameState('GAMEOVER'); 
    };

    const handleAdminAction = (type: string, payload?: any) => {
        if (!isAdmin) return;
        if (type === 'simulate') processGuess(payload.msg, payload.user);
        if (type === 'skip') { 
            playSound('levelUp');
            if(timerRef.current) clearInterval(timerRef.current!); 
            setTimeout(() => startLevel(level + 1), 500); 
        }
        if (type === 'jump') {
            playSound('levelUp');
            if(timerRef.current) clearInterval(timerRef.current!); 
            setTimeout(() => startLevel(payload.level), 200);
        }
        if (type === 'time') setTimer(t => Math.max(0, t + payload));
        if (type === 'end') handleGameOver();
        if (type === 'hint') triggerHints();
    };

    if (gameState === 'SETUP') return <LoadingScreen error={error} targetLoaded={targetDictionary.length > 0} fullLoaded={fullDictionary.size > 0} onTargetLoad={handleTargetLoad} onFullDictLoad={handleFullDictLoad} onUseFallback={useFallback} onLoadDefaults={handleLoadDefaults} />;
    if (gameState === 'MENU') return <ConnectionScreen onConnect={handleConnect} status={connectionStatus} logs={logs} priorityWords={priorityWordsInput} setPriorityWords={setPriorityWordsInput} />;
    
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-900 relative">
            <Sidebar leaderboard={leaderboard} />
            
            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
                <GameHeader 
                    level={level} 
                    score={score} 
                    timer={timer} 
                    wordsRemaining={wordsRemaining}
                    totalWords={totalTargetWords}
                    volume={volume}
                    setVolume={setVolume}
                    onExit={stopGame} 
                />

                <div className="flex-1 flex flex-col justify-start items-center overflow-hidden pt-4">
                    <ScrambledLetters word={scrambled} setScrambledWord={setScrambled} />
                    <div className="w-32 h-1.5 bg-white/10 rounded-full mb-4 shrink-0"></div>
                    <WordGrid displayWords={displayWords} isAdmin={isAdmin} onWordClick={(w) => processGuess(w, "Admin", 0)} />
                </div>

                <RecentActivityBar items={recentWords} />
            </div>

            {isAdmin && (
                <AdminPanel 
                    onSimulate={(u, m) => handleAdminAction('simulate', {user: u, msg: m})}
                    onSkip={() => handleAdminAction('skip')}
                    onJumpLevel={(lvl: number) => handleAdminAction('jump', { level: lvl })}
                    onAddTime={() => handleAdminAction('time', 30)}
                    onSubTime={() => handleAdminAction('time', -30)}
                    onEndGame={() => handleAdminAction('end')}
                    onHint={() => handleAdminAction('hint')}
                />
            )}

            {gameState === 'GAMEOVER' && (
                <GameOver 
                    score={score} 
                    level={level} 
                    leaderboard={leaderboard} 
                    onRestart={() => { setScore(0); setLeaderboard([]); startLevel(1); }} 
                />
            )}
        </div>
    );
};

export default App;
