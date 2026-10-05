export type StreamStatus = 'active' | 'completed';
export type BonusStatus = 'pending' | 'playing' | 'completed' | 'cancelled';

export interface Stream {
  id: string;
  stream_number: number;
  date: string;
  title: string;
  status: StreamStatus;
  active_bonus_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BonusBuy {
  id: string;
  stream_id: string;
  position: number;
  slot_name: string;
  provider: string; // Храним ник игрока, который заколлил слот
  buy_amount: number;
  win_amount: number | null;
  multiplier: number | null;
  status: BonusStatus;
  created_at?: string;
  updated_at?: string;
}

export interface StreamMetrics {
  totalBuys: number;
  completedBuys: number;
  totalSpent: number;
  totalWin: number;
  profit: number;
  avgMultiplier: number;
  bestX: { multiplier: number; slot_name: string; player: string } | null;
  bestWin: { amount: number; slot_name: string; player: string } | null;
}