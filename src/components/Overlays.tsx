import React, { useState, useEffect, useRef } from 'react';
import { LeaderboardEntry } from '../types';

interface AdminPanelProps {
    onSimulate: (user: string, msg: string) => void;
    onSkip: () => void;
    onJumpLevel: (level: number) => void;
    onAddTime: () => void;
    onSubTime: () => void;
    onEndGame: () => void;
    onHint: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onSimulate, onSkip, onJumpLevel, onAddTime, onSubTime, onEndGame, onHint }) => {
    const [simUser, setSimUser] = useState('Admin');
    const [simMsg, setSimMsg] = useState('');
    const [jumpTarget, setJumpTarget] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [position, setPosition] = useState({ x: window.innerWidth - 240, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);

    // Draggable Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !dragStartRef.current) return;
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            dragStartRef.current = { x: e.clientX, y: e.clientY };
        };
        const handleMouseUp = () => {
            setIsDragging(false);
            dragStartRef.current = null;
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    return (
        <div 
            className="glass-panel rounded-xl flex flex-col gap-3 fixed z-50 shadow-2xl border-red-500/30 text-xs overflow-hidden transition-shadow"
            style={{ 
                left: position.x, 
                top: position.y, 
                width: isMinimized ? '160px' : '224px',
                cursor: isDragging ? 'grabbing' : 'auto'
            }}
        >
            <div 
                className="bg-slate-950/80 p-2 font-bold text-[10px] text-red-400 border-b border-gray-700 tracking-widest flex justify-between items-center cursor-grab select-none"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span>ADMIN</span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                    className="hover:text-white px-2 py-0.5"
                >
                    <i className={`fa-solid ${isMinimized ? 'fa-window-maximize' : 'fa-window-minimize'}`}></i>
                </button>
            </div>
            
            {!isMinimized && (
                <div className="p-3 flex flex-col gap-3">
                    <div className="space-y-1">
                        <input value={simUser} onChange={e => setSimUser(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs mb-1 focus:border-blue-500 outline-none text-white" placeholder="User" />
                        <div className="flex gap-1">
                            <input value={simMsg} onChange={e => setSimMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSimulate(simUser, simMsg)} className="flex-1 bg-slate-800 border border-slate-600 px-2 py-1 rounded text-xs focus:border-blue-500 outline-none text-white" placeholder="Guess..." />
                            <button onClick={() => onSimulate(simUser, simMsg)} className="bg-blue-600 px-3 rounded hover:bg-blue-500 text-white"><i className="fa-solid fa-paper-plane"></i></button>
                        </div>
                    </div>

                    {/* Level Jump Control */}
                    <div className="flex gap-1 border-t border-b border-gray-700 py-2">
                        <input 
                            type="number" 
                            value={jumpTarget} 
                            onChange={(e) => setJumpTarget(e.target.value)} 
                            className="w-12 bg-slate-800 border border-slate-600 rounded px-1 text-xs text-center focus:border-blue-500 outline-none text-white font-bold" 
                            placeholder="#"
                        />
                        <button 
                            onClick={() => {
                                const lvl = parseInt(jumpTarget);
                                if (!isNaN(lvl) && lvl > 0) onJumpLevel(lvl);
                            }} 
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 rounded font-bold text-white transition-colors text-[10px] uppercase"
                        >
                            Jump to Level
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={onAddTime} className="bg-green-700 hover:bg-green-600 py-2 rounded font-bold text-white transition-colors">+30s</button>
                        <button onClick={onSubTime} className="bg-red-700 hover:bg-red-600 py-2 rounded font-bold text-white transition-colors">-30s</button>
                        <button onClick={onHint} className="bg-purple-700 hover:bg-purple-600 py-2 rounded font-bold col-span-2 text-white transition-colors flex items-center justify-center gap-2"><i className="fa-solid fa-wand-magic-sparkles"></i> Hint</button>
                        <button onClick={onSkip} className="bg-yellow-600 hover:bg-yellow-500 py-2 rounded font-bold col-span-2 text-white transition-colors flex items-center justify-center gap-2"><i className="fa-solid fa-forward"></i> Skip Level</button>
                    </div>
                    
                    <div className="border-t border-gray-700 pt-2">
                        <button onClick={onEndGame} className="w-full bg-slate-800 hover:bg-red-900/80 py-2 rounded font-bold border border-slate-600 hover:border-red-500 text-red-400 transition-all">Force End Game</button>
                    </div>
                </div>
            )}
        </div>
    );
};

interface GameOverProps {
    score: number;
    level: number;
    leaderboard: LeaderboardEntry[];
    onRestart: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ score, level, leaderboard, onRestart }) => {
    const top3 = leaderboard.slice(0, 3);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-pop-in">
            <div className="glass-panel p-8 rounded-3xl text-center max-w-2xl w-full border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-600 mb-8 drop-shadow-sm">GAME OVER</h2>
                
                {/* Podium */}
                <div className="flex items-end justify-center gap-4 mb-10 h-48">
                    {/* 2nd Place */}
                    <div className="flex flex-col items-center w-24">
                        <div className="text-xs truncate w-full mb-1 font-bold text-gray-400">{top3[1]?.username || '-'}</div>
                        <div className="w-full bg-gradient-to-b from-gray-300 to-gray-500 h-24 rounded-t-lg border-t-4 border-gray-200 flex justify-center items-end pb-2">
                            <span className="text-4xl font-black text-gray-800 opacity-50">2</span>
                        </div>
                    </div>
                    {/* 1st Place */}
                    <div className="flex flex-col items-center w-32 relative">
                        <i className="fa-solid fa-crown text-4xl text-yellow-400 mb-2 animate-bounce absolute -top-12"></i>
                        <div className="text-sm truncate w-full mb-1 font-bold text-yellow-200">{top3[0]?.username || '-'}</div>
                        <div className="w-full bg-gradient-to-b from-yellow-300 to-yellow-600 h-32 rounded-t-lg border-t-4 border-yellow-100 flex justify-center items-end pb-2 shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                            <span className="text-5xl font-black text-yellow-900 opacity-50">1</span>
                        </div>
                    </div>
                    {/* 3rd Place */}
                    <div className="flex flex-col items-center w-24">
                        <div className="text-xs truncate w-full mb-1 font-bold text-gray-400">{top3[2]?.username || '-'}</div>
                        <div className="w-full bg-gradient-to-b from-orange-600 to-amber-800 h-16 rounded-t-lg border-t-4 border-orange-400 flex justify-center items-end pb-2">
                            <span className="text-3xl font-black text-orange-900 opacity-50">3</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center gap-12 px-10 mb-8 p-4 bg-black/20 rounded-2xl mx-auto w-fit border border-white/5">
                    <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Level Reached</div>
                        <div className="text-3xl font-black text-white">{level}</div>
                    </div>
                    <div className="w-px bg-gray-700"></div>
                    <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Total Score</div>
                        <div className="text-3xl font-black text-yellow-400">{score.toLocaleString()}</div>
                    </div>
                </div>

                <button 
                    onClick={onRestart} 
                    className="w-full bg-white hover:bg-gray-100 text-black py-4 rounded-xl font-black text-xl hover:scale-[1.02] transition-transform shadow-xl"
                >
                    PLAY AGAIN
                </button>
            </div>
        </div>
    );
};
