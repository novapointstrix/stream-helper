import { supabase } from '../lib/supabaseClient';
import { Stream, BonusBuy } from '../types/database.types';

// Получить все стримы
export const getStreams = async (): Promise<Stream[]> => {
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Ошибка получения стримов:', error);
    return [];
  }
  return data || [];
};

// Получить стрим по ID
export const getStreamById = async (id: string): Promise<Stream | null> => {
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Ошибка получения стрима по ID:', error);
    return null;
  }
  return data;
};

// Создать новый стрим
export const createStream = async (title: string, streamNumber: number): Promise<Stream | null> => {
  const { data, error } = await supabase
    .from('streams')
    .insert([{ title, stream_number: streamNumber }])
    .select()
    .single();

  if (error) {
    console.error('Ошибка при создании стрима в Supabase:', error);
    alert(`Ошибка БД при создании стрима: ${error.message}`);
    return null;
  }
  return data;
};

// Обновить стрим
export const updateStream = async (id: string, updates: Partial<Stream> & Record<string, any>) => {
  const payload = { ...updates };

  const { data, error } = await supabase
    .from('streams')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (!error) return data;

  if (error.code === 'PGRST204') {
    console.warn('Обнаружено несоответствие колонок в БД. Применяется fallback...');

    delete payload.widget_style;
    delete payload.theme_id;
    delete payload.custom_tokens;

    if (Object.keys(payload).length > 0) {
      const fallbackResult = await supabase
        .from('streams')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!fallbackResult.error) {
        return fallbackResult.data;
      }
    }
  }

  console.error('Ошибка обновления стрима:', error);
  return null;
};

// Удалить стрим
export const deleteStream = async (id: string) => {
  const { error } = await supabase.from('streams').delete().eq('id', id);
  if (error) console.error('Ошибка удаления стрима:', error);
};

// Получить бонусы конкретного стрима (сортировка по позициям и дате)
export const getBonusesByStreamId = async (streamId: string): Promise<BonusBuy[]> => {
  const { data, error } = await supabase
    .from('bonus_buys')
    .select('*')
    .eq('stream_id', streamId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Ошибка получения бонусов:', error);
    return [];
  }
  return data || [];
};

// Алиас функции для поддержки импорта getBonusesByStream
export const getBonusesByStream = getBonusesByStreamId;

// Добавить или обновить бонус (Авто-расчет позиции для новых)
export const saveBonusBuy = async (bonus: Partial<BonusBuy>): Promise<BonusBuy | null> => {
  const buyValue = Number(bonus.buy_cost ?? bonus.buy_amount ?? 0);
  const winValue = Number(bonus.win_amount ?? 0);
  const multValue = Number(bonus.multiplier ?? 0);

  let targetPosition = bonus.position;

  // Автоматически вычисляем следующую позицию для нового слота
  if (!bonus.id && !targetPosition && bonus.stream_id) {
    const { data: maxPosData } = await supabase
      .from('bonus_buys')
      .select('position')
      .eq('stream_id', bonus.stream_id)
      .order('position', { ascending: false })
      .limit(1);

    if (maxPosData && maxPosData.length > 0 && typeof maxPosData[0].position === 'number') {
      targetPosition = maxPosData[0].position + 1;
    } else {
      const { count } = await supabase
        .from('bonus_buys')
        .select('*', { count: 'exact', head: true })
        .eq('stream_id', bonus.stream_id);

      targetPosition = (count || 0) + 1;
    }
  }

  const payload: Record<string, any> = {
    stream_id: bonus.stream_id || null,
    slot_name: bonus.slot_name || '',
    provider: bonus.provider || null,
    player_name: bonus.player_name || null,
    buy_cost: buyValue,
    buy_amount: buyValue,
    win_amount: winValue,
    multiplier: multValue,
    status: bonus.status || 'pending',
  };

  if (targetPosition) {
    payload.position = targetPosition;
  }

  let query;
  if (bonus.id) {
    query = supabase
      .from('bonus_buys')
      .update(payload)
      .eq('id', bonus.id)
      .select()
      .single();
  } else {
    query = supabase
      .from('bonus_buys')
      .insert([payload])
      .select()
      .single();
  }

  const { data, error } = await query;

  if (error) {
    console.error('Ошибка при сохранении бонуса:', error);
    alert(`Ошибка сохранения слота в БД: ${error.message}`);
    return null;
  }
  return data;
};

// Создать бонус (Алиас для компонентов)
export const createBonus = async (bonusData: Partial<BonusBuy>) => {
  return await saveBonusBuy(bonusData);
};

// Обновить бонус (Алиас для компонентов)
export const updateBonus = async (id: string, updates: Partial<BonusBuy>) => {
  return await saveBonusBuy({ id, ...updates });
};

// Удалить бонус
export const deleteBonusBuy = async (bonusId: string, _streamId?: string) => {
  const { error } = await supabase.from('bonus_buys').delete().eq('id', bonusId);
  if (error) console.error('Ошибка удаления бонуса:', error);
};

// Алиас для удаления
export const deleteBonus = deleteBonusBuy;

// Установить активный бонус для оверлея
export const setActiveBonus = async (streamId: string, bonusId: string | null) => {
  const { error } = await supabase
    .from('streams')
    .update({ active_bonus_id: bonusId })
    .eq('id', streamId);

  if (error) console.error('Ошибка установки активного бонуса:', error);
};