import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { broadcast } from '../lib/broadcast';
import { BonusBuy, Stream } from '../types/database.types';
import { getBonusesByStreamId, getStreamById } from '../services/bonusService';
import { calculateMetrics, formatCurrency, formatMultiplier } from '../lib/utils';
import { AutoScrollList } from '../components/overlay/AutoScrollList';
import { Crown, Flame, Zap } from 'lucide-react';

export const OBSOverlayPage: React.FC = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const [stream, setStream] = useState<Stream | null>(null);
  const [bonuses, setBonuses] = useState<BonusBuy[]>([]);

  const loadData = async () => {
    if (!streamId) return;
    const st = await getStreamById(streamId);
    setStream(st);
    const data = await getBonusesByStreamId(streamId);
    setBonuses(data);
  };

  useEffect(() => {
    loadData();

    const handleBroadcast = (e: MessageEvent) => {
      if (e.data?.type === 'UPDATE_STREAM' && e.data?.streamId === streamId) loadData();
    };
    broadcast.addEventListener('message', handleBroadcast);
    return () => broadcast.removeEventListener('message', handleBroadcast);
  }, [streamId]);

  const metrics = calculateMetrics(bonuses);

  return (
    <div className="w-[1000px] h-[1000px] bg-transparent text-white font-sans p-2 flex flex-col justify-center items-center overflow-hidden select-none">
      <div className="w-[1000px] h-[1000px] bg-[#120507]/90 rounded-3xl p-6 flex flex-col gap-5 box-border border-2 border-red-900/40">
        
        {/* Шапка с бургером 🍔 и блоком ⭐ Куплено в 1 ряд */}
        <div className="flex items-center justify-between border-b-2 border-red-800/40 pb-4">
          <div className="flex items-center gap-4">
            <span className="text-6xl">🍔</span>
            <div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-red-600 animate-pulse shadow-[0_0_20px_#dc2626]" />
                <h1 className="text-4xl font-black text-white uppercase tracking-widest">
                  BONUS BUY #{stream?.stream_number || 127}
                </h1>
              </div>
              <p className="text-xl font-extrabold text-red-300 mt-1 uppercase tracking-wider">
                {stream?.title || 'ОХОТА ЗА X1000'}
              </p>
            </div>
          </div>

          {/* Плашка "⭐ Куплено 5" в один ряд */}
          <div className="bg-red-950/90 border-2 border-red-600/60 rounded-2xl px-6 py-3.5 flex items-center gap-3 shadow-[0_0_25px_rgba(220,38,38,0.35)]">
            <span className="text-3xl">⭐</span>
            <span className="text-2xl font-black text-red-200 uppercase tracking-wider">Куплено</span>
            <span className="text-4xl font-black text-white leading-none ml-1">{metrics.totalBuys}</span>
          </div>
        </div>

        {/* 4 Карточки Метрик (Увеличены текст и иконки в 1.4 раза) */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#1a080a]/95 border-2 border-red-800/40 rounded-2xl p-3.5 flex items-center gap-3.5">
            <span className="text-5xl">💸</span>
            <div>
              <div className="text-base font-black text-red-300/70 uppercase tracking-wider">Затрачено</div>
              <div className="text-2xl font-black text-white mt-0.5">{formatCurrency(metrics.totalSpent)}</div>
            </div>
          </div>

          <div className="bg-[#1a080a]/95 border-2 border-red-800/40 rounded-2xl p-3.5 flex items-center gap-3.5">
            <span className="text-5xl">💰</span>
            <div>
              <div className="text-base font-black text-red-300/70 uppercase tracking-wider">Выигрыш</div>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">{formatCurrency(metrics.totalWin)}</div>
            </div>
          </div>

          <div className="bg-[#1a080a]/95 border-2 border-red-800/40 rounded-2xl p-3.5 flex items-center gap-3.5">
            <span className="text-5xl">📈</span>
            <div>
              <div className="text-base font-black text-red-300/70 uppercase tracking-wider">Профит</div>
              <div className={`text-2xl font-black mt-0.5 ${metrics.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {metrics.profit > 0 ? '+' : ''}{formatCurrency(metrics.profit)}
              </div>
            </div>
          </div>

          <div className="bg-[#1a080a]/95 border-2 border-red-800/40 rounded-2xl p-3.5 flex items-center gap-3.5">
            <span className="text-5xl">⚡</span>
            <div>
              <div className="text-base font-black text-red-300/70 uppercase tracking-wider">Средний X</div>
              <div className="text-2xl font-black text-amber-400 mt-0.5">{formatMultiplier(metrics.avgMultiplier)}</div>
            </div>
          </div>
        </div>

        {/* Топовый икс и Топовый выигрыш c никнеймом игрока */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-red-950/90 to-[#1d090c]/90 border-2 border-amber-500/50 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Crown className="text-amber-400" size={48} />
              <div>
                <div className="text-sm font-black text-amber-300/80 uppercase tracking-wider">Топовый Икс</div>
                <div className="text-2xl text-white font-black">{metrics.bestX?.slot_name || '—'}</div>
                <div className="text-lg text-amber-300 font-extrabold">{metrics.bestX?.player || '—'}</div>
              </div>
            </div>
            <div className="text-5xl font-black text-amber-400">{metrics.bestX ? formatMultiplier(metrics.bestX.multiplier) : '—'}</div>
          </div>

          <div className="bg-gradient-to-r from-red-950/90 to-[#1d090c]/90 border-2 border-emerald-500/50 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Flame className="text-emerald-400" size={48} />
              <div>
                <div className="text-sm font-black text-emerald-300/80 uppercase tracking-wider">Топовый Выигрыш</div>
                <div className="text-2xl text-white font-black">{metrics.bestWin?.slot_name || '—'}</div>
                <div className="text-lg text-emerald-300 font-extrabold">{metrics.bestWin?.player || '—'}</div>
              </div>
            </div>
            <div className="text-5xl font-black text-emerald-400">{metrics.bestWin ? formatCurrency(metrics.bestWin.amount) : '—'}</div>
          </div>
        </div>

        {/* Список автоскролла */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="text-xl font-black text-red-200 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Zap size={28} className="text-red-500" /> Лайв Лента Бонусок
          </div>
          <AutoScrollList bonuses={bonuses} activeBonusId={stream?.active_bonus_id} speedPxPerSec={18} />
        </div>
      </div>
    </div>
  );
};