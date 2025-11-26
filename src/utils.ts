import { TargetWord, GamePreset } from './types';

export const DEFAULT_PUSHER_KEY = 'eb1d5f283081a78b932c';
export const DEFAULT_CLUSTER = 'us2';

export const PRESETS: Record<string, GamePreset> = {
    custom: { name: "Custom", user: "", id: "", key: "eb1d5f283081a78b932c" },
    exo: { name: "Exo's Chat", user: "Exo9137", id: "2971356", key: "32cbd69e4b950bf97679" },
    tim: { name: "Tim", user: "TimisLIVE", id: "2191911", key: "32cbd69e4b950bf97679" },
    boozer: { name: "Boozer", user: "Boozer", id: "67465", key: "32cbd69e4b950bf97679" }
};

const SCRABBLE_POINTS: Record<string, number> = {
    A:1, B:3, C:3, D:2, E:1, F:4, G:2, H:4, I:1, J:8, K:5, L:1, M:3, 
    N:1, O:1, P:3, Q:10, R:1, S:1, T:1, U:1, V:4, W:4, X:8, Y:4, Z:10
};

export const getWordScore = (word: string): number => {
    return word.split('').reduce((acc, char) => acc + (SCRABBLE_POINTS[char.toUpperCase()] || 0), 0) * 10;
};

export const buildFrequencyMap = (word: string): Record<string, number> => {
    const map: Record<string, number> = {};
    for (const char of word) map[char] = (map[char] || 0) + 1;
    return map;
};

export const canFormWord = (word: string, sourceMap: Record<string, number>): boolean => {
    const wordMap = buildFrequencyMap(word);
    for (const char in wordMap) {
        if (!sourceMap[char] || sourceMap[char] < wordMap[char]) return false;
    }
    return true;
};

export const shuffleWord = (word: string): string => {
    const arr = word.split('');
    if(arr.length < 2) return word;
    
    let attempts = 0;
    let shuffled = [...arr];
    
    do {
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        attempts++;
    } while (shuffled.join('') === word && attempts < 5);

    return shuffled.join('');
};

export const FALLBACK_TARGETS: TargetWord[] = [
    { word: "STREAM", freq: -5, originalIndex: 0, isTargetable: true },
    { word: "MASTER", freq: -6, originalIndex: 1, isTargetable: true },
    { word: "GAMING", freq: -7, originalIndex: 2, isTargetable: true },
    { word: "PLAYER", freq: -8, originalIndex: 3, isTargetable: true }
];

export const parseTargetFile = (content: string): TargetWord[] => {
    const lines = content.split(/\r?\n/);
    return lines
        .map((line, index) => ({ 
            word: line.trim().toUpperCase(), 
            freq: -index,
            originalIndex: index,
            isTargetable: false 
        }))
        .filter(item => item.word.length >= 3 && !/['.]/.test(item.word) && /^[A-Z]+$/.test(item.word))
        .map(item => {
            let isTargetable = true;
            // Relaxed constraints for more variety
            if (item.word.length === 3) {
                if (item.originalIndex > 500) isTargetable = false;
            } else if (item.word.length === 4) {
                if (item.originalIndex > 2000) isTargetable = false;
            } else if (item.word.length >= 5) {
                if (item.originalIndex > 5000) isTargetable = false;
            }
            return { ...item, isTargetable };
        });
};

export const parseDictionaryFile = (content: string): Set<string> => {
    return new Set(
        content.split(/\r?\n/)
            .map(w => w.trim().toUpperCase())
            .filter(w => w.length >= 3 && !/['.]/.test(w) && /^[A-Z]+$/.test(w))
    );
};

export const fetchDefaultFile = async (filename: string): Promise<string> => {
    // Fetches relative to the website root (expecting files in /public folder)
    const response = await fetch(filename);
    if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
    return await response.text();
};

// Sound Generation Utility
export const playSound = (type: 'correct' | 'levelUp' | 'gameOver' | 'tick') => {
    if (typeof window === 'undefined') return;
    
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    const createOsc = (freq: number, type: OscillatorType, startTime: number, duration: number, volStart = 0.1, volEnd = 0.01) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        
        gain.gain.setValueAtTime(volStart, startTime);
        gain.gain.exponentialRampToValueAtTime(volEnd, startTime + duration);
        
        osc.stop(startTime + duration);
    };

    if (type === 'correct') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        osc.start(now);
        osc.stop(now + 0.5);
    } 
    else if (type === 'levelUp') {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            createOsc(freq, 'triangle', now + (i * 0.05), 0.5, 0.1, 0.001);
        });
    } 
    else if (type === 'gameOver') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 1.5);
        
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 1.5);
        
        osc.start(now);
        osc.stop(now + 1.5);
    }
    else if (type === 'tick') {
        createOsc(800, 'square', now, 0.05, 0.05, 0.01);
    }
};