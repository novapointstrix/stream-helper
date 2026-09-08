import { WheelSegment, WheelConfig } from '../types/wheel.types';

export const DEFAULT_PALETTE = [
    '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6',
    '#f59e0b', '#ef4444', '#10b981', '#3b82f6'
];

/**
  * Проверяет и рассчитывает сумму шансов
  */
export function calculateTotalWeight(segments: WheelSegment[]): number {
    return Math.round(segments.reduce((acc, s) => acc + (Number(s.weight) || 0), 0) * 100) / 100;
}

/**
  * Выбор победителя по методу Weighted Random (взвешенный рандом)
  */
export function selectWeightedWinner(segments: WheelSegment[]): number {
    const totalWeight = calculateTotalWeight(segments);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < segments.length; i++) {
        if (random < segments[i].weight) {
            return i;
        }
        random -= segments[i].weight;
    }
    return 0;
}

/**
  * Автоматическая нормализация шансов ровно до 100%
  */
export function normalizeWeights(segments: WheelSegment[]): WheelSegment[] {
    const currentTotal = calculateTotalWeight(segments);
    if (currentTotal === 0) return segments;

    const factor = 100 / currentTotal;
    let runningSum = 0;

    return segments.map((seg, i) => {
        if (i === segments.length - 1) {
            return { ...seg, weight: Math.round((100 - runningSum) * 100) / 100 };
        }
        const newWeight = Math.round(seg.weight * factor * 100) / 100;
        runningSum += newWeight;
        return { ...seg, weight: newWeight };
    });
}

/**
  * Генерация начальных сегментов при изменении количества
  */
export function generateDefaultSegments(count: number): WheelSegment[] {
    const baseWeight = Math.floor((100 / count) * 100) / 100;
    const remainder = Math.round((100 - baseWeight * count) * 100) / 100;

    return Array.from({ length: count }, (_, i) => ({
        id: `segment-${i + 1}`,
        label: i === 0 ? '1000 ₽' : i === 1 ? '500 ₽' : `${(i + 1) * 100} ₽`,
        weight: i === 0 ? baseWeight + remainder : baseWeight,
        color: DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
        textColor: '#ffffff'
    }));
}

/**
  * Генерация SVG Path для сегмента колеса
  */
export function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = x + radius * Math.cos(startRad);
    const y1 = y + radius * Math.sin(startRad);
    const x2 = x + radius * Math.cos(endRad);
    const y2 = y + radius * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return `M ${x} ${y} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}