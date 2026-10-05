import { BonusBuy, StreamMetrics } from '../types/database.types';

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatMultiplier(mult: number | null | undefined): string {
  if (mult === null || mult === undefined || isNaN(mult)) return '—';
  return `${mult.toFixed(2)}x`;
}

export function calculateMetrics(bonuses: BonusBuy[]): StreamMetrics {
  const completed = bonuses.filter((b) => b.status === 'completed');
  
  const totalSpent = bonuses
    .filter((b) => b.status !== 'cancelled')
    .reduce((acc, b) => acc + (b.buy_amount || 0), 0);

  const totalWin = completed.reduce((acc, b) => acc + (b.win_amount || 0), 0);
  const profit = totalWin - totalSpent;

  const validMultipliers = completed
    .map((b) => b.multiplier)
    .filter((m): m is number => m !== null && !isNaN(m));

  const avgMultiplier =
    validMultipliers.length > 0
      ? validMultipliers.reduce((a, b) => a + b, 0) / validMultipliers.length
      : 0;

  let bestX: StreamMetrics['bestX'] = null;
  let bestWin: StreamMetrics['bestWin'] = null;

  if (completed.length > 0) {
    const sortedByX = [...completed].sort((a, b) => (b.multiplier || 0) - (a.multiplier || 0));
    const sortedByWin = [...completed].sort((a, b) => (b.win_amount || 0) - (a.win_amount || 0));

    if (sortedByX[0] && sortedByX[0].multiplier !== null) {
      bestX = { 
        multiplier: sortedByX[0].multiplier, 
        slot_name: sortedByX[0].slot_name,
        player: sortedByX[0].provider || 'Игрок'
      };
    }
    if (sortedByWin[0] && sortedByWin[0].win_amount !== null) {
      bestWin = { 
        amount: sortedByWin[0].win_amount, 
        slot_name: sortedByWin[0].slot_name,
        player: sortedByWin[0].provider || 'Игрок'
      };
    }
  }

  return {
    totalBuys: bonuses.length,
    completedBuys: completed.length,
    totalSpent,
    totalWin,
    profit,
    avgMultiplier,
    bestX,
    bestWin,
  };
}