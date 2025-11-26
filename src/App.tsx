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
    fetchDefaultFile
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
        const groups: Record<string, any[]> = {};
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
            const set = parseDictionaryFile(content) as Set<string>;
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
            
            // Assume these files exist in the public folder of the hosted site
            const [targetText, dictText] = await Promise.all([
                fetchDefaultFile('targets.txt'),
                fetchDefaultFile('dictionary.txt')
            ]);
            
            const targets = parseTargetFile(targetText);
            const set = parseDictionaryFile(dictText) as Set<string>;
            
            setTargetDictionary(targets);
            setFullDictionary(set);
            addLog("Default dictionaries loaded successfully!");
            
        } catch(err: any) {
            console.error(err);
            setError("Could not load default files. Please upload manually. (Ensure targets.txt and dictionary.txt are in the public root)");
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

    const startLevel = (lvl: number) => {
        setLevel(lvl);
        gameStateRef.current = 'PLAYING';
        setGameState('PLAYING');
        setRecentWords([]);

        // Scaled Level Configuration for "More Words"
        let targetCountLimit = 15; // Start higher (was 8)
        let wordLen = 6;
        let time = 90;

        // Scaling logic
        if (lvl <= 3) {
            targetCountLimit = 15;
            wordLen = 6;
            time = 100;
        } else if (lvl <= 6) {
            targetCountLimit = 20;
            wordLen = 7;
            time = 120;
        } else if (lvl <= 10) {
            targetCountLimit = 25;
            wordLen = 7;
            time = 150;
        } else if (lvl <= 15) {
            targetCountLimit = 30;
            wordLen = 8;
            time = 180;
        } else {
            targetCountLimit = 35; // Cap at 35 words
            wordLen = 8;
            time = 200;
        }

        setTimer(time);

        // --- Robust Word Selection ---
        
        // 1. Find candidates for the Root Word
        // We look for words of length `wordLen` in the target dictionary first.
        let candidates = targetDictionary.filter(item => item.word.length === wordLen && item.isTargetable);
        
        // Fallback to slightly harder words if we run out of "targetable" ones
        if (candidates.length < 20) {
             candidates = targetDictionary.filter(item => item.word.length === wordLen);
        }
        
        // Extreme fallback
        if (candidates.length === 0) candidates = targetDictionary.filter(i => i.word.length >= 6);
        if (candidates.length === 0) {
            addLog("Error: No words found for this level.");
            return;
        }

        // 2. Select the Best Root
        // We simulate finding subwords for random candidates and pick the one that gives us enough words.
        let bestRoot = '';
        let bestTargets: string[] = [];
        let bestBonuses: string[] = [];
        
        // Try up to 15 candidates
        for(let attempt=0; attempt<15; attempt++) {
            const rootObj = candidates[Math.floor(Math.random() * candidates.length)];
            const rootMap = buildFrequencyMap(rootObj.word);
            
            // Find all possible subwords in the FULL dictionary
            const validSubWords: string[] = [];
            fullDictionary.forEach(word => {
                 if (canFormWord(word, rootMap)) validSubWords.push(word);
            });

            // Sort logic: 
            // We want to prioritize words that are in the Target Dictionary (common words).
            // But we also want to fill the `targetCountLimit`.
            
            const getTargetInfo = (word: string) => {
                const t = targetDictionary.find(i => i.word === word);
                return t ? { freq: t.freq, isTargetable: t.isTargetable, index: t.originalIndex, isCommon: true } : { freq: -999999, isTargetable: false, index: 999999, isCommon: false };
            };

            // Sort valid subwords: Common/Targetable first, then by length (longer = better usually for game), then alpha
            validSubWords.sort((a, b) => {
                const infoA = getTargetInfo(a);
                const infoB = getTargetInfo(b);
                if (infoA.isCommon !== infoB.isCommon) return infoA.isCommon ? -1 : 1;
                return infoA.index - infoB.index; // Lower index = more common
            });

            const potentialTargets: string[] = [];
            const potentialBonuses: string[] = [];
            
            // Logic: Decrease 4 letter words past round 8
            let fourLetterCount = 0;
            const maxFourLetterWords = lvl > 8 ? 2 : 100; // Limit to 2 if level > 8

            for (const word of validSubWords) {
                const info = getTargetInfo(word);
                const len = word.length;

                // --- AI OBSCURITY FILTER ---
                // "AI" logic: If the word is not common (not in target list) OR its rank is > 2500, it is obscure.
                // Obscure words are forced to be bonuses unless we are absolutely desperate (handled by sort order mainly, but here we enforce type).
                const isObscure = !info.isCommon || info.index > 2500;

                // --- LENGTH FILTERS ---
                // Skip very short words for higher levels
                if (lvl > 5 && len < 4) {
                    potentialBonuses.push(word);
                    continue;
                }

                // Check 4-letter cap
                const is4Letter = len === 4;
                const capReached = is4Letter && lvl > 8 && fourLetterCount >= maxFourLetterWords;

                if (!isObscure && !capReached && potentialTargets.length < targetCountLimit) {
                    potentialTargets.push(word);
                    if (is4Letter) fourLetterCount++;
                } else {
                    potentialBonuses.push(word);
                }
            }
            
            // Heuristic: Prefer roots that actually fill our target limit
            if (potentialTargets.length >= Math.min(10, targetCountLimit)) {
                bestRoot = rootObj.word;
                bestTargets = potentialTargets;
                bestBonuses = potentialBonuses;
                // If we filled the quota, stop searching
                if (potentialTargets.length >= targetCountLimit) break;
            } else {
                // Keep track of the "best so far" just in case we never hit the limit
                if (!bestRoot || potentialTargets.length > bestTargets.length) {
                    bestRoot = rootObj.word;
                    bestTargets = potentialTargets;
                    bestBonuses = potentialBonuses;
                }
            }
        }

        setCurrentRoot(bestRoot);
        setScrambled(shuffleWord(bestRoot));

        const map: ValidWordsMap = {};
        bestTargets.forEach(w => map[w] = { word: w, found: false, user: null, points: getWordScore(w), isTarget: true, revealedIndices: [] });
        bestBonuses.forEach(w => map[w] = { word: w, found: false, user: null, points: getWordScore(w), isTarget: false, revealedIndices: [] });

        setValidWords(map);
        validWordsRef.current = map;

        if(timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimer(prev => {
                if (prev <= 10 && prev > 0) playSound('tick'); // Ticking sound
                
                const halfTime = Math.floor(time / 2);
                if (prev === halfTime) triggerHints();
                if (prev === 16) triggerSingleLetterHint(); // Hint at 15s remaining
                
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
                // Reveal one letter for ALL unfound targets to help clean up
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
            
            playSound('correct'); // SOUND

            setRecentWords(prev => {
                const newEntry = { id: Date.now(), word, user, points: pts, isBonus: !info.isTarget };
                return [...prev, newEntry].slice(-8); // Keep last 8
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
                    playSound('levelUp'); // SOUND
                    if(timerRef.current) clearInterval(timerRef.current);
                    setTimeout(() => startLevel(level + 1), 2000); // 2s pause to celebrate
                }
            }
        }
    };

    const handleGameOver = () => { 
        if (timerRef.current) clearInterval(timerRef.current!); 
        playSound('gameOver'); // SOUND
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
        if (type === 'time') setTimer(t => Math.max(0, t + payload));
        if (type === 'end') handleGameOver();
        if (type === 'hint') triggerHints();
    };

    // --- RENDER ---
    if (gameState === 'SETUP') return <LoadingScreen error={error} targetLoaded={targetDictionary.length > 0} fullLoaded={fullDictionary.size > 0} onTargetLoad={handleTargetLoad} onFullDictLoad={handleFullDictLoad} onUseFallback={useFallback} onLoadDefaults={handleLoadDefaults} />;
    if (gameState === 'MENU') return <ConnectionScreen onConnect={handleConnect} status={connectionStatus} logs={logs} />;
    
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
