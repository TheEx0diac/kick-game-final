import React, { useEffect } from 'react';
import { WordInfo } from '../types';
import { shuffleWord } from '../utils';

interface ProgressBarProps {
    level: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ level }) => {
    // Cycle colors every 20 levels
    const colors = ['bg-green-500', 'bg-blue-500', 'bg-red-500', 'bg-purple-500', 'bg-yellow-500'];
    const cycle = Math.floor((level - 1) / 20);
    const currentColor = colors[cycle % colors.length];
    const progressInCycle = (level - 1) % 20 + 1;
    const ticks = Array.from({length: 20}, (_, i) => i + 1);

    return (
        <div className="flex items-center gap-1 h-4 w-full max-w-md mt-1">
            {ticks.map(t => (
                <div 
                    key={t} 
                    className={`flex-1 h-full rounded-sm transition-all duration-300 ${t <= progressInCycle ? currentColor : 'bg-gray-800/50'}`}
                    style={{boxShadow: t <= progressInCycle ? '0 0 8px currentColor' : 'none'}}
                ></div>
            ))}
        </div>
    );
};

interface GameHeaderProps {
    level: number;
    score: number;
    timer: number;
    wordsRemaining: number;
    totalWords: number;
    onExit: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({ level, score, timer, wordsRemaining, totalWords, onExit }) => (
    <div className="glass-panel mx-4 mt-4 px-6 py-4 rounded-2xl flex justify-between items-center z-20 shrink-0 shadow-2xl border-t border-white/10 relative overflow-hidden">
        {/* Background glow for low time */}
        {timer <= 10 && (
            <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none"></div>
        )}

        <div className="flex items-center gap-6 z-10">
            <button onClick={onExit} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 w-12 h-12 flex items-center justify-center rounded-xl transition-all border border-red-500/20 active:scale-95" title="Exit">
                <i className="fa-solid fa-right-from-bracket text-lg"></i>
            </button>
            <div className="flex flex-col min-w-[200px]">
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white tracking-tight">LEVEL {level}</span>
                </div>
                <ProgressBar level={level} />
            </div>
        </div>
        
        <div className="flex items-center gap-8 z-10">
            {/* Words Remaining Indicator - New */}
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Words Left</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-blue-400 text-glow">{wordsRemaining}</span>
                    <span className="text-sm font-bold text-gray-500">/ {totalWords}</span>
                </div>
            </div>

            <div className="h-12 w-px bg-white/10"></div>

            <div className="text-right flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Score</span>
                <span className="text-3xl font-black text-yellow-400 text-glow">{score.toLocaleString()}</span>
            </div>

            <div className="text-right w-24 flex flex-col items-end pl-4 border-l border-white/10">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Time</span>
                <span className={`text-4xl font-black tabular-nums ${timer < 10 ? 'text-red-500 animate-pulse text-glow' : 'text-white'}`}>{timer}s</span>
            </div>
        </div>
    </div>
);

interface WordGridProps {
    displayWords: Record<string, WordInfo[]>;
    isAdmin: boolean;
    onWordClick: (word: string) => void;
}

export const WordGrid: React.FC<WordGridProps> = ({ displayWords, isAdmin, onWordClick }) => {
    return (
        <div className="w-full max-w-7xl flex-1 overflow-y-auto custom-scroll px-4 pt-4 pb-4">
            {Object.keys(displayWords).sort((a,b) => parseInt(b) - parseInt(a)).map(len => (
                <div key={len} className="flex flex-wrap justify-center gap-4 w-full mb-6">
                    {displayWords[len].map((item) => (
                        <div 
                            key={item.word} 
                            onClick={() => !item.found && isAdmin ? onWordClick(item.word) : null} 
                            className={`
                                relative h-20 min-w-[130px] px-2 rounded-xl flex flex-col items-center justify-center transition-all duration-500 border-2 shadow-lg
                                ${item.found 
                                    ? 'bg-gradient-to-br from-green-600 to-green-700 border-green-400 text-white -translate-y-1 shadow-green-900/50' 
                                    : isAdmin 
                                        ? 'bg-slate-800 border-red-500/30 cursor-pointer hover:border-red-500' 
                                        : 'bg-slate-800/80 border-slate-600'
                                }
                            `}
                        >
                            {/* Score Points - Moved to top right corner to prevent overlap */}
                            {!item.found && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 border border-slate-600 rounded-full flex items-center justify-center z-10 shadow-md">
                                    <span className="text-[10px] text-purple-300 font-bold">{item.points}</span>
                                </div>
                            )}

                            {/* ADJUSTED: leading-normal to prevent cutoff, added pb-1 */}
                            <div className="font-bold tracking-widest text-2xl md:text-3xl leading-normal flex gap-1 mb-1 items-center justify-center w-full">
                                {item.found ? (
                                    <span className="animate-pop-in drop-shadow-md py-1">{item.word}</span>
                                ) : (
                                    Array.from(item.word).map((char, i) => (
                                        <div 
                                            key={i} 
                                            className={`
                                                w-7 h-10 md:w-8 md:h-12 rounded text-lg flex items-center justify-center font-bold border transition-colors duration-300
                                                ${item.revealedIndices.includes(i) 
                                                    ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.3)]' 
                                                    : 'bg-slate-700/50 border-slate-600/50 text-slate-600'
                                                }
                                            `}
                                        >
                                            {item.revealedIndices.includes(i) ? char : ''}
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            {item.found && (
                                <div className="absolute bottom-1 left-0 w-full text-center flex justify-between px-3 items-center">
                                    <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded text-white truncate max-w-[80px] font-bold border border-white/5">{item.user}</span>
                                    <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded text-green-100 border border-white/10">+{item.points}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

interface ScrambledLettersProps {
    word: string;
    setScrambledWord: React.Dispatch<React.SetStateAction<string>>;
}

export const ScrambledLetters: React.FC<ScrambledLettersProps> = ({ word, setScrambledWord }) => {
    useEffect(() => {
        const interval = setInterval(() => setScrambledWord(prev => shuffleWord(prev)), 15000);
        return () => clearInterval(interval);
    }, [setScrambledWord]);

    return (
        <div className="mb-8 mt-6 flex gap-3 justify-center transform transition-all duration-500 shrink-0 z-10 bg-slate-800/60 p-6 rounded-[2rem] backdrop-blur-md border border-white/10 shadow-2xl">
            {word.split('').map((char, i) => (
                <div 
                    key={`${char}-${i}`} 
                    className="
                        w-14 h-14 md:w-20 md:h-20 
                        bg-gradient-to-b from-slate-100 to-slate-300 
                        text-slate-900 rounded-2xl 
                        flex items-center justify-center 
                        text-3xl md:text-5xl font-black 
                        shadow-[0_6px_0_#94a3b8,0_10px_10px_rgba(0,0,0,0.3)] 
                        border border-white
                        animate-pop-in
                        hover:-translate-y-1 transition-transform
                    "
                    style={{animationDelay: `${i * 50}ms`}}
                >
                    {char}
                </div>
            ))}
        </div>
    );
};