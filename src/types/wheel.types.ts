export interface WheelSegment {
    id: string;
    label: string;
    weight: number;
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

export interface WheelSector {
    id: string;
    label: string;
    color: string;
    chance: number;
    weight?: number;
    user_id?: string;
}

export interface SpinRecord {
    id: string;
    created_at: string;
    player_name: string;
    prize_label: string;
    sector_chance?: number | null;
    user_id?: string;
    preset_id?: string;
}