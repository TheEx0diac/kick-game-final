import React from 'react';
import { LeaderboardEntry, RecentActivityItem } from '../types';

interface SidebarProps {
    leaderboard: LeaderboardEntry[];
}

export const Sidebar: React.FC<SidebarProps> = ({ leaderboard }) => {
    return (
        <div className="w-72 h-full bg-slate-900/95 border-r border-slate-700 flex flex-col shrink-0 z-20 shadow-2xl">
            <div className="p-4 border-b border-slate-700 bg-slate-950/50">
                <h3 className="font-bold text-sm text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-trophy text-yellow-500"></i> Top Scorers
                </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-2">
                {leaderboard.length === 0 && (
                    <div className="text-center text-gray-600 text-xs py-10 italic">
                        Waiting for scores...
                    </div>
                )}
                {leaderboard.map((u, idx) => (
                    <div 
                        key={u.username} 
                        className={`
                            flex items-center justify-between p-3 rounded-lg border transition-all
                            ${idx === 0 ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-slate-800/50 border-slate-700'}
                        `}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`
                                w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 shadow-lg
                                ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' : 
                                  idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' : 
                                  idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-700 text-white' : 'bg-slate-700 text-gray-400'}
                            `}>
                                {idx + 1}
                            </div>
                            <span className={`truncate font-bold text-xs ${idx === 0 ? 'text-yellow-200' : 'text-gray-200'}`}>
                                {u.username}
                            </span>
                        </div>
                        <span className="font-mono font-bold text-green-400 text-sm">
                            {u.score}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface RecentActivityBarProps {
    items: RecentActivityItem[];
}

export const RecentActivityBar: React.FC<RecentActivityBarProps> = ({ items }) => {
    return (
        <div className="h-20 w-full bg-slate-900/90 border-t border-slate-700 flex flex-col relative z-30 shrink-0 backdrop-blur">
            <div className="flex-1 flex items-center px-6 gap-4 overflow-hidden">
                <div className="text-[10px] font-bold text-slate-500 uppercase shrink-0 tracking-widest flex flex-col items-center border-r border-slate-700 pr-4">
                    <span>LIVE</span>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mt-1"></span>
                </div>
                
                <div className="flex-1 flex items-center justify-start gap-3 h-full overflow-hidden mask-linear-fade">
                    {items.map((item) => (
                        <div key={item.id} className={`
                            animate-slide-in shrink-0 h-12 px-4 rounded-xl flex items-center gap-3 border-l-4 shadow-lg min-w-[160px]
                            ${item.isBonus 
                                ? 'bg-gradient-to-r from-yellow-900/40 to-transparent border-yellow-500' 
                                : 'bg-gradient-to-r from-green-900/40 to-transparent border-green-500'}
                        `}>
                            <span className={`font-black text-xl ${item.isBonus ? 'text-yellow-400' : 'text-green-400'}`}>
                                {item.word}
                            </span>
                            <div className="flex flex-col leading-none w-24 border-l border-white/5 pl-2">
                                <span className="text-[10px] text-gray-300 font-bold truncate">{item.user}</span>
                                <span className="text-[10px] opacity-70 font-mono">+{item.points} pts</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};