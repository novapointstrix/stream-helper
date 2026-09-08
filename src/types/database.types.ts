// src/types/database.types.ts

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
      bonus_buys: {
        Row: {
          id: string
          created_at: string
          stream_id: string
          slot_name: string
          provider: string
          bet_size: number
          cost: number
          payout: number | null
          multiplier: number | null
          is_super: boolean
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          stream_id: string
          slot_name: string
          provider: string
          bet_size: number
          cost: number
          payout?: number | null
          multiplier?: number | null
          is_super?: boolean
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          stream_id?: string
          slot_name?: string
          provider?: string
          bet_size?: number
          cost?: number
          payout?: number | null
          multiplier?: number | null
          is_super?: boolean
          notes?: string | null
        }
      }
      streams: {
        Row: {
          id: string
          created_at: string
          title: string
          is_active: boolean
          start_balance: number
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          is_active?: boolean
          start_balance: number
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          is_active?: boolean
          start_balance?: number
        }
      }
      wheel_history: {
        Row: {
          id: string
          created_at: string
          player_name: string
          prize_label: string
          sector_chance: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          player_name: string
          prize_label: string
          sector_chance?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          player_name?: string
          prize_label?: string
          sector_chance?: number | null
        }
      }
    }
  }
}

// Удобные алиасы
export type Stream = Database['public']['Tables']['streams']['Row']
export type BonusBuy = Database['public']['Tables']['bonus_buys']['Row']
export type SpinRecordRow = Database['public']['Tables']['wheel_history']['Row']

// --- Новые типы для Автономного Колеса Фортуны ---

export interface WheelSector {
  id: string
  label: string
  color: string
  chance: number // Вес / шанс выпадения
}

export interface WheelEventPayload {
  id: string
  playerName: string
  sectors: WheelSector[]
  winningSectorId: string
  durationMs: number
  timestamp: number
}