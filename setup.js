const fs = require('fs');
const path = require('path');

const files = {
  'package.json': JSON.stringify({
    "name": "bonus-buy-tracker",
    "private": true,
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "preview": "vite preview"
    },
    "dependencies": {
      "@supabase/supabase-js": "^2.39.0",
      "lucide-react": "^0.344.0",
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-router-dom": "^6.22.0"
    },
    "devDependencies": {
      "@types/react": "^18.2.55",
      "@types/react-dom": "^18.2.19",
      "@vitejs/plugin-react": "^4.2.1",
      "autoprefixer": "^10.4.18",
      "postcss": "^8.4.35",
      "tailwindcss": "^3.4.1",
      "typescript": "^5.2.2",
      "vite": "^5.1.0"
    }
  }, null, 2),

  'index.html': `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bonus Buy Tracker</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900;1000&display=swap" rel="stylesheet">
  </head>
  <body class="bg-transparent text-white antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,

  'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`,

  'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};`,

  'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`,

  'tsconfig.json': JSON.stringify({
    "compilerOptions": {
      "target": "ES2020",
      "useDefineForClassFields": true,
      "lib": ["ES2020", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noEmit": true,
      "jsx": "react-jsx",
      "strict": true,
      "noUnusedLocals": false,
      "noUnusedParameters": false,
      "noFallthroughCasesInSwitch": true
    },
    "include": ["src"]
  }, null, 2),

  'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}`,

  'src/types/database.types.ts': `export type StreamStatus = 'active' | 'completed';
export type BonusStatus = 'pending' | 'playing' | 'completed' | 'cancelled';

export interface Stream {
  id: string;
  stream_number: number;
  date: string;
  title: string;
  status: StreamStatus;
  active_bonus_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BonusBuy {
  id: string;
  stream_id: string;
  position: number;
  slot_name: string;
  provider: string; // Храним ник игрока, который заколлил слот
  buy_amount: number;
  win_amount: number | null;
  multiplier: number | null;
  status: BonusStatus;
  created_at?: string;
  updated_at?: string;
}

export interface StreamMetrics {
  totalBuys: number;
  completedBuys: number;
  totalSpent: number;
  totalWin: number;
  profit: number;
  avgMultiplier: number;
  bestX: { multiplier: number; slot_name: string; player: string } | null;
  bestWin: { amount: number; slot_name: string; player: string } | null;
}`,

  'src/lib/utils.ts': `import { BonusBuy, StreamMetrics } from '../types/database.types';

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatMultiplier(mult: number | null | undefined): string {
  if (mult === null || mult === undefined || isNaN(mult)) return '—';
  return \`\${mult.toFixed(2)}x\`;
}

export function calculateMetrics(bonuses: BonusBuy[]): StreamMetrics {
  const completed = bonuses.filter((b) => b.status === 'completed');
  
  const totalSpent = bonuses
    .filter((b) => b.status !== 'cancelled')
    .reduce((acc, b) => acc + (b.buy_amount || 0), 0);

  const totalWin = completed.reduce((acc, b) => acc + (b.win_amount || 0), 0);
  const profit = totalWin - totalSpent;

  const validMultipliers = completed
    .map((b) => b.multiplier)
    .filter((m): m is number => m !== null && !isNaN(m));

  const avgMultiplier =
    validMultipliers.length > 0
      ? validMultipliers.reduce((a, b) => a + b, 0) / validMultipliers.length
      : 0;

  let bestX: StreamMetrics['bestX'] = null;
  let bestWin: StreamMetrics['bestWin'] = null;

  if (completed.length > 0) {
    const sortedByX = [...completed].sort((a, b) => (b.multiplier || 0) - (a.multiplier || 0));
    const sortedByWin = [...completed].sort((a, b) => (b.win_amount || 0) - (a.win_amount || 0));

    if (sortedByX[0] && sortedByX[0].multiplier !== null) {
      bestX = { 
        multiplier: sortedByX[0].multiplier, 
        slot_name: sortedByX[0].slot_name,
        player: sortedByX[0].provider || 'Игрок'
      };
    }
    if (sortedByWin[0] && sortedByWin[0].win_amount !== null) {
      bestWin = { 
        amount: sortedByWin[0].win_amount, 
        slot_name: sortedByWin[0].slot_name,
        player: sortedByWin[0].provider || 'Игрок'
      };
    }
  }

  return {
    totalBuys: bonuses.length,
    completedBuys: completed.length,
    totalSpent,
    totalWin,
    profit,
    avgMultiplier,
    bestX,
    bestWin,
  };
}`,

  'src/lib/broadcast.ts': `const CHANNEL_NAME = 'bonus_buy_tracker_channel';
export const broadcast = new BroadcastChannel(CHANNEL_NAME);

export function notifyChange(streamId: string) {
  broadcast.postMessage({ type: 'UPDATE_STREAM', streamId });
}`,

  'src/services/bonusService.ts': `import { BonusBuy, Stream } from '../types/database.types';
import { notifyChange } from '../lib/broadcast';

const STORAGE_STREAMS_KEY = 'bonus_tracker_streams_list';
const STORAGE_BONUSES_KEY = 'bonus_tracker_items_list';

const INITIAL_STREAMS: Stream[] = [
  {
    id: 'demo-127',
    stream_number: 127,
    title: 'ОХОТА ЗА X1000',
    date: new Date().toISOString().split('T')[0],
    status: 'active',
    active_bonus_id: 'b5',
  }
];

const INITIAL_BONUSES: BonusBuy[] = [
  { id: 'b1', stream_id: 'demo-127', position: 1, slot_name: 'Sweet Bonanza', provider: 'Xaoc', buy_amount: 10000, win_amount: 25000, multiplier: 2.5, status: 'completed' },
  { id: 'b2', stream_id: 'demo-127', position: 2, slot_name: 'Gates of Olympus', provider: 'Mellstroy', buy_amount: 10000, win_amount: 4000, multiplier: 0.4, status: 'completed' },
  { id: 'b3', stream_id: 'demo-127', position: 3, slot_name: 'Wanted Dead or a Wild', provider: 'Zubarefff', buy_amount: 10000, win_amount: 32500, multiplier: 3.25, status: 'completed' },
  { id: 'b4', stream_id: 'demo-127', position: 4, slot_name: 'The Dog House', provider: 'Evelone', buy_amount: 10000, win_amount: 18000, multiplier: 1.8, status: 'completed' },
  { id: 'b5', stream_id: 'demo-127', position: 5, slot_name: 'Starlight Princess', provider: 'Buster', buy_amount: 10000, win_amount: null, multiplier: null, status: 'playing' },
];

export async function getStreams(): Promise<Stream[]> {
  const raw = localStorage.getItem(STORAGE_STREAMS_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_STREAMS_KEY, JSON.stringify(INITIAL_STREAMS));
    return INITIAL_STREAMS;
  }
  return JSON.parse(raw);
}

export async function getStreamById(id: string): Promise<Stream | null> {
  const streams = await getStreams();
  return streams.find((s) => s.id === id) || null;
}

export async function createStream(title: string, stream_number: number): Promise<Stream> {
  const streams = await getStreams();
  const newStream: Stream = {
    id: 'stream-' + Date.now(),
    stream_number,
    title: title || \`Стрим #\${stream_number}\`,
    date: new Date().toISOString().split('T')[0],
    status: 'active',
  };
  streams.unshift(newStream);
  localStorage.setItem(STORAGE_STREAMS_KEY, JSON.stringify(streams));
  return newStream;
}

export async function updateStream(id: string, data: Partial<Stream>): Promise<Stream | null> {
  const streams = await getStreams();
  const idx = streams.findIndex((s) => s.id === id);
  if (idx !== -1) {
    streams[idx] = { ...streams[idx], ...data };
    localStorage.setItem(STORAGE_STREAMS_KEY, JSON.stringify(streams));
    notifyChange(id);
    return streams[idx];
  }
  return null;
}

export async function setActiveBonus(streamId: string, bonusId: string | null): Promise<void> {
  const rawBonuses = localStorage.getItem(STORAGE_BONUSES_KEY);
  let list: BonusBuy[] = rawBonuses ? JSON.parse(rawBonuses) : INITIAL_BONUSES;

  list = list.map((b) => {
    if (b.stream_id === streamId) {
      if (b.id === bonusId) {
        return { ...b, status: 'playing' };
      } else if (b.status === 'playing') {
        return { ...b, status: 'pending' };
      }
    }
    return b;
  });

  localStorage.setItem(STORAGE_BONUSES_KEY, JSON.stringify(list));
  await updateStream(streamId, { active_bonus_id: bonusId });
}

export async function getBonusesByStreamId(streamId: string): Promise<BonusBuy[]> {
  const raw = localStorage.getItem(STORAGE_BONUSES_KEY);
  let list: BonusBuy[] = raw ? JSON.parse(raw) : INITIAL_BONUSES;
  if (!raw) {
    localStorage.setItem(STORAGE_BONUSES_KEY, JSON.stringify(INITIAL_BONUSES));
  }
  return list.filter((b) => b.stream_id === streamId);
}

export async function saveBonusBuy(bonus: Partial<BonusBuy> & { stream_id: string }): Promise<BonusBuy> {
  const raw = localStorage.getItem(STORAGE_BONUSES_KEY);
  const list: BonusBuy[] = raw ? JSON.parse(raw) : INITIAL_BONUSES;

  const buy = bonus.buy_amount || 0;
  let win = bonus.win_amount;
  let mult: number | null = null;
  let status = bonus.status || 'pending';

  if (win !== null && win !== undefined && !isNaN(win) && buy > 0) {
    mult = Number((win / buy).toFixed(2));
    status = 'completed';
  }

  if (bonus.id) {
    const idx = list.findIndex((b) => b.id === bonus.id);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        slot_name: bonus.slot_name || list[idx].slot_name,
        provider: bonus.provider !== undefined ? bonus.provider : list[idx].provider,
        buy_amount: buy,
        win_amount: win !== undefined ? win : list[idx].win_amount,
        multiplier: mult,
        status,
      };
    }
  } else {
    const streamBonuses = list.filter((b) => b.stream_id === bonus.stream_id);
    const newEntry: BonusBuy = {
      id: 'b_' + Date.now(),
      stream_id: bonus.stream_id,
      position: streamBonuses.length + 1,
      slot_name: bonus.slot_name || 'Слот',
      provider: bonus.provider || 'Игрок',
      buy_amount: buy,
      win_amount: win ?? null,
      multiplier: mult,
      status,
    };
    list.push(newEntry);
  }

  localStorage.setItem(STORAGE_BONUSES_KEY, JSON.stringify(list));
  notifyChange(bonus.stream_id);
  return list[list.length - 1];
}

export async function deleteBonusBuy(id: string, streamId: string): Promise<void> {
  const raw = localStorage.getItem(STORAGE_BONUSES_KEY);
  if (raw) {
    const list: BonusBuy[] = JSON.parse(raw);
    const updated = list.filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_BONUSES_KEY, JSON.stringify(updated));
    notifyChange(streamId);
  }
}`,

  'src/components/admin/QuickAddBonusForm.tsx': `import React, { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { saveBonusBuy } from '../../services/bonusService';

interface Props {
  streamId: string;
  onAdded: () => void;
}

export const QuickAddBonusForm: React.FC<Props> = ({ streamId, onAdded }) => {
  const [slotName, setSlotName] = useState('');
  const [player, setPlayer] = useState('');
  const [buyAmount, setBuyAmount] = useState<string>('10000');
  const [winAmount, setWinAmount] = useState<string>('');

  const slotInputRef = useRef<HTMLInputElement>(null);

  const calculatedX =
    buyAmount && winAmount && Number(buyAmount) > 0
      ? (Number(winAmount) / Number(buyAmount)).toFixed(2)
      : null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!slotName.trim()) return;

    await saveBonusBuy({
      stream_id: streamId,
      slot_name: slotName.trim(),
      provider: player.trim() || 'Игрок',
      buy_amount: Number(buyAmount) || 0,
      win_amount: winAmount !== '' ? Number(winAmount) : null,
      status: winAmount !== '' ? 'completed' : 'pending',
    });

    setSlotName('');
    setWinAmount('');
    onAdded();
    slotInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#120507]/90 border border-red-900/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(220,38,38,0.1)] flex flex-wrap lg:flex-nowrap items-center gap-3"
    >
      <div className="flex-1 min-w-[180px]">
        <label className="text-xs text-red-300/60 font-medium block mb-1">Слот / Игра</label>
        <input
          ref={slotInputRef}
          type="text"
          placeholder="Sweet Bonanza"
          value={slotName}
          onChange={(e) => setSlotName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-[#080203] border border-red-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
        />
      </div>

      <div className="w-40">
        <label className="text-xs text-red-300/60 font-medium block mb-1">Ник игрока</label>
        <input
          type="text"
          placeholder="Кто заколил"
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-[#080203] border border-red-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
        />
      </div>

      <div className="w-32">
        <label className="text-xs text-red-300/60 font-medium block mb-1">Цена (₽)</label>
        <input
          type="number"
          value={buyAmount}
          onChange={(e) => setBuyAmount(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-[#080203] border border-red-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
        />
      </div>

      <div className="w-32">
        <label className="text-xs text-red-300/60 font-medium block mb-1">Выигрыш (₽)</label>
        <input
          type="number"
          placeholder="—"
          value={winAmount}
          onChange={(e) => setWinAmount(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-[#080203] border border-red-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
        />
      </div>

      <div className="w-20 text-center">
        <label className="text-xs text-red-300/60 font-medium block mb-1">Итого X</label>
        <div className="text-sm font-bold text-red-300 py-2">
          {calculatedX ? \`\${calculatedX}x\` : '—'}
        </div>
      </div>

      <button
        type="submit"
        className="bg-red-700 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] transition flex items-center gap-2 cursor-pointer"
      >
        <Plus size={18} />
        Добавить
      </button>
    </form>
  );
};`,

  'src/components/overlay/AutoScrollList.tsx': `import React, { useEffect, useRef } from 'react';
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
                key={\`\${item.id}-\${idx}\`}
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
                    <div className={\`text-2xl font-black \${isPending ? 'text-gray-500' : isProfit ? 'text-emerald-400' : 'text-red-300'}\`}>
                      {isPending ? '—' : formatCurrency(item.win_amount)}
                    </div>
                  </div>

                  <div className="w-36 text-right">
                    <span className={\`inline-block text-3xl font-black px-5 py-2 rounded-xl border \${
                      isPending
                        ? 'bg-gray-900/40 border-gray-700 text-gray-500'
                        : isProfit
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                        : 'bg-red-950/60 border-red-700/40 text-red-200'
                    }\`}>
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
};`,

  'src/components/common/Navbar.tsx': `import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Tv } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  if (location.pathname.startsWith('/overlay')) return null;

  const links = [
    { to: '/admin', label: 'Дашборд Стрима', icon: LayoutDashboard },
    { to: '/admin/streams', label: 'Все Стримы (История)', icon: History },
  ];

  return (
    <nav className="bg-[#090204]/90 border-b border-red-900/40 px-8 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-700 rounded-xl text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]">
          <Tv size={20} />
        </div>
        <span className="font-black text-lg tracking-wider text-white uppercase">
          БОНУС БАЙ <span className="text-red-500">ТРЕКЕР</span>
        </span>
      </div>

      <div className="flex gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to || (link.to === '/admin' && location.pathname.startsWith('/admin/streams/'));
          return (
            <Link
              key={link.to}
              to={link.to}
              className={\`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition \${
                isActive
                  ? 'bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                  : 'text-red-300/60 hover:text-white hover:bg-red-950/40'
              }\`}
            >
              <Icon size={16} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};`,

  'src/pages/AdminDashboard.tsx': `import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BonusBuy, Stream } from '../types/database.types';
import { getBonusesByStreamId, deleteBonusBuy, saveBonusBuy, getStreams, getStreamById, updateStream, setActiveBonus } from '../services/bonusService';
import { QuickAddBonusForm } from '../components/admin/QuickAddBonusForm';
import { calculateMetrics, formatCurrency, formatMultiplier } from '../lib/utils';
import { Copy, Trash2, Check, Edit3, Save, Play, Square } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [streams, setStreams] = useState<Stream[]>([]);
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);
  const [bonuses, setBonuses] = useState<BonusBuy[]>([]);
  const [copied, setCopied] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editNumber, setEditNumber] = useState<number>(0);

  const loadData = async () => {
    const allStreams = await getStreams();
    setStreams(allStreams);

    const activeStreamId = id || (allStreams[0] ? allStreams[0].id : 'demo-127');
    const stream = await getStreamById(activeStreamId);

    if (stream) {
      setCurrentStream(stream);
      setEditTitle(stream.title);
      setEditNumber(stream.stream_number);
      const data = await getBonusesByStreamId(stream.id);
      setBonuses(data);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSaveStreamInfo = async () => {
    if (!currentStream) return;
    const updated = await updateStream(currentStream.id, {
      title: editTitle,
      stream_number: Number(editNumber) || 0,
    });
    if (updated) {
      setCurrentStream(updated);
      setIsEditing(false);
      loadData();
    }
  };

  const handleStartPlaying = async (bonusId: string) => {
    if (!currentStream) return;
    await setActiveBonus(currentStream.id, bonusId);
    loadData();
  };

  const handleStopPlaying = async () => {
    if (!currentStream) return;
    await setActiveBonus(currentStream.id, null);
    loadData();
  };

  const metrics = calculateMetrics(bonuses);

  const copyObsUrl = () => {
    if (!currentStream) return;
    const url = \`\${window.location.origin}/overlay/\${currentStream.id}\`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInlineWinChange = async (bonus: BonusBuy, winVal: string) => {
    const win = winVal !== '' ? Number(winVal) : null;
    await saveBonusBuy({ ...bonus, win_amount: win });
    if (currentStream) {
      const data = await getBonusesByStreamId(currentStream.id);
      setBonuses(data);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 text-white">
      <div className="flex items-center justify-between bg-[#120507]/90 border border-red-900/40 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <span className="text-xs text-red-300/60 font-semibold">Выберите стрим:</span>
          <select
            value={currentStream?.id || ''}
            onChange={(e) => navigate(\`/admin/streams/\${e.target.value}\`)}
            className="bg-[#080203] border border-red-800/40 rounded-xl px-4 py-2 text-sm text-white font-bold focus:outline-none focus:border-red-500 cursor-pointer"
          >
            {streams.map((s) => (
              <option key={s.id} value={s.id}>
                BONUS BUY #{s.stream_number} — {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#120507]/80 border border-red-900/40 p-6 rounded-3xl backdrop-blur-xl">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <div>
                <label className="text-[10px] text-red-300/60 block">Номер</label>
                <input
                  type="number"
                  value={editNumber}
                  onChange={(e) => setEditNumber(Number(e.target.value))}
                  className="w-24 bg-[#080203] border border-red-800/40 rounded-xl px-3 py-1 text-sm font-bold text-red-400"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] text-red-300/60 block">Название стрима</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#080203] border border-red-800/40 rounded-xl px-3 py-1 text-sm font-bold text-white"
                />
              </div>
              <button
                onClick={handleSaveStreamInfo}
                className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                <Save size={14} /> Сохранить
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-red-400 bg-red-950/60 px-3 py-1 rounded-full border border-red-800/40">
                  🍔 BONUS BUY #{currentStream?.stream_number}
                </span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-red-400/60 hover:text-red-300 text-xs flex items-center gap-1 font-medium transition"
                >
                  <Edit3 size={14} /> Редактировать
                </button>
              </div>
              <h1 className="text-2xl font-black mt-2 text-white">{currentStream?.title}</h1>
            </div>
          )}
        </div>

        <button
          onClick={copyObsUrl}
          className="bg-red-950/60 hover:bg-red-900/80 border border-red-800/40 text-red-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.15)]"
        >
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          {copied ? 'Скопировано!' : 'CКОПИРОВАТЬ OBS ССЫЛКУ'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Всего куплено', val: metrics.totalBuys, icon: '📦' },
          { label: 'Затрачено', val: formatCurrency(metrics.totalSpent), icon: '💸' },
          { label: 'Выигрыш', val: formatCurrency(metrics.totalWin), icon: '💰' },
          { label: 'Профит', val: formatCurrency(metrics.profit), color: metrics.profit >= 0 ? 'text-emerald-400' : 'text-rose-400', icon: '📈' },
          { label: 'Средний X', val: formatMultiplier(metrics.avgMultiplier), icon: '⚡' },
          { label: 'ЛУЧШИЙ X', val: metrics.bestX ? formatMultiplier(metrics.bestX.multiplier) : '—', icon: '👑' },
        ].map((item, idx) => (
          <div key={idx} className="bg-[#120507]/60 border border-red-900/30 rounded-2xl p-3 text-center relative overflow-hidden">
            <div className="text-xs mb-1">{item.icon}</div>
            <div className="text-[10px] font-bold text-red-300/50 uppercase tracking-wider">{item.label}</div>
            <div className={\`text-sm font-black mt-1 \${item.color || 'text-white'}\`}>{item.val}</div>
          </div>
        ))}
      </div>

      {currentStream && <QuickAddBonusForm streamId={currentStream.id} onAdded={loadData} />}

      <div className="bg-[#120507]/80 border border-red-900/40 rounded-3xl p-6 overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-red-900/30 text-red-300/50 text-xs font-bold uppercase">
              <th className="py-3 px-2">#</th>
              <th className="py-3 px-2">Фаза игры</th>
              <th className="py-3 px-2">Слот</th>
              <th className="py-3 px-2">Игрок (Ник)</th>
              <th className="py-3 px-2">Цена</th>
              <th className="py-3 px-2">Выигрыш</th>
              <th className="py-3 px-2">X</th>
              <th className="py-3 px-2 text-right">Удалить</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-red-950/40">
            {bonuses.map((b) => {
              const isPlaying = b.status === 'playing' || currentStream?.active_bonus_id === b.id;

              return (
                <tr key={b.id} className={isPlaying ? 'bg-amber-500/10' : ''}>
                  <td className="py-3 px-2 font-bold text-red-400">#{b.position}</td>
                  <td className="py-3 px-2">
                    {isPlaying ? (
                      <button
                        onClick={handleStopPlaying}
                        className="bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1 cursor-pointer animate-pulse"
                      >
                        <Square size={12} className="fill-amber-300" /> Снять выбор
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartPlaying(b.id)}
                        className="bg-red-950/60 hover:bg-red-800 border border-red-800/40 text-red-300 text-xs font-semibold px-3 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition"
                      >
                        <Play size={12} className="fill-red-300" /> Начать бонус бай
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-2 font-semibold text-white">{b.slot_name}</td>
                  <td className="py-3 px-2 text-red-300/90 font-bold">{b.provider}</td>
                  <td className="py-3 px-2 font-medium">{formatCurrency(b.buy_amount)}</td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      defaultValue={b.win_amount !== null ? b.win_amount : ''}
                      placeholder="—"
                      onBlur={(e) => handleInlineWinChange(b, e.target.value)}
                      className="w-28 bg-[#080203] border border-red-800/40 rounded-lg px-2 py-1 text-sm text-white"
                    />
                  </td>
                  <td className="py-3 px-2 font-bold text-red-300">{formatMultiplier(b.multiplier)}</td>
                  <td className="py-3 px-2 text-right">
                    <button onClick={async () => { if (currentStream) { await deleteBonusBuy(b.id, currentStream.id); loadData(); } }} className="text-red-400/50 hover:text-rose-400">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};`,

  'src/pages/OBSOverlayPage.tsx': `import React, { useEffect, useState } from 'react';
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
              <div className={\`text-2xl font-black mt-0.5 \${metrics.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>
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
};`,

  'src/pages/HistoryPage.tsx': `import React, { useEffect, useState } from 'react';
import { Stream } from '../types/database.types';
import { getStreams, createStream } from '../services/bonusService';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Tv } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState(128);
  const navigate = useNavigate();

  const loadData = async () => {
    const list = await getStreams();
    setStreams(list);
    if (list.length > 0) {
      setNumber(list[0].stream_number + 1);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await createStream(title, Number(number));
    navigate(\`/admin/streams/\${created.id}\`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-white space-y-6">
      <h1 className="text-2xl font-black">Управление Стримами</h1>

      <form onSubmit={handleCreate} className="bg-[#120507]/80 border border-red-900/40 rounded-3xl p-6 flex flex-wrap items-center gap-4">
        <div className="w-32">
          <label className="text-xs text-red-300/60 font-medium block mb-1">Номер стрима</label>
          <input
            type="number"
            value={number}
            onChange={(e) => setNumber(Number(e.target.value))}
            className="w-full bg-[#080203] border border-red-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-red-300/60 font-medium block mb-1">Название стрима</label>
          <input
            type="text"
            placeholder="Охота за выигрышем x1000"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#080203] border border-red-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
          />
        </div>

        <button
          type="submit"
          className="mt-5 bg-red-700 hover:bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.4)]"
        >
          <Plus size={18} />
          Создать Новый Стрим
        </button>
      </form>

      <div className="grid gap-3">
        {streams.map((s) => (
          <div key={s.id} className="bg-[#120507]/80 border border-red-900/40 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-950/60 rounded-xl border border-red-800/40 text-red-400">
                <Tv size={20} />
              </div>
              <div>
                <span className="text-xs font-bold text-red-400">🍔 BONUS BUY #{s.stream_number}</span>
                <h3 className="text-lg font-extrabold text-white">{s.title}</h3>
                <span className="text-xs text-red-300/40">{s.date}</span>
              </div>
            </div>

            <Link
              to={\`/admin/streams/\${s.id}\`}
              className="bg-red-950/60 hover:bg-red-900/80 border border-red-800/40 text-red-200 text-xs font-bold px-5 py-2.5 rounded-xl transition"
            >
              Открыть Дашборд
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};`,

  'src/App.tsx': `import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { AdminDashboard } from './pages/AdminDashboard';
import { HistoryPage } from './pages/HistoryPage';
import { OBSOverlayPage } from './pages/OBSOverlayPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#060102] text-gray-100 font-sans">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/streams" element={<HistoryPage />} />
          <Route path="/admin/streams/:id" element={<AdminDashboard />} />
          <Route path="/overlay/:streamId" element={<OBSOverlayPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;`,

  'src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
};

Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log('✓ Файл обновлен:', filePath);
});

console.log('\n🎉 Все файлы успешно обновлены!');