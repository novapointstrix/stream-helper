import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BonusBuy, Stream } from '../types/database.types';
import { getBonusesByStreamId, getStreamById } from '../services/bonusService';
import { calculateMetrics, formatCurrency, formatMultiplier } from '../lib/utils';
import { getThemeCssVariables } from '../lib/themeUtils';
import { AutoScrollList } from '../components/overlay/AutoScrollList';
import { StreamIconRenderer } from '../components/StreamIconRenderer';

export const OBSOverlayPage: React.FC = () => {
  const { id: urlStreamId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [userId, setUserId] = useState<string | null>(null);
  const [streamId, setStreamId] = useState<string | null>(urlStreamId || null);
  const [stream, setStream] = useState<Stream | null>(null);
  const [bonuses, setBonuses] = useState<BonusBuy[]>([]);
  const [streamIcon, setStreamIcon] = useState<string>('burger');
  const [fireImgError, setFireImgError] = useState(false);

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

      if (token) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, stream_icon')
          .eq('obs_token', token)
          .maybeSingle();

        if (profileData) {
          setUserId(profileData.id);
          if (profileData.stream_icon) {
            setStreamIcon(profileData.stream_icon);
          }
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

      if (!targetId) {
        const { data: latestStream } = await supabase
          .from('streams')
          .select('id, user_id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestStream) {
          targetId = latestStream.id;
          if (latestStream.user_id) {
            setUserId(latestStream.user_id);
            const { data: profile } = await supabase
              .from('profiles')
              .select('stream_icon')
              .eq('id', latestStream.user_id)
              .maybeSingle();
            if (profile?.stream_icon) setStreamIcon(profile.stream_icon);
          }
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

  // Подписка на обновление данных стрима и покупку бонусов
  useEffect(() => {
    if (!streamId) return;

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
        () => {
          getBonusesByStreamId(streamId).then((raw) => {
            setBonuses((raw || []).map(normalizeBonus));
          });
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  // Подписка на изменение иконки в профиле
  useEffect(() => {
    if (!userId) return;

    const profileChannel = supabase
      .channel(`obs_overlay_profile_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).stream_icon) {
            setStreamIcon((payload.new as any).stream_icon);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [userId]);

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
          {/* Шапка с реактивно обновляемой иконкой */}
          <div className="flex items-center justify-between border-b-2 border-[var(--widget-border,rgba(255,255,255,0.15))] pb-4">
            <div className="flex items-center gap-4 min-w-0 pr-4">
              <div className="shrink-0 flex items-center justify-center">
                <StreamIconRenderer iconId={streamIcon} size={48} />
              </div>

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