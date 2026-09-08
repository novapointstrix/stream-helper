export interface WheelSegment {
    id: string;
    label: string;
    weight: number; // Вес (шанс) в %
    color: string;
    textColor?: string;
}

export type WheelStylePreset = 'default' | 'neon' | 'dark' | 'premium';

export interface WheelConfig {
    segmentCount: number;
    segments: WheelSegment[];
    preset: WheelStylePreset;
    centerColor?: string;
    borderColor?: string;
}

export interface WheelSpinEvent {
    winningIndex: number;
    winnerName: string;
    prizeLabel: string;
    config: WheelConfig;
    timestamp: number;
}

// Ниже добавлены типы для работы с историей прокрутов и секторов колеса

export interface WheelSector {
    id: string;
    label: string;
    color?: string;
    weight?: number;
}

export interface SpinRecord {
    id: string;
    created_at: string;
    player_name: string;
    prize_label: string;
    sector_chance?: number | null;
}