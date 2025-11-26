export type GameState = 'SETUP' | 'MENU' | 'PLAYING' | 'GAMEOVER';

export interface TargetWord {
    word: string;
    freq: number;
    originalIndex: number;
    isTargetable: boolean;
}

export interface WordInfo {
    word: string;
    found: boolean;
    user: string | null;
    points: number;
    isTarget: boolean;
    revealedIndices: number[];
}

export interface ValidWordsMap {
    [key: string]: WordInfo;
}

export interface LeaderboardEntry {
    username: string;
    score: number;
}

export interface RecentActivityItem {
    id: number;
    word: string;
    user: string;
    points: number;
    isBonus: boolean;
}

export interface GamePreset {
    name: string;
    user: string;
    id: string;
    key: string;
}

export type ConnectionStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED';

// Pusher Types (Minimal shim for CDN usage)
export interface PusherEvent {
    content?: string;
    message?: string;
    sender?: { username: string };
    user?: { username: string };
}