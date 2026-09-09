export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string | null
          email: string | null
          obs_token: string | null
          stream_icon: string | null
        }
        Insert: {
          id: string
          created_at?: string | null
          email?: string | null
          obs_token?: string | null
          stream_icon?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          email?: string | null
          obs_token?: string | null
          stream_icon?: string | null
        }
      }
      bonus_buys: {
        Row: {
          id: string
          created_at: string
          stream_id: string
          user_id: string
          slot_name: string
          provider: string | null
          player_name: string | null
          buy_cost: number
          buy_amount: number
          win_amount: number
          multiplier: number
          status: string
          position: number | null
          is_super: boolean
          notes: string | null
          widget_style?: string | null
          custom_tokens?: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          stream_id: string
          user_id: string
          slot_name: string
          provider?: string | null
          player_name?: string | null
          buy_cost?: number
          buy_amount?: number
          win_amount?: number
          multiplier?: number
          status?: string
          position?: number | null
          is_super?: boolean
          notes?: string | null
          widget_style?: string | null
          custom_tokens?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          stream_id?: string
          user_id?: string
          slot_name?: string
          provider?: string | null
          player_name?: string | null
          buy_cost?: number
          buy_amount?: number
          win_amount?: number
          multiplier?: number
          status?: string
          position?: number | null
          is_super?: boolean
          notes?: string | null
          widget_style?: string | null
          custom_tokens?: Json | null
        }
      }
      streams: {
        Row: {
          id: string
          created_at: string
          user_id: string
          title: string
          stream_number: number
          is_active: boolean
          start_balance: number
          active_bonus_id: string | null
          widget_style: string | null
          theme_id: string | null
          custom_tokens: Json | null
          stream_icon: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          title: string
          stream_number?: number
          is_active?: boolean
          start_balance?: number
          active_bonus_id?: string | null
          widget_style?: string | null
          theme_id?: string | null
          custom_tokens?: Json | null
          stream_icon?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          title?: string
          stream_number?: number
          is_active?: boolean
          start_balance?: number
          active_bonus_id?: string | null
          widget_style?: string | null
          theme_id?: string | null
          custom_tokens?: Json | null
          stream_icon?: string | null
        }
      }
      wheel_history: {
        Row: {
          id: string
          created_at: string
          user_id: string
          player_name: string
          prize_label: string
          sector_chance: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          player_name: string
          prize_label: string
          sector_chance?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          player_name?: string
          prize_label?: string
          sector_chance?: number | null
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Stream = Database['public']['Tables']['streams']['Row']
export type BonusBuy = Database['public']['Tables']['bonus_buys']['Row']
export type SpinRecordRow = Database['public']['Tables']['wheel_history']['Row']

export interface WheelSector {
  id: string
  label: string
  color: string
  chance: number
}

export interface WheelEventPayload {
  id: string
  playerName: string
  sectors: WheelSector[]
  winningSectorId: string
  durationMs: number
  timestamp: number
}