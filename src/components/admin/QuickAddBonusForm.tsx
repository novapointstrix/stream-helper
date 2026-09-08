import React, { useState } from 'react';
import { createBonus } from '../../services/bonusService';
import { Plus } from 'lucide-react';

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
      alert('Ошибка: Не выбран ID стрима');
      return;
    }

    setLoading(true);

    try {
      const costNumber = Number(buyCost) || 0;
      const metaValue = playerOrProvider.trim() || '';

      await createBonus({
        stream_id: streamId,
        slot_name: slotName.trim(),
        player_name: metaValue || null,
        provider: metaValue || '—',
        buy_amount: costNumber,
        buy_cost: costNumber,
        win_amount: null,
        multiplier: null,
        position: 0,
        status: 'pending',
      });

      setSlotName('');
      setPlayerOrProvider('');
      setBuyCost('');

      if (onBonusAdded) {
        onBonusAdded();
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Ошибка добавления бонуса:', error);
      alert(`Ошибка: ${error?.message || 'Не удалось добавить слот'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-lg space-y-3 mb-6"
    >
      <div className="text-sm font-bold text-zinc-200">Быстрое добавление слота</div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Слот</label>
          <input
            type="text"
            required
            placeholder="Название слота *"
            value={slotName}
            onChange={(e) => setSlotName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Ник/Провайдер</label>
          <input
            type="text"
            placeholder="Ник/Провайдер"
            value={playerOrProvider}
            onChange={(e) => setPlayerOrProvider(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Покупка ($)</label>
          <input
            type="number"
            step="any"
            required
            placeholder="Цена покупки ($) *"
            value={buyCost}
            onChange={(e) => setBuyCost(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={loading || !slotName || !buyCost}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 disabled:opacity-50 font-bold rounded-xl text-sm flex items-center gap-2 transition shadow-md cursor-pointer"
        >
          <Plus size={16} />
          {loading ? 'Добавление...' : 'Добавить слот'}
        </button>
      </div>
    </form>
  );
};