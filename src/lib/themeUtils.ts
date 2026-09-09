import React from 'react';
import { ThemeId, WidgetThemeTokens } from '../types/theme';
import { WIDGET_THEMES } from '../constants/themes';

export { WIDGET_THEMES };

export function getMergedTokens(
    styleId: ThemeId = 'main',
    customTokens?: Partial<WidgetThemeTokens>
): WidgetThemeTokens {
    const baseTokens = WIDGET_THEMES[styleId]?.tokens || WIDGET_THEMES.main.tokens;
    return { ...baseTokens, ...customTokens };
}

export function getThemeCssVariables(
    styleId: ThemeId = 'main',
    customTokens?: Partial<WidgetThemeTokens>
): React.CSSProperties {
    const tokens = getMergedTokens(styleId, customTokens);

    return {
        '--widget-bg': tokens.bg || '#0A0A0C',
        '--widget-surface': tokens.surface || '#121215',
        '--widget-surface-secondary': tokens.surfaceSecondary || '#18181C',
        '--widget-border': tokens.border || '#1F1F24',
        '--widget-accent': tokens.accent || '#F59E0B',
        '--widget-accent-secondary': tokens.accentSecondary || '#D97706',
        '--widget-positive': tokens.positive || '#10B981',
        '--widget-warning': tokens.warning || '#F59E0B',
        '--widget-negative': tokens.danger || '#EF4444',
        '--widget-text-primary': tokens.textPrimary || '#FFFFFF',
        '--widget-text-secondary': tokens.textSecondary || '#9CA3AF',
        '--widget-text-muted': tokens.textMuted || '#6B7280',
        '--widget-glow': tokens.glow || 'rgba(245, 158, 11, 0.25)',
    } as React.CSSProperties;
}