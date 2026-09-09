import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Loader2 } from 'lucide-react';

interface Props {
  streamId?: string;
  onBonusAdded?: () => void;
}

export const QuickAddBonusForm: React.FC<Props> = ({ streamId, onBonusAdded }) => {
  const [slotName, setSlotName] = useState('');
  const [playerOrProvider, setPlayerOrProvider] = useState('');
  const [buyCost, setBuyCost] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotName.trim() || !buyCost) return;

    if (!streamId) {
      alert('Ошибка: Стрим не выбран');
      return;
    }

    setLoading(true);

    try {
      // 🔑 Получаем текущего юзера
      const { data: { user } } = await supabase.auth.getUser();

      const costNumber = Number(buyCost) || 0;
      const metaValue = playerOrProvider.trim() || null;

      // 1. Получаем текущее количество слотов у стрима
      const { count } = await supabase
        .from('bonus_buys')
        .select('*', { count: 'exact', head: true })
        .eq('stream_id', streamId);

      const nextPosition = (count || 0) + 1;

      // 2. Вставляем новый бонус С УКАЗАНИЕМ user_id
      const { error } = await supabase.from('bonus_buys').insert([
        {
          stream_id: streamId,
          user_id: user?.id || null, // 👈 Передаем user_id
          slot_name: slotName.trim(),
          player_name: metaValue,
          provider: metaValue || '—',
          buy_amount: costNumber,
          buy_cost: costNumber,
          win_amount: null,
          multiplier: null,
          position: nextPosition,
          status: 'pending',
        },
      ]);

      if (error) throw error;

      setSlotName('');
      setPlayerOrProvider('');
      setBuyCost('');

      if (onBonusAdded) {
        onBonusAdded();
      }
    } catch (err: any) {
      console.error('Ошибка добавления бонуса:', err);
      alert(`Ошибка: ${err?.message || 'Не удалось добавить слот'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#121214] border border-white/10 rounded-2xl p-4 shadow-xl space-y-3 mb-6"
    >
      <div className="text-sm font-bold text-gray-200">Быстрое добавление слота</div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Слот *</label>
          <input
            type="text"
            required
            placeholder="Название слота"
            value={slotName}
            onChange={(e) => setSlotName(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Ник / Провайдер</label>
          <input
            type="text"
            placeholder="Никнейм или провайдер"
            value={playerOrProvider}
            onChange={(e) => setPlayerOrProvider(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Покупка ($) *</label>
          <input
            type="number"
            step="any"
            required
            placeholder="Сумма покупки"
            value={buyCost}
            onChange={(e) => setBuyCost(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={loading || !slotName || !buyCost}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black disabled:opacity-50 font-bold rounded-xl text-sm flex items-center gap-2 transition shadow-md cursor-pointer"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {loading ? 'Добавление...' : 'Добавить слот'}
        </button>
      </div>
    </form>
  );
};