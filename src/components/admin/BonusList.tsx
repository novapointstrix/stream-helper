import React, { useState } from 'react';
import { BonusBuy } from '../../types/database.types';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency, formatMultiplier } from '../../lib/utils';
import { Edit2, Trash2, Check, X, Play } from 'lucide-react';

interface Props {
    bonuses: BonusBuy[];
    onBonusUpdated?: () => void;
}

export const BonusList: React.FC<Props> = ({ bonuses, onBonusUpdated }) => {
    const [editingBonus, setEditingBonus] = useState<BonusBuy | null>(null);
    const [loading, setLoading] = useState(false);

    // Сортировка слотов по позиции или дате
    const sortedBonuses = [...bonuses].sort((a, b) => {
        if (a.position != null && b.position != null && a.position !== b.position) {
            return a.position - b.position;
        }
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
    });

    // Удаление с перерасчетом порядковых номеров
    const handleDelete = async (id: string) => {
        if (!confirm('Вы уверены, что хотите удалить этот слот?')) return;

        // 1. Удаляем запись из базы
        const { error } = await supabase.from('bonus_buys').delete().eq('id', id);
        if (error) {
            alert(`Ошибка при удалении: ${error.message}`);
            return;
        }

        // 2. Нормализуем позиции оставшихся слотов в БД
        const remaining = sortedBonuses.filter((b) => b.id !== id);
        const updatePromises = remaining.map((item, idx) =>
            supabase
                .from('bonus_buys')
                .update({ position: idx + 1 })
                .eq('id', item.id)
        );

        await Promise.all(updatePromises);

        // 3. Вызываем триггер обновления стейта
        if (onBonusUpdated) {
            onBonusUpdated();
        }
    };

    // Переключение LIVE статуса
    const toggleStatus = async (bonus: BonusBuy) => {
        const isCurrentlyPlaying = bonus.status === 'playing';
        const newStatus = isCurrentlyPlaying ? 'pending' : 'playing';

        if (!isCurrentlyPlaying && bonus.stream_id) {
            await supabase
                .from('bonus_buys')
                .update({ status: 'pending' })
                .eq('stream_id', bonus.stream_id)
                .eq('status', 'playing');

            await supabase
                .from('streams')
                .update({ active_bonus_id: bonus.id })
                .eq('id', bonus.stream_id);
        } else if (isCurrentlyPlaying && bonus.stream_id) {
            await supabase
                .from('streams')
                .update({ active_bonus_id: null })
                .eq('id', bonus.stream_id);
        }

        await supabase.from('bonus_buys').update({ status: newStatus }).eq('id', bonus.id);
        if (onBonusUpdated) onBonusUpdated();
    };

    // Сохранение изменений модалки
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBonus) return;

        setLoading(true);

        const buyCost = Number(editingBonus.buy_cost ?? editingBonus.buy_amount ?? 0);
        const winAmount = Number(editingBonus.win_amount ?? 0);
        const multiplier = buyCost > 0 ? winAmount / buyCost : 0;

        let autoStatus = editingBonus.status;
        if (editingBonus.status !== 'playing') {
            autoStatus = winAmount > 0 ? 'completed' : 'pending';
        }

        const { error } = await supabase
            .from('bonus_buys')
            .update({
                slot_name: editingBonus.slot_name,
                provider: editingBonus.provider || null,
                player_name: editingBonus.player_name || null,
                position: editingBonus.position != null ? Number(editingBonus.position) : null,
                buy_amount: buyCost,
                buy_cost: buyCost,
                win_amount: winAmount,
                multiplier: multiplier,
                status: autoStatus,
            })
            .eq('id', editingBonus.id);

        setLoading(false);

        if (error) {
            alert(`Ошибка при сохранении: ${error.message}`);
        } else {
            setEditingBonus(null);
            if (onBonusUpdated) onBonusUpdated();
        }
    };

    return (
        <div className="bg-[#121214] border border-white/10 rounded-2xl p-6 text-white shadow-xl mt-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-100">
                Список бонусов ({sortedBonuses.length})
            </h2>

            {sortedBonuses.length === 0 ? (
                <div className="text-gray-500 text-sm">Бонусы пока не добавлены.</div>
            ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                    {sortedBonuses.map((item, index) => {
                        const isPlaying = item.status === 'playing';
                        const cost = item.buy_amount ?? item.buy_cost ?? 0;

                        // Сквозная динамическая нумерация по индексу списка (1, 2, 3...)
                        const displayIndex = String(index + 1).padStart(2, '0');

                        return (
                            <div
                                key={item.id}
                                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${isPlaying
                                        ? 'bg-yellow-950/40 border-yellow-500/80 shadow-[0_0_15px_rgba(242,248,31,0.2)]'
                                        : 'bg-[#1a1a1e] border-white/5 hover:border-white/20'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className="font-bold font-mono text-amber-400 min-w-[36px]">
                                        #{displayIndex}
                                    </span>
                                    <div>
                                        <div className="font-bold text-lg text-white">{item.slot_name}</div>
                                        <div className="text-sm text-gray-400">
                                            {item.provider || item.player_name || '—'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400">Покупка</div>
                                        <div className="font-semibold">{formatCurrency(cost)}</div>
                                    </div>

                                    <div className="text-right min-w-[90px]">
                                        <div className="text-xs text-gray-400">Выигрыш</div>
                                        <div
                                            className={`font-semibold ${(item.multiplier || 0) >= 1.0 ? 'text-emerald-400' : 'text-gray-300'
                                                }`}
                                        >
                                            {item.win_amount ? formatCurrency(item.win_amount) : '—'}
                                        </div>
                                    </div>

                                    <div className="text-right min-w-[70px]">
                                        <div className="text-xs text-gray-400">Икс</div>
                                        <div className="font-bold text-yellow-400">
                                            {formatMultiplier(item.multiplier)}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => toggleStatus(item)}
                                            title={isPlaying ? 'Снять статус LIVE' : 'Сделать активным (LIVE)'}
                                            className={`p-2 rounded-lg border transition-colors cursor-pointer ${isPlaying
                                                    ? 'bg-yellow-500 text-black border-yellow-400 font-bold'
                                                    : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-yellow-950/60 hover:text-yellow-400'
                                                }`}
                                        >
                                            <Play size={16} className={isPlaying ? 'fill-black' : ''} />
                                        </button>

                                        <button
                                            onClick={() => setEditingBonus(item)}
                                            title="Редактировать слот"
                                            className="p-2 bg-gray-800 text-blue-400 border border-gray-700 rounded-lg hover:bg-blue-950 hover:border-blue-500 transition-colors cursor-pointer"
                                        >
                                            <Edit2 size={16} />
                                        </button>

                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            title="Удалить слот"
                                            className="p-2 bg-gray-800 text-red-400 border border-gray-700 rounded-lg hover:bg-red-950 hover:border-red-600 transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Модальное окно редактирования */}
            {editingBonus && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form
                        onSubmit={handleSaveEdit}
                        className="bg-[#18181c] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
                    >
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="text-xl font-bold text-white">Редактирование слота</h3>
                            <button
                                type="button"
                                onClick={() => setEditingBonus(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Название слота
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingBonus.slot_name || ''}
                                    onChange={(e) =>
                                        setEditingBonus({ ...editingBonus, slot_name: e.target.value })
                                    }
                                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Позиция (#)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={editingBonus.position ?? ''}
                                    onChange={(e) =>
                                        setEditingBonus({
                                            ...editingBonus,
                                            position: e.target.value === '' ? null : Number(e.target.value),
                                        })
                                    }
                                    placeholder="Авто"
                                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Провайдер
                                </label>
                                <input
                                    type="text"
                                    value={editingBonus.provider || ''}
                                    onChange={(e) =>
                                        setEditingBonus({ ...editingBonus, provider: e.target.value })
                                    }
                                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">Игрок</label>
                                <input
                                    type="text"
                                    value={editingBonus.player_name || ''}
                                    onChange={(e) =>
                                        setEditingBonus({ ...editingBonus, player_name: e.target.value })
                                    }
                                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Цена покупки ($)
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={editingBonus.buy_amount || editingBonus.buy_cost || ''}
                                    onChange={(e) => {
                                        const newCost = e.target.value === '' ? 0 : Number(e.target.value);
                                        const win = Number(editingBonus.win_amount || 0);
                                        setEditingBonus({
                                            ...editingBonus,
                                            buy_amount: newCost,
                                            buy_cost: newCost,
                                            multiplier: newCost > 0 ? win / newCost : 0,
                                        });
                                    }}
                                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Выигрыш ($)
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={editingBonus.win_amount || ''}
                                    onChange={(e) => {
                                        const newWin = e.target.value === '' ? 0 : Number(e.target.value);
                                        const cost = Number(editingBonus.buy_cost || editingBonus.buy_amount || 0);
                                        setEditingBonus({
                                            ...editingBonus,
                                            win_amount: newWin,
                                            multiplier: cost > 0 ? newWin / cost : 0,
                                        });
                                    }}
                                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1">Статус</label>
                            <select
                                value={editingBonus.status || 'pending'}
                                onChange={(e) =>
                                    setEditingBonus({ ...editingBonus, status: e.target.value as any })
                                }
                                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500"
                            >
                                <option value="pending">Ожидает (Pending)</option>
                                <option value="playing">Играет сейчас (LIVE)</option>
                                <option value="completed">Завершен (Completed)</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setEditingBonus(null)}
                                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl flex items-center gap-2 transition cursor-pointer"
                            >
                                <Check size={18} />
                                {loading ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};