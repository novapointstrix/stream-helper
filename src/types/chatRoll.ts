export type RollStatus = 'draft' | 'active' | 'finished' | 'cancelled';
export type PresenceStatus = 'pending' | 'confirmed' | 'failed' | 'skipped';

export interface KickAccount {
    id: string;
    user_id: string;
    kick_user_id: string;
    kick_username: string;
    channel_slug: string;
    chatroom_id?: string;
    is_active: boolean;
}

export interface StreamerRollSettings {
    default_keyword: string;
    default_duration: number;
    default_winners_count: number;
    normal_multiplier: number;
    vip_multiplier: number;
    sub_multiplier: number;
    vip_sub_multiplier: number;
    presence_check_enabled: boolean;
    presence_timeout: number;
}

export interface ChatRoll {
    id: string;
    user_id: string;
    kick_channel_slug: string;
    keyword: string;
    status: RollStatus;
    duration_seconds: number;
    winners_count: number;
    presence_check_enabled: boolean;
    presence_timeout_seconds: number;
    normal_multiplier: number;
    vip_multiplier: number;
    sub_multiplier: number;
    vip_sub_multiplier: number;
    total_participants: number;
    total_messages_detected: number;
    started_at?: string;
    ended_at?: string;
    created_at: string;
}

export interface RollParticipant {
    id: string;
    roll_id: string;
    user_id: string;
    kick_user_id: string;
    kick_username: string;
    display_name?: string;
    is_vip: boolean;
    is_subscriber: boolean;
    chance_weight: number;
    joined_at: string;
    eligible: boolean;
}

export interface RollWinner {
    id: string;
    roll_id: string;
    user_id: string;
    kick_user_id: string;
    kick_username: string;
    position: number;
    chance_weight: number;
    presence_status: PresenceStatus;
    selected_at: string;
    confirmed_at?: string;
    reroll_of?: string;
    is_final_winner: boolean;
}