import React, { useEffect, useRef } from 'react';
import { BonusBuy } from '../../types/database.types';
import { formatCurrency, formatMultiplier } from '../../lib/utils';
import { Play } from 'lucide-react';

interface Props {
  bonuses: BonusBuy[];
  activeBonusId?: string | null;
  speedPxPerSec?: number;
}

export const AutoScrollList: React.FC<Props> = ({ bonuses, activeBonusId, speedPxPerSec = 15 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeBonus = bonuses.find((b) => b.id === activeBonusId || b.status === 'playing');
  const regularBonuses = bonuses.filter((b) => b.id !== activeBonus?.id);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    let animationFrameId: number;
    let currentScroll = 0;

    const scroll = () => {
      if (content.scrollHeight > container.clientHeight) {
        currentScroll += speedPxPerSec / 60;
        if (currentScroll >= content.scrollHeight / 2) {
          currentScroll = 0;
        }
        container.scrollTop = currentScroll;
      } else {
        container.scrollTop = 0;
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [regularBonuses, speedPxPerSec]);

  const displayBonuses = regularBonuses.length > 3 ? [...regularBonuses, ...regularBonuses] : regularBonuses;

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      {/* Активный слот */}
      {activeBonus && (
        <div className="bg-gradient-to-r from-red-950/95 via-amber-950/90 to-red-950/95 border-2 border-amber-400 rounded-2xl px-6 py-4 flex items-center justify-between shadow-[0_0_35px_rgba(245,158,11,0.4)] animate-pulse">
          <div className="flex items-center gap-5">
            <span className="text-xl font-black text-amber-300 bg-amber-950/90 px-4 py-2 rounded-xl border border-amber-400/60 flex items-center gap-2">
              <span className="text-amber-200">#{String(activeBonus.position).padStart(2, '0')}</span>
              <Play size={24} className="fill-amber-300" /> ИГРАЕТ
            </span>
            <div>
              <div className="text-3xl font-black text-white tracking-wide">
                {activeBonus.slot_name}
              </div>
              <div className="text-2xl text-amber-200 font-black mt-0.5">{activeBonus.provider}</div>
            </div>
          </div>

          <div className="flex items-center gap-8 text-right">
            <div>
              <div className="text-base text-amber-200/70 uppercase font-black tracking-wider">Цена</div>
              <div className="text-2xl font-bold text-amber-100">{formatCurrency(activeBonus.buy_amount)}</div>
            </div>

            <div className="w-44">
              <div className="text-base text-amber-200/70 uppercase font-black tracking-wider">Выигрыш</div>
              <div className="text-2xl font-black text-amber-300 animate-pulse">Крутим...</div>
            </div>

            <div className="w-32 text-right">
              <span className="inline-block text-lg font-black px-4 py-2 rounded-xl border bg-amber-400/20 border-amber-400 text-amber-300">
                🎰 LIVE
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Обычный список со скроллом */}
      <div ref={containerRef} className="overflow-hidden flex-1 relative no-scrollbar">
        <div ref={contentRef} className="flex flex-col gap-3 pr-1">
          {displayBonuses.map((item, idx) => {
            const isPending = item.status === 'pending';
            const isProfit = (item.multiplier || 0) >= 1.0;

            return (
              <div
                key={`${item.id}-${idx}`}
                className="bg-[#18080b]/95 border border-red-800/40 rounded-2xl px-6 py-3.5 flex items-center justify-between shadow-[0_6px_20px_rgba(0,0,0,0.6)] backdrop-blur-md"
              >
                <div className="flex items-center gap-5">
                  <span className="text-xl font-black text-red-300 bg-red-950/80 px-4 py-2 rounded-xl border border-red-700/40">
                    #{String(item.position).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="text-2xl font-black text-white tracking-wide">{item.slot_name}</div>
                    <div className="text-xl font-black text-red-300/90 mt-0.5">{item.provider}</div>
                  </div>
                </div>

                <div className="flex items-center gap-8 text-right">
                  <div>
                    <div className="text-base text-red-300/60 uppercase font-black tracking-wider">Цена</div>
                    <div className="text-xl font-bold text-red-200">{formatCurrency(item.buy_amount)}</div>
                  </div>

                  <div className="w-44">
                    <div className="text-base text-red-300/60 uppercase font-black tracking-wider">Выигрыш</div>
                    <div className={`text-2xl font-black ${isPending ? 'text-gray-500' : isProfit ? 'text-emerald-400' : 'text-red-300'}`}>
                      {isPending ? '—' : formatCurrency(item.win_amount)}
                    </div>
                  </div>

                  <div className="w-36 text-right">
                    <span className={`inline-block text-3xl font-black px-5 py-2 rounded-xl border ${
                      isPending
                        ? 'bg-gray-900/40 border-gray-700 text-gray-500'
                        : isProfit
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                        : 'bg-red-950/60 border-red-700/40 text-red-200'
                    }`}>
                      {formatMultiplier(item.multiplier)}
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