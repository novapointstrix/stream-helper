// src/components/wheel/WheelHistory.tsx
import React, { useEffect, useState } from 'react';
import type { SpinRecord } from '../../types/wheel.types';
import { wheelHistoryService } from '../../services/wheelHistoryService';
import { History, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

interface WheelHistoryProps {
    records?: SpinRecord[];
    onDeleteRecord?: (id: string) => void;
    collapsible?: boolean;
    defaultExpanded?: boolean;
}

export const WheelHistory: React.FC<WheelHistoryProps> = ({
    records: externalRecords,
    onDeleteRecord,
    collapsible = false,
    defaultExpanded = false,
}) => {
    const [internalRecords, setInternalRecords] = useState<SpinRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(!externalRecords);
    const [isExpanded, setIsExpanded] = useState<boolean>(!collapsible || defaultExpanded);

    const isStandalone = !externalRecords;
    const displayRecords = externalRecords || internalRecords;

    const loadHistory = async () => {
        setLoading(true);
        const data = await wheelHistoryService.getHistory();
        setInternalRecords(data);
        setLoading(false);
    };

    useEffect(() => {
        if (isStandalone) {
            loadHistory();
        }
    }, [isStandalone]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Удалить эту запись из истории?')) return;

        if (onDeleteRecord) {
            onDeleteRecord(id);
        } else {
            const success = await wheelHistoryService.deleteRecord(id);
            if (success) {
                setInternalRecords((prev) => prev.filter((item) => item.id !== id));
            }
        }
    };

    return (
        <div className="w-full bg-[#121215] border border-[#27272A] rounded-2xl shadow-xl overflow-hidden transition-all">
            {/* Шапка блока */}
            <div
                onClick={() => collapsible && setIsExpanded(!isExpanded)}
                className={`p-4 flex items-center justify-between select-none ${collapsible ? 'cursor-pointer hover:bg-[#18181B]' : ''
                    }`}
            >
                <div className="flex items-center gap-2 text-[#FAFAFA] font-medium text-sm">
                    <History size={18} className="text-amber-500" />
                    <span className="font-bold uppercase tracking-wider text-xs">История прокрутов</span>
                    <span className="text-[10px] font-mono bg-[#18181B] border border-[#27272A] text-[#A1A1AA] px-2 py-0.5 rounded-full">
                        {displayRecords.length}
                    </span>
                </div>

                {collapsible && (
                    <button
                        type="button"
                        className="text-xs text-[#A1A1AA] hover:text-white flex items-center gap-1 bg-[#18181B] border border-[#27272A] px-3 py-1 rounded-xl transition"
                    >
                        {isExpanded ? (
                            <>
                                <span>Свернуть</span>
                                <ChevronUp size={14} />
                            </>
                        ) : (
                            <>
                                <span>Развернуть</span>
                                <ChevronDown size={14} />
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Выпадающий контент */}
            {isExpanded && (
                <div className="border-t border-[#27272A] p-4 bg-[#09090B]">
                    {loading ? (
                        <div className="text-center py-6 text-[#A1A1AA] text-xs font-mono">
                            Загрузка истории...
                        </div>
                    ) : displayRecords.length === 0 ? (
                        <div className="text-center py-6 text-[#52525B] text-xs">
                            Записей пока нет. Прокрутите колесо, чтобы увидеть результаты!
                        </div>
                    ) : (
                        <div className="overflow-x-auto max-h-72 overflow-y-auto">
                            <table className="w-full text-left text-xs text-[#E4E4E7]">
                                <thead className="bg-[#18181B] text-[10px] uppercase font-mono text-[#A1A1AA] border-b border-[#27272A] sticky top-0">
                                    <tr>
                                        <th className="py-2.5 px-3">Время</th>
                                        <th className="py-2.5 px-3">Игрок</th>
                                        <th className="py-2.5 px-3">Выигрыш</th>
                                        <th className="py-2.5 px-3 text-right">Шанс (%)</th>
                                        <th className="py-2.5 px-3 text-center">Действие</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#27272A]/50">
                                    {displayRecords.map((item) => (
                                        <tr key={item.id} className="hover:bg-[#18181B]/60 transition-colors">
                                            <td className="py-2 px-3 whitespace-nowrap text-[11px] font-mono text-[#71717A]">
                                                {new Date(item.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit',
                                                })}
                                            </td>
                                            <td className="py-2 px-3 font-medium text-white">{item.player_name}</td>
                                            <td className="py-2 px-3 font-semibold text-amber-400">{item.prize_label}</td>
                                            <td className="py-2 px-3 text-right font-mono text-[#A1A1AA]">
                                                {item.sector_chance != null ? `${item.sector_chance}%` : '—'}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDelete(item.id, e)}
                                                    className="p-1 text-[#71717A] hover:text-red-400 hover:bg-[#18181B] rounded-md transition"
                                                    title="Удалить запись"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};