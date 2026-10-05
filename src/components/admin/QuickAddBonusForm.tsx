import React, { useState, useRef } from 'react';
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
          {calculatedX ? `${calculatedX}x` : '—'}
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
};