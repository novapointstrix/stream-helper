// src/types/theme.ts

export type ThemeId = 'classic' | 'neon' | 'glass' | 'cyberpunk' | 'ai_minimal' | 'ruby';

export interface WidgetThemeTokens {
    // Поля Tailwind-стилей (из вашей структуры)
    bgContainer: string;
    borderColor: string;
    cardBg: string;
    activeCardBg: string;
    activeBorderColor: string;
    textColor: string;
    subtextColor: string;
    accentColor: string;
    badgeBg: string;
    badgeText: string;

    // Опциональные токены для работы CSS-переменных в themeUtils.ts
    bg?: string;
    surface?: string;
    surfaceSecondary?: string;
    border?: string;
    accent?: string;
    accentSecondary?: string;
    positive?: string;
    warning?: string;
    danger?: string;
    textPrimary?: string;
    textSecondary?: string;
    textMuted?: string;
    glow?: string;
}

export interface WidgetThemePreset {
    id?: ThemeId;
    name: string;
    tokens: WidgetThemeTokens;
}

export const WIDGET_THEMES: Record<ThemeId, WidgetThemePreset> = {
    classic: {
        name: 'Классический (Красный)',
        tokens: {
            bgContainer: 'bg-[#0c0406]/90',
            borderColor: 'border-red-900/30',
            cardBg: 'bg-[#120508]/80',
            activeCardBg: 'bg-[#1a080c]',
            activeBorderColor: 'border-red-600/60',
            textColor: 'text-white',
            subtextColor: 'text-gray-400',
            accentColor: 'text-red-500',
            badgeBg: 'bg-red-950/80',
            badgeText: 'text-red-400',
        },
    },
    ai_minimal: {
        name: 'AI Minimal (ChatGPT/Gemini Серый)',
        tokens: {
            bgContainer: 'bg-[#18181B]/95',
            borderColor: 'border-[#27272A]',
            cardBg: 'bg-[#27272A]/60',
            activeCardBg: 'bg-[#27272A]',
            activeBorderColor: 'border-[#52525B]',
            textColor: 'text-[#F4F4F5]',
            subtextColor: 'text-[#A1A1AA]',
            accentColor: 'text-white',
            badgeBg: 'bg-[#3F3F46]',
            badgeText: 'text-[#F4F4F5]',
        },
    },
    neon: {
        name: 'Неон',
        tokens: {
            bgContainer: 'bg-black/90',
            borderColor: 'border-purple-500/30',
            cardBg: 'bg-purple-950/20',
            activeCardBg: 'bg-purple-900/40',
            activeBorderColor: 'border-purple-500',
            textColor: 'text-white',
            subtextColor: 'text-purple-300',
            accentColor: 'text-purple-400',
            badgeBg: 'bg-purple-900/60',
            badgeText: 'text-purple-300',
        },
    },
    glass: {
        name: 'Стекло',
        tokens: {
            bgContainer: 'bg-white/5 backdrop-blur-md',
            borderColor: 'border-white/10',
            cardBg: 'bg-white/5',
            activeCardBg: 'bg-white/10',
            activeBorderColor: 'border-white/30',
            textColor: 'text-white',
            subtextColor: 'text-gray-300',
            accentColor: 'text-white',
            badgeBg: 'bg-white/10',
            badgeText: 'text-white',
        },
    },
    cyberpunk: {
        name: 'Киберпанк',
        tokens: {
            bgContainer: 'bg-yellow-950/20',
            borderColor: 'border-yellow-500/30',
            cardBg: 'bg-yellow-900/10',
            activeCardBg: 'bg-yellow-500/20',
            activeBorderColor: 'border-yellow-400',
            textColor: 'text-yellow-100',
            subtextColor: 'text-yellow-500',
            accentColor: 'text-yellow-400',
            badgeBg: 'bg-yellow-500/20',
            badgeText: 'text-yellow-300',
        },
    },
    ruby: {
        name: 'Рубин',
        tokens: {
            bgContainer: 'bg-[#1a0307]/90',
            borderColor: 'border-rose-900/40',
            cardBg: 'bg-[#24050a]/80',
            activeCardBg: 'bg-[#33070e]',
            activeBorderColor: 'border-rose-500/80',
            textColor: 'text-rose-50',
            subtextColor: 'text-rose-300',
            accentColor: 'text-rose-400',
            badgeBg: 'bg-rose-950/90',
            badgeText: 'text-rose-300',
        },
    },
};