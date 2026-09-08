import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BonusBuy, Stream } from '../types/database.types';
import { getBonusesByStreamId, getStreamById } from '../services/bonusService';
import { calculateMetrics, formatCurrency, formatMultiplier } from '../lib/utils';
import { getThemeCssVariables } from '../lib/themeUtils';
import { AutoScrollList } from '../components/overlay/AutoScrollList';

export const OBSOverlayPage: React.FC = () => {
  const { id: urlStreamId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [streamId, setStreamId] = useState<string | null>(urlStreamId || null);
  const [stream, setStream] = useState<Stream | null>(null);
  const [bonuses, setBonuses] = useState<BonusBuy[]>([]);
  const [fireImgError, setFireImgError] = useState(false);

  // Жесткая глобальная блокировка скролла для страницы
  useEffect(() => {
    const preventScroll = (e: Event) => e.preventDefault();

    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventScroll, { passive: false });

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const normalizeBonus = (item: any): BonusBuy => {
    const cost = Number(item.buy_cost ?? item.buy_amount ?? 0);
    return {
      ...item,
      buy_cost: cost,
      buy_amount: cost,
      win_amount: Number(item.win_amount ?? 0),
      multiplier: Number(item.multiplier ?? 0),
    };
  };

  const loadData = useCallback(async () => {
    try {
      let targetId = urlStreamId;

      // Если в URL передан obs_token, ищем актуальную сессию этого конкретного пользователя
      if (token) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('obs_token', token)
          .maybeSingle();

        if (profileData) {
          const { data: userStream } = await supabase
            .from('streams')
            .select('id')
            .eq('user_id', profileData.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (userStream) {
            targetId = userStream.id;
          }
        }
      }

      // Если нет ни токена, ни параметра ID — берем последнюю общую сессию
      if (!targetId) {
        const { data: latestStream } = await supabase
          .from('streams')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestStream) {
          targetId = latestStream.id;
        }
      }

      if (!targetId) return;
      setStreamId(targetId);

      const [st, rawBonuses] = await Promise.all([
        getStreamById(targetId),
        getBonusesByStreamId(targetId),
      ]);
      setStream(st);

      const normalized = (rawBonuses || []).map(normalizeBonus);
      setBonuses(normalized);
    } catch (err) {
      console.error('Error loading OBS overlay data:', err);
    }
  }, [urlStreamId, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!streamId) return;

    let reconnectTimer: ReturnType<typeof setTimeout>;

    const channel = supabase
      .channel(`obs_overlay_realtime_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bonus_buys',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newBonus = normalizeBonus(payload.new);
            setBonuses((prev) => {
              if (prev.some((b) => b.id === newBonus.id)) return prev;
              return [newBonus, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedBonus = normalizeBonus(payload.new);
            setBonuses((prev) =>
              prev.map((item) => (item.id === updatedBonus.id ? { ...item, ...updatedBonus } : item))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setBonuses((prev) => prev.filter((item) => item.id !== deletedId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streams',
          filter: `id=eq.${streamId}`,
        },
        (payload) => {
          if (payload.new) {
            setStream(payload.new as Stream);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Realtime subscription error:', err);
        }

        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          reconnectTimer = setTimeout(() => {
            channel.subscribe();
          }, 3000);
        }
      });

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  const metrics = calculateMetrics(bonuses);

  const themeId =
    (stream as any)?.widget_style ||
    (stream as any)?.default_widget_style ||
    (stream as any)?.theme_id ||
    'classic';

  const themeStyles = getThemeCssVariables(themeId, (stream as any)?.custom_tokens);

  return (
    <>
      <style>{`
        html, body, #root {
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
        }
        *, *::before, *::after {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        ::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>
      <div
        style={themeStyles as React.CSSProperties}
        className="fixed inset-0 w-full h-full bg-[var(--widget-bg,#0d0305)] text-[var(--widget-text-primary,#ffffff)] font-sans flex flex-col justify-center items-center overflow-hidden select-none"
      >
        <div className="w-[1100px] h-[1100px] bg-[var(--widget-bg,#0d0305)] rounded-none p-10 flex flex-col gap-5 box-border">
          {/* Шапка */}
          <div className="flex items-center justify-between border-b-2 border-[var(--widget-border,rgba(255,255,255,0.15))] pb-4">
            <div className="flex items-center gap-4 min-w-0 pr-4">
              {/* Векторная SVG иконка бургера */}
              <svg className="w-16 h-16 shrink-0 drop-shadow-md" viewBox="0 0 50 50">
                <g transform="translate(25, 25)">
                  <path d="M -18,-2 A 18 18 0 0 1 18,-2 Z" fill="#E28743" />
                  <g fill="#FFF8E7">
                    <ellipse cx="-8" cy="-10" rx="1.3" ry="0.7" transform="rotate(45 -8 -10)" />
                    <ellipse cx="0" cy="-13" rx="1.3" ry="0.7" transform="rotate(45 0 -13)" />
                    <ellipse cx="8" cy="-9" rx="1.3" ry="0.7" transform="rotate(45 8 -9)" />
                    <ellipse cx="-4" cy="-6" rx="1.3" ry="0.7" transform="rotate(45 -4 -6)" />
                    <ellipse cx="4" cy="-5" rx="1.3" ry="0.7" transform="rotate(45 4 -5)" />
                  </g>
                  <rect x="-19" y="-2" width="38" height="4" rx="2" fill="#48BB78" />
                  <path d="M -18,2 L 18,2 L 18,6 L 10,6 L 6,11 L 2,6 L -18,6 Z" fill="#ECC94B" />
                  <rect x="-18" y="6" width="36" height="6" rx="3" fill="#633211" />
                  <path d="M -17,12 L 17,12 A 3 3 0 0 1 17,17 L -17,17 A 3 3 0 0 1 -17,12 Z" fill="#C8702E" />
                </g>
              </svg>

              <div className="min-w-0 max-w-[650px] flex flex-col justify-center">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-bold text-[var(--widget-text-primary,#ffffff)] uppercase tracking-widest truncate">
                    BONUS BUY #{stream?.stream_number || 1}
                  </h1>
                </div>
                <p className="text-xl font-medium text-[var(--widget-text-secondary,rgba(255,255,255,0.6))] mt-1 uppercase tracking-wider truncate">
                  {stream?.title || 'БОНУС ЗАНОС'}
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--widget-surface)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
              }}
              className="rounded-2xl px-6 py-3.5 flex items-center gap-3 shrink-0 border"
            >
              <img src="/icons/star.png" alt="Star" className="w-8 h-8 object-contain" />
              <span className="text-2xl font-bold text-[var(--widget-text-secondary,rgba(255,255,255,0.7))] uppercase tracking-wider">
                КУПЛЕНО
              </span>
              <span className="text-4xl font-bold text-[var(--widget-text-primary,#ffffff)] leading-none ml-1">
                {metrics.totalBuys}
              </span>
            </div>
          </div>

          {/* Метрики */}
          <div className="grid grid-cols-3 gap-3">
            <div
              style={{
                backgroundColor: 'var(--widget-surface)',
                borderColor: 'rgba(255, 255, 255, 0.12)',
              }}
              className="border rounded-2xl p-3.5 flex items-center gap-3.5"
            >
              <img src="/icons/money.png" alt="Spent" className="w-14 h-14 object-contain shrink-0" />
              <div className="min-w-0">
                <div className="text-base font-normal text-[var(--widget-text-secondary)] uppercase tracking-wider">
                  Затрачено
                </div>
                <div className="text-4xl font-bold text-[var(--widget-text-primary,#ffffff)] mt-0.5 truncate">
                  {formatCurrency(metrics.totalSpent)}
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--widget-surface)',
                borderColor: 'rgba(255, 255, 255, 0.12)',
              }}
              className="border rounded-2xl p-3.5 flex items-center gap-3.5"
            >
              <img src="/icons/win.png" alt="Win" className="w-14 h-14 object-contain shrink-0" />
              <div className="min-w-0">
                <div className="text-base font-normal text-[var(--widget-text-secondary)] uppercase tracking-wider">
                  Выигрыш
                </div>
                <div className="text-4xl font-bold text-[var(--widget-positive,#10b981)] mt-0.5 truncate">
                  {formatCurrency(metrics.totalWin)}
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--widget-surface)',
                borderColor: 'rgba(255, 255, 255, 0.12)',
              }}
              className="border rounded-2xl p-3.5 flex items-center gap-3.5"
            >
              <img src="/icons/lightning.png" alt="Avg Multiplier" className="w-14 h-14 object-contain shrink-0" />
              <div className="min-w-0">
                <div className="text-base font-normal text-[var(--widget-text-secondary)] uppercase tracking-wider">
                  Средний X
                </div>
                <div className="text-4xl font-bold text-[var(--widget-text-primary,#ffffff)] mt-0.5 truncate">
                  {formatMultiplier(metrics.avgMultiplier)}
                </div>
              </div>
            </div>
          </div>

          {/* Рекорды */}
          <div className="grid grid-cols-2 gap-4">
            <div
              style={{
                backgroundColor: 'var(--widget-surface)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
              }}
              className="border rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4 min-w-0 pr-2">
                <img src="/icons/crown.png" alt="Crown" className="w-14 h-10 object-contain shrink-0" />
                <div className="min-w-0 max-w-[260px]">
                  <div className="text-3xl text-[var(--widget-text-primary,#ffffff)] font-bold truncate">
                    {metrics.bestX?.slot_name || '—'}
                  </div>
                  <div className="text-2xl text-[var(--widget-text-secondary)] font-normal truncate">
                    {(metrics.bestX as any)?.provider || metrics.bestX?.player || '—'}
                  </div>
                </div>
              </div>
              <div className="text-5xl font-bold text-[var(--widget-accent)] shrink-0">
                {metrics.bestX ? formatMultiplier(metrics.bestX.multiplier) : '—'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--widget-surface)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
              }}
              className="border rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4 min-w-0 pr-2">
                {!fireImgError ? (
                  <img
                    src="/icons/fire.png"
                    alt="Flame"
                    className="w-12 h-12 object-contain shrink-0"
                    onError={() => setFireImgError(true)}
                  />
                ) : (
                  <svg className="w-12 h-12 text-[var(--widget-accent)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 23c-4.97 0-9-3.58-9-8 0-4.19 3.58-8.86 7.27-12.53.4-.4 1.06-.4 1.46 0C15.42 6.14 19 10.81 19 15c0 4.42-4.03 8-9 8zm1.25-17.84C10.02 8.48 5 12.72 5 15c0 3.31 3.13 6 7 6s7-2.69 7-6c0-2.28-5.02-6.52-8.25-9.84z" />
                  </svg>
                )}
                <div className="min-w-0 max-w-[240px]">
                  <div className="text-3xl text-[var(--widget-text-primary,#ffffff)] font-bold truncate">
                    {metrics.bestWin?.slot_name || '—'}
                  </div>
                  <div className="text-2xl text-[var(--widget-text-secondary)] font-normal truncate">
                    {(metrics.bestWin as any)?.provider || metrics.bestWin?.player || '—'}
                  </div>
                </div>
              </div>
              <div className="text-5xl font-bold text-[var(--widget-positive,#10b981)] shrink-0">
                {metrics.bestWin ? formatCurrency((metrics.bestWin as any).win_amount ?? metrics.bestWin.amount) : '—'}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <AutoScrollList bonuses={bonuses} activeBonusId={stream?.active_bonus_id} speedPxPerSec={18} />
          </div>
        </div>
      </div>
    </>
  );
};