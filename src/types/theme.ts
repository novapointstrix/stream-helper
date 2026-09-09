export type ThemeId =
    | 'main'
    | 'classic'
    | 'ruby'
    | 'scarlet'
    | 'purple'
    | 'electric_blue'
    | 'midnight'
    | 'neon';

export interface WidgetThemeTokens {
    bgContainer?: string;
    borderColor?: string;
    cardBg?: string;
    activeCardBg?: string;
    activeBorderColor?: string;
    textColor?: string;
    subtextColor?: string;
    accentColor?: string;
    badgeBg?: string;
    badgeText?: string;

    bg?: string;
    surface?: string;
    surfaceSecondary?: string;
    surfaceElevated?: string;
    border?: string;
    borderLight?: string;
    accent?: string;
    accentHover?: string;
    accentDark?: string;
    accentSecondary?: string;
    positive?: string;
    positiveDark?: string;
    warning?: string;
    danger?: string;
    textPrimary?: string;
    textSecondary?: string;
    textMuted?: string;
    glow?: string;
    shadow?: string;
    activeBg?: string;
    activeBorder?: string;
    activeGlow?: string;
}

export interface WidgetThemePreset {
    id?: ThemeId;
    name: string;
    description?: string;
    previewDots?: string[];
    tokens: WidgetThemeTokens;
}