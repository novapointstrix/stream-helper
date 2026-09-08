import React, { useEffect, useRef, useMemo } from 'react';
import { BonusBuy } from '../../types/database.types';
import { formatCurrency, formatMultiplier } from '../../lib/utils';
import { Play } from 'lucide-react';

interface Props {
  bonuses: BonusBuy[];
  activeBonusId?: string | null;
  speedPxPerSec?: number;
}

const MIN_SCROLL_COUNT = 4;

export const AutoScrollList: React.FC<Props> = ({ bonuses, activeBonusId, speedPxPerSec = 18 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef<number>(0);

  const activeBonus = useMemo(
    () => bonuses.find((b) => b.id === activeBonusId || b.status === 'playing'),
    [bonuses, activeBonusId]
  );

  const activeBonusIndex = useMemo(() => {
    if (!activeBonus) return 0;
    if (activeBonus.slot_number != null) return activeBonus.slot_number;
    if (activeBonus.position != null) return activeBonus.position;
    const idx = bonuses.findIndex((b) => b.id === activeBonus.id);
    return idx !== -1 ? idx + 1 : 1;
  }, [bonuses, activeBonus]);

  const regularBonusesWithIndex = useMemo(() => {
    return bonuses
      .map((item, originalIndex) => ({
        ...item,
        displayIndex: item.slot_number ?? item.position ?? originalIndex + 1,
      }))
      .filter((b) => b.id !== activeBonus?.id);
  }, [bonuses, activeBonus]);

  const displayBonuses = useMemo(() => {
    if (regularBonusesWithIndex.length < MIN_SCROLL_COUNT) {
      return regularBonusesWithIndex;
    }
    return [...regularBonusesWithIndex, ...regularBonusesWithIndex];
  }, [regularBonusesWithIndex]);

  // Анимация скролла
  useEffect(() => {
    const content = contentRef.current;
    if (!content || displayBonuses.length === 0) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const scroll = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      const isOverflowing = content.scrollHeight / 2 > (containerRef.current?.clientHeight || 0);
      const shouldScroll = regularBonusesWithIndex.length >= MIN_SCROLL_COUNT && isOverflowing;

      if (shouldScroll) {
        const halfHeight = content.scrollHeight / 2;

        if (halfHeight > 0) {
          scrollPosRef.current += speedPxPerSec * deltaTime;

          if (scrollPosRef.current >= halfHeight) {
            scrollPosRef.current -= halfHeight;
          }

          content.style.transform = `translate3d(0, -${scrollPosRef.current.toFixed(2)}px, 0)`;
        }
      } else {
        scrollPosRef.current = 0;
        content.style.transform = 'translate3d(0, 0px, 0)';
      }

      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [displayBonuses.length, regularBonusesWithIndex.length, speedPxPerSec]);

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0 bg-[var(--widget-bg)] p-2 rounded-2xl transition-colors duration-300">
      <style>{`
        @keyframes livePulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255, 34, 34, 0.7);
          }
          70% {
            transform: scale(1.15);
            box-shadow: 0 0 0 8px rgba(255, 34, 34, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255, 34, 34, 0);
          }
        }
        .smooth-live-dot {
          animation: livePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .gpu-no-flicker {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translateZ(0);
        }

        /* Плавное притухание слотов при заезде под верхнюю область/активный слот */
        .scroll-mask-top {
          mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 15px, black 45px, black 100%);
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 15px, black 45px, black 100%);
        }
      `}</style>

      {/* Активный слот (ТЕНЬ И СВЕЧЕНИЕ СОХРАНЕНЫ) */}
      {activeBonus && (
        <div className="relative z-20 mt-0 mb-2 w-full">
          <div
            style={{
              background: 'var(--widget-active-bg, var(--widget-surface-elevated, var(--widget-surface)))',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.85)',
            }}
            className="gpu-no-flicker scale-100 border rounded-2xl px-6 py-4 flex items-center justify-between shrink-0 relative overflow-hidden transition-all duration-300"
          >
            {/* Акцентная полоса со свечением */}
            <div
              style={{ backgroundColor: 'var(--widget-accent)' }}
              className="absolute left-0 top-0 bottom-0 w-1.5 shadow-[0_0_12px_var(--widget-accent)]"
            />

            {/* Левая часть */}
            <div className="flex items-center gap-5 min-w-0 flex-1 pr-4">
              <span
                style={{
                  color: 'var(--widget-accent)',
                  backgroundColor: 'var(--widget-surface-secondary)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                }}
                className="text-xl font-semibold px-4 py-2 rounded-xl border flex items-center gap-2 shrink-0 shadow-sm"
              >
                <span>#{String(activeBonusIndex).padStart(2, '0')}</span>
                <Play size={20} style={{ fill: 'var(--widget-accent)', color: 'var(--widget-accent)' }} />
              </span>

              <div className="min-w-0 max-w-[420px]">
                <div style={{ color: 'var(--widget-text-primary)' }} className="text-4xl font-medium tracking-wide truncate">
                  {activeBonus.slot_name}
                </div>
                <div style={{ color: 'var(--widget-text-secondary)' }} className="text-3xl font-normal mt-0.5 truncate">
                  {activeBonus.provider || activeBonus.player_name || 'Игрок не указан'}
                </div>
              </div>
            </div>

            {/* Правая часть */}
            <div className="flex items-center gap-6 text-right shrink-0">
              <div className="w-28 text-right">
                <div style={{ color: 'var(--widget-text-primary)' }} className="text-3xl font-semibold">
                  {formatCurrency(activeBonus.buy_amount ?? activeBonus.buy_cost ?? 0)}
                </div>
              </div>

              <div className="w-40 text-center">
                <div
                  style={{ color: 'var(--widget-accent)' }}
                  className="text-xl font-bold uppercase tracking-wider"
                >
                  Открываем
                </div>
              </div>

              <div className="w-32 text-right">
                <span
                  style={{
                    backgroundColor: 'rgba(255, 34, 34, 0.08)',
                    borderColor: 'rgba(255, 34, 34, 0.4)',
                    color: '#FFFFFF',
                  }}
                  className="inline-flex items-center justify-center gap-3 w-full text-2xl font-extrabold px-3.5 py-2 rounded-xl border"
                >
                  <span className="smooth-live-dot ml-[-2px] inline-block h-3 w-3 rounded-full bg-[#FF2222] shrink-0" />
                  <span className="tracking-wider">LIVE</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Список прокрутки (ТЕНИ И СВЕЧЕНИЯ УБРАНЫ) */}
      <div
        ref={containerRef}
        className="overflow-hidden flex-1 relative no-scrollbar scroll-mask-top z-0"
      >
        <div
          ref={contentRef}
          style={{
            willChange: 'transform',
            transformStyle: 'preserve-3d'
          }}
          className="gpu-no-flicker flex flex-col gap-3 pr-1 pt-1"
        >
          {displayBonuses.map((item, idx) => {
            const cost = item.buy_amount ?? item.buy_cost ?? 0;
            const mult = item.multiplier || 0;
            const win = item.win_amount ?? cost * mult;

            const isProfit = mult >= 1.0;
            const isPending = item.status === 'pending' && mult === 0 && !item.win_amount;

            return (
              <div
                key={`${item.id}-${idx}`}
                style={{
                  backgroundColor: 'var(--widget-surface)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
                className="gpu-no-flicker border rounded-2xl px-6 py-3.5 flex items-center justify-between shrink-0"
              >
                {/* Название слота и номер */}
                <div className="flex items-center gap-5 min-w-0 flex-1 pr-4">
                  <span
                    style={{
                      color: 'var(--widget-text-secondary)',
                      backgroundColor: 'var(--widget-surface-secondary)',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                    }}
                    className="text-xl font-medium px-4 py-2 rounded-xl border shrink-0"
                  >
                    #{String(item.displayIndex).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 max-w-[420px]">
                    <div style={{ color: 'var(--widget-text-primary)' }} className="text-4xl font-medium tracking-wide truncate">
                      {item.slot_name}
                    </div>
                    <div style={{ color: 'var(--widget-text-secondary)' }} className="text-3xl font-normal mt-0.5 truncate">
                      {item.provider || item.player_name || 'Игрок не указан'}
                    </div>
                  </div>
                </div>

                {/* Финансовые значения */}
                <div className="flex items-center gap-6 text-right shrink-0">
                  {/* Первоначальная стоимость */}
                  <div className="w-24 text-right">
                    <div style={{ color: 'var(--widget-text-secondary)' }} className="text-3xl font-medium">
                      {formatCurrency(cost)}
                    </div>
                  </div>

                  {/* Основная цветная сумма */}
                  <div className="w-32 text-right">
                    <div
                      style={{
                        color: isProfit
                          ? 'var(--widget-positive, #10b981)'
                          : isPending
                            ? 'var(--widget-text-muted)'
                            : 'var(--widget-danger, #ef4444)',
                      }}
                      className="text-4xl font-medium"
                    >
                      {isPending ? '—' : formatCurrency(win)}
                    </div>
                  </div>

                  {/* Коэффициент x */}
                  <div className="w-32 text-right">
                    <span
                      style={{
                        backgroundColor: isProfit
                          ? 'rgba(36, 214, 160, 0.08)'
                          : isPending
                            ? 'rgba(255, 255, 255, 0.03)'
                            : 'rgba(239, 68, 68, 0.08)',
                        borderColor: isProfit
                          ? 'rgba(16, 185, 129, 0.3)'
                          : isPending
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(239, 68, 68, 0.3)',
                        color: isProfit
                          ? 'var(--widget-positive, #10b981)'
                          : isPending
                            ? 'var(--widget-text-muted)'
                            : 'var(--widget-danger, #ef4444)',
                      }}
                      className="inline-block w-full text-center text-3xl font-bold px-4 py-2 rounded-xl border transition-all"
                    >
                      {formatMultiplier(mult)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};