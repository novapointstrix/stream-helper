import React from 'react';
import { ThemeId, WidgetThemeTokens } from '../../types/theme';
import { WIDGET_THEMES, getThemeCssVariables } from '../../lib/themeUtils';
import { Check, Save, X } from 'lucide-react';
import { BonusBuy } from '../../types/database.types';

interface WidgetStyleSelectorProps {
    selectedStyle: ThemeId;
    customTokens?: Partial<WidgetThemeTokens>;
    onChangeStyle: (newStyle: ThemeId) => void;
    onChangeCustomTokens?: (newTokens: Partial<WidgetThemeTokens> | undefined) => void;
    onSave: () => Promise<void> | void;
    onClose?: () => void;
    previewBonuses?: BonusBuy[];
    title?: string;
}

export const WidgetStyleSelector: React.FC<WidgetStyleSelectorProps> = ({
    selectedStyle = 'main',
    customTokens,
    onChangeStyle,
    onSave,
    onClose,
    title = 'Widget Style & Themes',
}) => {
    const [isSaving, setIsSaving] = React.useState(false);
    const [saveSuccess, setSaveSuccess] = React.useState(false);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        setSaveSuccess(false);

        try {
            await onSave();
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Ошибка при сохранении темы:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const previewVariables = getThemeCssVariables(selectedStyle, customTokens);

    return (
        <div className="bg-[#121215] border border-[#1F1F24] rounded-2xl p-6 shadow-2xl space-y-6 relative">
            {/* Кнопка закрытия (крестик) */}
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white bg-[#18181C] hover:bg-[#222228] border border-[#2A2A32] rounded-xl transition cursor-pointer z-10"
                    title="Закрыть ред. стиля"
                >
                    <X size={16} />
                </button>
            )}

            {/* Шапка и кнопка сохранения */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {title}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                        Выберите визуальное оформление для оверлея OBS и списка бонусов.
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-black font-extrabold px-5 py-2.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.25)] transition flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto text-xs uppercase tracking-wider"
                >
                    {saveSuccess ? (
                        <Check size={16} strokeWidth={2.5} />
                    ) : (
                        <Save size={16} strokeWidth={2} />
                    )}
                    {isSaving ? 'Сохранение...' : saveSuccess ? 'Сохранено!' : 'Сохранить стиль'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Список карточек для выбора тем */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(WIDGET_THEMES).map(([id, theme]) => {
                        const themeId = id as ThemeId;
                        const isSelected = selectedStyle === themeId;
                        const themeVars = getThemeCssVariables(themeId, isSelected ? customTokens : undefined);

                        return (
                            <div
                                key={id}
                                onClick={() => onChangeStyle(themeId)}
                                className={`relative p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between min-h-[90px] ${isSelected
                                        ? 'border-amber-500 bg-[#18181C] shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                                        : 'border-[#1F1F24] bg-[#0A0A0C] hover:border-[#2A2A32] hover:bg-[#121215]'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className="w-3.5 h-3.5 rounded-full border border-black/30"
                                            style={{ backgroundColor: (themeVars as any)['--widget-accent'] || '#F59E0B' }}
                                        />
                                        <span
                                            className="w-3.5 h-3.5 rounded-full border border-black/30"
                                            style={{ backgroundColor: (themeVars as any)['--widget-positive'] || '#10B981' }}
                                        />
                                    </div>

                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center">
                                            <Check size={13} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                        {theme.name}
                                        {themeId === 'main' && (
                                            <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono uppercase">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                                        {(theme as any).description || 'Основной стиль панели управления'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Предпросмотр LIVE PREVIEW */}
                <div className="lg:col-span-5 bg-[#0A0A0C] border border-[#1F1F24] rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-[#1F1F24] pb-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">
                                LIVE PREVIEW
                            </span>
                        </div>
                        <span className="text-xs text-zinc-400 font-mono">
                            Theme: <span className="text-amber-400 font-semibold">{WIDGET_THEMES[selectedStyle]?.name || 'Main'}</span>
                        </span>
                    </div>

                    <div
                        style={previewVariables}
                        className="flex flex-col gap-2.5 p-3 rounded-xl bg-[var(--widget-bg,#0a0a0f)] border border-[var(--widget-border,#222)]"
                    >
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--widget-surface,#12121a)] border border-[var(--widget-accent,#f59e0b)] shadow-[0_0_12px_var(--widget-glow,rgba(245,158,11,0.2))]">
                            <div className="flex items-center gap-2.5">
                                <span className="text-xs font-bold text-[var(--widget-text-muted,#888)] font-mono">#01</span>
                                <div>
                                    <div className="text-xs font-semibold text-[var(--widget-text-primary,#fff)] line-clamp-1">
                                        Gates of Olympus
                                    </div>
                                    <div className="text-[10px] text-[var(--widget-text-secondary,#aaa)]">$10,000</div>
                                </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-[var(--widget-accent,#f59e0b)] text-black">
                                ОТКРЫВАЕМ
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--widget-surface,#12121a)] border border-[var(--widget-border,#222)]">
                            <div className="flex items-center gap-2.5">
                                <span className="text-xs font-bold text-[var(--widget-text-muted,#888)] font-mono">#02</span>
                                <div>
                                    <div className="text-xs font-semibold text-[var(--widget-text-primary,#fff)] line-clamp-1">
                                        Sweet Bonanza
                                    </div>
                                    <div className="text-[10px] text-[var(--widget-text-secondary,#aaa)]">$10,000</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-[var(--widget-positive,#10b981)]">$32,323</div>
                                <div className="text-[10px] font-semibold text-[var(--widget-positive,#10b981)]">3.23x</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};