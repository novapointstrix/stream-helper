import { BonusBuy } from '../types/database.types';

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '$0';
  return `$${value.toLocaleString('en-US')}`;
}

export function formatMultiplier(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0.00x';
  return `${value.toFixed(2)}x`;
}

export interface MetricsResult {
  totalSpent: number;
  totalWin: number;
  totalBuys: number;
  avgMultiplier: number;
  bestX: BonusBuy | null;
  bestWin: BonusBuy | null;
}

export function calculateMetrics(bonuses: BonusBuy[]): MetricsResult {
  let totalSpent = 0;
  let totalWin = 0;
  let completedCount = 0;

  let bestX: BonusBuy | null = null;
  let bestWin: BonusBuy | null = null;

  for (const b of bonuses) {
    const buy = Number(b.buy_amount) || 0;
    totalSpent += buy;

    if (b.win_amount !== null && b.win_amount !== undefined) {
      const win = Number(b.win_amount);
      totalWin += win;
      completedCount++;

      // Лучший X
      if (b.multiplier !== null && b.multiplier !== undefined) {
        if (!bestX || (bestX.multiplier !== null && b.multiplier > bestX.multiplier)) {
          bestX = b;
        }
      }

      // Лучший выигрыш
      if (!bestWin || (bestWin.win_amount !== null && win > Number(bestWin.win_amount))) {
        bestWin = b;
      }
    }
  }

  const avgMultiplier = completedCount > 0 && totalSpent > 0 ? totalWin / totalSpent : 0;

  return {
    totalSpent,
    totalWin,
    totalBuys: bonuses.length,
    avgMultiplier,
    bestX,
    bestWin,
  };
}