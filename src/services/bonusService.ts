import { BonusBuy, Stream } from '../types/database.types';
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
    title: title || `Стрим #${stream_number}`,
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
}