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

export const SAFE_TRIPLETS = new Set([
    'ACT','ADD','AGE','AGO','AID','AIM','AIR','ALL','AND','ANY','APE','APT','ARC','ARE','ARM','ART','ASH','ASK','ATE','AWE','AXE',
    'BAD','BAG','BAN','BAR','BAT','BAY','BED','BEE','BEG','BET','BIB','BID','BIG','BIN','BIT','BOA','BOB','BOG','BOO','BOW','BOX','BOY','BRA','BUD','BUG','BUN','BUS','BUT','BUY','BYE',
    'CAB','CAD','CAM','CAN','CAP','CAR','CAT','COD','COG','CON','COP','COT','COW','COY','CRY','CUB','CUE','CUP','CUT',
    'DAB','DAD','DAM','DAY','DEN','DEW','DID','DIE','DIG','DIM','DIN','DIP','DOG','DON','DOT','DRY','DUB','DUO','DYE',
    'EAR','EAT','EGG','EGO','ELF','ELK','ELM','END','ERA','EVE','EYE',
    'FAN','FAR','FAT','FED','FEE','FEW','FIB','FIG','FIN','FIT','FIX','FLU','FLY','FOB','FOG','FOR','FOX','FRY','FUN','FUR',
    'GAG','GAP','GAS','GEL','GEM','GET','GIG','GIN','GOD','GOT','GUM','GUN','GUT','GUY','GYM',
    'HAD','HAM','HAS','HAT','HAY','HEM','HEN','HER','HEY','HID','HIM','HIP','HIT','HOG','HOP','HOT','HOW','HUB','HUG','HUM','HUT',
    'ICE','ICY','ILL','INK','INN','ION','IRE','ITS','IVY',
    'JAM','JAR','JAW','JAY','JET','JIG','JOB','JOG','JOY','JUG',
    'KEY','KID','KIN','KIT',
    'LAB','LAD','LAG','LAP','LAW','LAY','LED','LEG','LET','LID','LIE','LIP','LIT','LOG','LOT','LOW',
    'MAD','MAN','MAP','MAT','MAY','MEN','MET','MID','MIX','MOB','MOM','MOP','MUD','MUG','MUM',
    'NAB','NAG','NAP','NET','NEW','NIL','NIP','NOD','NOR','NOT','NOW','NUT',
    'OAK','OAR','ODD','OFF','OIL','OLD','ONE','ORB','OUR','OUT','OWL','OWN',
    'PAD','PAL','PAN','PAR','PAT','PAW','PAY','PEA','PEG','PEN','PET','PIE','PIG','PIN','PIT','PLY','POD','POP','POT','PRO','PRY','PUB','PUN','PUP','PUT',
    'RAG','RAM','RAN','RAP','RAT','RAW','RAY','RED','RIB','RID','RIG','RIM','RIP','ROB','ROD','ROT','ROW','RUB','RUG','RUN','RUT',
    'SAD','SAG','SAW','SAY','SEA','SEE','SET','SEW','SEX','SHE','SHY','SIN','SIP','SIR','SIT','SIX','SKI','SKY','SLY','SOB','SOD','SON','SOW','SOY','SPA','SPY','SUM','SUN',
    'TAB','TAG','TAN','TAP','TAR','TEA','TEN','THE','TIE','TIN','TIP','TOE','TON','TOP','TOW','TOY','TRY','TUB','TUG','TWO',
    'URN','USE',
    'VAN','VAT','VET','VIA','VIE','VIP','VOW',
    'WAG','WAR','WAX','WAY','WEB','WED','WET','WHO','WHY','WIG','WIN','WIT','WOE','WON','WOW',
    'YAK','YAM','YES','YET','YOU',
    'ZAP','ZIP','ZOO'
]);

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
        .map((line, index) => {
            const parts = line.split(',');
            const rawWord = parts[0].trim().toUpperCase();
            return { 
                word: rawWord, 
                freq: -index,
                originalIndex: index,
                isTargetable: false 
            };
        })
        .filter(item => {
            const w = item.word;
            if (w === 'WORD' || !w) return false;
            return w.length >= 3 && !/['.]/.test(w) && /^[A-Z]+$/.test(w);
        })
        .map(item => {
            let isTargetable = true;
            if (item.word.length === 3) {
                if (!SAFE_TRIPLETS.has(item.word)) isTargetable = false;
            } 
            else if (item.word.length === 4) {
                if (item.originalIndex > 2000) isTargetable = false;
            } else if (item.word.length >= 5) {
                if (item.originalIndex > 5000) isTargetable = false;
            }
            return { ...item, isTargetable };
        });
};

export const parseDictionaryFile = (content: string): Set<string> => {
    return new Set<string>(
        content.split(/\r?\n/)
            .map(w => w.trim().toUpperCase())
            .filter(w => w.length >= 3 && !/['.]/.test(w) && /^[A-Z]+$/.test(w))
    );
};

export const fetchDefaultFile = async (filename: string): Promise<string> => {
    const response = await fetch(filename);
    if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
    return await response.text();
};

let globalVolume = 0.5;

export const setGlobalVolume = (vol: number) => {
    globalVolume = Math.max(0, Math.min(1, vol));
};

export const playSound = (type: 'correct' | 'levelUp' | 'gameOver' | 'tick') => {
    if (typeof window === 'undefined') return;
    if (globalVolume <= 0) return;

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
        
        const startGain = volStart * globalVolume;
        const endGain = volEnd * globalVolume;

        gain.gain.setValueAtTime(startGain, startTime);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, endGain), startTime + duration);
        
        osc.stop(startTime + duration);
    };

    if (type === 'correct') {
        createOsc(500, 'sine', now, 0.5, 0.2, 0.01);
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
        
        const vol = 0.3 * globalVolume;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.linearRampToValueAtTime(0, now + 1.5);
        
        osc.start(now);
        osc.stop(now + 1.5);
    }
    else if (type === 'tick') {
        createOsc(800, 'square', now, 0.05, 0.05, 0.01);
    }
};
