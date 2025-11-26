import React, { useState } from 'react';
import { DEFAULT_PUSHER_KEY, DEFAULT_CLUSTER, PRESETS } from '../utils';
import { GamePreset } from '../types';

interface LoadingScreenProps {
    error: string | null;
    targetLoaded: boolean;
    fullLoaded: boolean;
    onTargetLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFullDictLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUseFallback: () => void;
    onLoadDefaults: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
    error, targetLoaded, fullLoaded, onTargetLoad, onFullDictLoad, onUseFallback, onLoadDefaults 
}) => {
    return (
        <div className="h-full w-full flex items-center justify-center bg-slate-900 text-white flex-col gap-6 p-8 relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="glass-panel p-8 rounded-2xl text-center max-w-md w-full border border-slate-700 relative z-10 animate-pop-in">
                <h2 className="text-3xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    KICK WORDS STREAM
                </h2>
                
                {error && (
                    <div className="text-red-400 bg-red-900/20 p-3 rounded border border-red-500/50 text-xs mb-4 animate-pulse">
                        <i className="fa-solid fa-triangle-exclamation mr-2"></i>{error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Auto Load Option */}
                    <button 
                        onClick={onLoadDefaults} 
                        className="w-full bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white font-bold py-4 rounded-xl shadow-lg transition-all border-b-4 active:border-b-0 active:translate-y-1 mb-4 flex flex-col items-center justify-center gap-1 group"
                    >
                        <span className="flex items-center gap-2 text-lg">
                            <i className="fa-solid fa-cloud-arrow-down group-hover:animate-bounce"></i> 
                            Load Default Lists
                        </span>
                        <span className="text-[10px] text-indigo-200 uppercase tracking-widest font-normal">No file upload required</span>
                    </button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-600"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase font-bold">Or Upload Manually</span>
                        <div className="flex-grow border-t border-slate-600"></div>
                    </div>

                    <div className="space-y-2">
                        <label className={`block w-full cursor-pointer ${targetLoaded ? 'bg-green-600/20 border-green-500 text-green-300' : 'bg-slate-800 hover:bg-slate-700 border-slate-600'} border border-dashed text-white font-bold py-3 rounded-lg transition-all`}>
                            <span className="flex items-center justify-center gap-2 text-sm">
                                <i className={`fa-solid ${targetLoaded ? 'fa-check' : 'fa-list-ol'}`}></i> 
                                {targetLoaded ? "Targets Ready" : "Upload Custom Targets (.txt)"}
                            </span>
                            <input type="file" accept=".txt" className="hidden" onChange={onTargetLoad} />
                        </label>

                        <label className={`block w-full cursor-pointer ${fullLoaded ? 'bg-green-600/20 border-green-500 text-green-300' : 'bg-slate-800 hover:bg-slate-700 border-slate-600'} border border-dashed text-white font-bold py-3 rounded-lg transition-all`}>
                            <span className="flex items-center justify-center gap-2 text-sm">
                                <i className={`fa-solid ${fullLoaded ? 'fa-check' : 'fa-book'}`}></i> 
                                {fullLoaded ? "Dictionary Ready" : "Upload Custom Dict (.txt)"}
                            </span>
                            <input type="file" accept=".txt" className="hidden" onChange={onFullDictLoad} />
                        </label>
                    </div>

                    {(!targetLoaded || !fullLoaded) && (
                        <div className="pt-4 border-t border-slate-700">
                            <button onClick={onUseFallback} className="text-xs text-gray-500 hover:text-white underline transition-colors">
                                Use Tiny Demo List (Offline)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface ConnectionScreenProps {
    onConnect: (id: string, key: string, cluster: string, admin: boolean) => void;
    status: string;
    logs: string[];
}

export const ConnectionScreen: React.FC<ConnectionScreenProps> = ({ onConnect, status, logs }) => {
    const [selectedPreset, setSelectedPreset] = useState('custom');
    const [username, setUsername] = useState('');
    const [chatroomId, setChatroomId] = useState('');
    const [pusherKey, setPusherKey] = useState(DEFAULT_PUSHER_KEY);
    const [pusherCluster, setPusherCluster] = useState(DEFAULT_CLUSTER);
    const [isAdminMode, setIsAdminMode] = useState(false);

    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const key = e.target.value;
        setSelectedPreset(key);
        if (key !== 'custom') {
            const preset = PRESETS[key];
            setUsername(preset.user);
            setChatroomId(preset.id);
            setPusherKey(preset.key);
        }
    };

    return (
        <div className="h-full w-full flex items-center justify-center bg-slate-900 p-4 overflow-hidden relative">
             <div className="absolute inset-0 z-0 opacity-20">
                 {/* Background pattern */}
                 <div className="absolute inset-0 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px]"></div>
             </div>

            <div className="glass-panel p-6 rounded-2xl max-w-4xl w-full grid md:grid-cols-2 gap-8 relative z-10 max-h-[90vh] overflow-y-auto">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 mb-2">WORD STREAM</h1>
                        <p className="text-sm text-gray-400">Connect to your Kick.com chat to start playing.</p>
                    </div>
                    
                    <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Preset Profile</label>
                            <select 
                                value={selectedPreset} 
                                onChange={handlePresetChange}
                                className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-shadow"
                            >
                                <option value="custom">Custom Configuration</option>
                                <option value="exo">Exo's Chat</option>
                                <option value="tim">Tim</option>
                                <option value="boozer">Boozer</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Kick Username</label>
                                <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Channel Name" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Chatroom ID</label>
                                <div className="flex gap-2">
                                    <input type="number" value={chatroomId} onChange={(e) => setChatroomId(e.target.value)} className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="ID Number" />
                                    <button onClick={() => window.open(`https://kick.com/api/v1/channels/${username}`, '_blank')} className="bg-slate-700 hover:bg-slate-600 px-3 rounded-lg text-xs" title="Find ID via API"><i className="fa-solid fa-magnifying-glass"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                        <button 
                            onClick={() => onConnect(chatroomId, pusherKey, pusherCluster, isAdminMode)} 
                            disabled={!chatroomId || status === 'CONNECTING'} 
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-3
                                ${!chatroomId ? 'bg-slate-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white'}
                            `}
                        >
                            {status === 'CONNECTING' ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Connecting...</> : <><i className="fa-solid fa-rocket"></i> Launch Game</>}
                        </button>

                        <div className="flex items-center justify-between px-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isAdminMode ? 'bg-blue-500 border-blue-500' : 'border-gray-500 group-hover:border-white'}`}>
                                    {isAdminMode && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                                </div>
                                <input type="checkbox" className="hidden" checked={isAdminMode} onChange={(e) => setIsAdminMode(e.target.checked)} />
                                <span className="text-xs text-gray-400 group-hover:text-white transition-colors">Enable Admin Mode</span>
                            </label>
                            
                            <details className="text-xs text-gray-500">
                                <summary className="cursor-pointer hover:text-gray-300">Advanced Config</summary>
                                <div className="mt-2 p-2 bg-black/40 rounded border border-gray-700 space-y-2">
                                    <input value={pusherKey} onChange={(e) => setPusherKey(e.target.value)} className="w-full bg-transparent border-b border-gray-700 text-gray-400 p-1 outline-none" placeholder="App Key" />
                                    <input value={pusherCluster} onChange={(e) => setPusherCluster(e.target.value)} className="w-full bg-transparent border-b border-gray-700 text-gray-400 p-1 outline-none" placeholder="Cluster" />
                                </div>
                            </details>
                        </div>
                    </div>
                </div>

                <div className="bg-black/60 rounded-xl p-4 border border-slate-700 flex flex-col h-full min-h-[300px] font-mono text-xs">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
                        <span className="font-bold text-gray-400 uppercase tracking-widest"><i className="fa-solid fa-terminal mr-2"></i>System Log</span>
                        <div className="flex gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scroll">
                        {logs.length === 0 && <span className="text-gray-600 italic">Waiting for connection...</span>}
                        {logs.map((log, i) => (
                            <div key={i} className="text-green-400/90 break-all hover:bg-white/5 p-0.5 rounded">
                                <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};