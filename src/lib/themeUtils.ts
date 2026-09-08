import React from 'react';
import { ThemeId, WidgetThemeTokens } from '../types/theme';
import { WIDGET_THEMES } from '../constants/themes';

// Реэкспортируем WIDGET_THEMES, чтобы убрать ошибки импорта в компонентах
export { WIDGET_THEMES };

export function getMergedTokens(
    styleId: ThemeId = 'classic',
    customTokens?: Partial<WidgetThemeTokens>
): WidgetThemeTokens {
    const baseTokens = WIDGET_THEMES[styleId]?.tokens || WIDGET_THEMES.classic.tokens;
    return { ...baseTokens, ...customTokens };
}

export function getThemeCssVariables(
    styleId: ThemeId = 'classic',
    customTokens?: Partial<WidgetThemeTokens>
): React.CSSProperties {
    const tokens = getMergedTokens(styleId, customTokens);

    return {
        '--widget-bg': tokens.bg,
        '--widget-surface': tokens.surface,
        '--widget-surface-secondary': tokens.surfaceSecondary,
        '--widget-border': tokens.border,
        '--widget-accent': tokens.accent,
        '--widget-accent-secondary': tokens.accentSecondary,
        '--widget-positive': tokens.positive,
        '--widget-warning': tokens.warning,
        '--widget-negative': tokens.danger,
        '--widget-text-primary': tokens.textPrimary,
        '--widget-text-secondary': tokens.textSecondary,
        '--widget-text-muted': tokens.textMuted,
        '--widget-glow': tokens.glow,
    } as React.CSSProperties;
}