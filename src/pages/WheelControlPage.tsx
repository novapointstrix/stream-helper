import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { WheelSector } from '../types/database.types';
import {
    Plus,
    Trash2,
    ArrowLeft,
    Play,
    Copy,
    Check,
    Save,
    Edit3,
    RotateCcw,
    Loader2,
    Disc,
    ChevronUp,
    ChevronDown,
    History,
    BarChart3
} from 'lucide-react';

interface WheelPresetDB {
    id: string;
    name: string;
    sectors: WheelSector[];
}

interface WheelHistoryItem {
    id: string;
    created_at: string;
    player_name: string;
    prize_label: string;
    sector_chance: number;
    preset_id?: string;
}

const DEFAULT_COLORS = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export const WheelControlPage: React.FC = () => {
    const navigate = useNavigate();
    const [playerName, setPlayerName] = useState('');

    const [presets, setPresets] = useState<WheelPresetDB[]>([]);
    const [activePresetId, setActivePresetId] = useState<string>('');
    const [newPresetName, setNewPresetName] = useState('');
    const [renamePresetName, setRenamePresetName] = useState('');
    const [loading, setLoading] = useState(true);

    const [isPresetsCollapsed, setIsPresetsCollapsed] = useState(false);

    const [sectors, setSectors] = useState<WheelSector[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [copied, setCopied] = useState(false);

    // История прокрутов (только для активного колеса)
    const [wheelHistory, setWheelHistory] = useState<WheelHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchPresets = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('wheel_presets')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Ошибка загрузки пресетов:', error);
        } else if (data && data.length > 0) {
            setPresets(data);
            if (!activePresetId) {
                setActivePresetId(data[0].id);
                setSectors(data[0].sectors || []);
                setRenamePresetName(data[0].name);
            }
        } else {
            await handleCreateDefaultPreset();
        }
        setLoading(false);
    };

    // Загрузка истории ТОЛЬКО для активного пресета (колеса)
    const fetchWheelHistory = async (presetId: string) => {
        if (!presetId) return;
        setLoadingHistory(true);
        const { data, error } = await supabase
            .from('wheel_history')
            .select('*')
            .eq('preset_id', presetId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Ошибка загрузки истории колеса:', error);
        } else if (data) {
            setWheelHistory(data);
        }
        setLoadingHistory(false);
    };

    useEffect(() => {
        fetchPresets();
    }, []);

    // При изменении выбранного колеса — подгружаем его историю
    useEffect(() => {
        if (activePresetId) {
            fetchWheelHistory(activePresetId);
        }
    }, [activePresetId]);

    // Вычисление статистики (сумма и % выпадений) под текущее колесо
    const wheelStats = useMemo(() => {
        const totalRolls = wheelHistory.length;
        if (totalRolls === 0) return { totalRolls: 0, items: [] };

        const countsMap: Record<string, number> = {};
        wheelHistory.forEach((roll) => {
            const label = roll.prize_label || 'Неизвестно';
            countsMap[label] = (countsMap[label] || 0) + 1;
        });

        const items = Object.entries(countsMap)
            .map(([label, count]) => ({
                label,
                count,
                percentage: ((count / totalRolls) * 100).toFixed(1)
            }))
            .sort((a, b) => b.count - a.count);

        return { totalRolls, items };
    }, [wheelHistory]);

    const handleCreateDefaultPreset = async () => {
        const defaultSectors: WheelSector[] = [
            { id: '1', label: '500$', color: '#F59E0B', chance: 20 },
            { id: '2', label: '500$', color: '#EF4444', chance: 20 },
            { id: '3', label: '500$', color: '#10B981', chance: 20 },
            { id: '4', label: '500$', color: '#3B82F6', chance: 20 },
            { id: '5', label: 'Ничего', color: '#27272A', chance: 20 },
        ];

        const { data, error } = await supabase
            .from('wheel_presets')
            .insert([{ name: 'Основное ★', sectors: defaultSectors }])
            .select()
            .single();

        if (!error && data) {
            setPresets([data]);
            setActivePresetId(data.id);
            setSectors(data.sectors);
            setRenamePresetName(data.name);
        }
    };

    const handleSelectPreset = (presetId: string) => {
        setActivePresetId(presetId);
        const selected = presets.find((p) => p.id === presetId);
        if (selected) {
            setSectors(selected.sectors || []);
            setRenamePresetName(selected.name);
        }
    };

    const totalChance = Number(
        sectors.reduce((sum, s) => sum + (Number(s.chance) || 0), 0).toFixed(1)
    );

    const handleCreatePreset = async () => {
        if (!newPresetName.trim()) return;

        const initialSectors: WheelSector[] = [
            { id: '1', label: 'Приз 1', color: '#F59E0B', chance: 50 },
            { id: '2', label: 'Приз 2', color: '#3B82F6', chance: 50 },
        ];

        const { data, error } = await supabase
            .from('wheel_presets')
            .insert([{ name: newPresetName.trim(), sectors: initialSectors }])
            .select()
            .single();

        if (error) {
            alert('Ошибка при создании пресета: ' + error.message);
        } else if (data) {
            setPresets([...presets, data]);
            setActivePresetId(data.id);
            setSectors(data.sectors);
            setRenamePresetName(data.name);
            setNewPresetName('');
        }
    };

    const handleRenamePreset = async () => {
        if (!renamePresetName.trim() || !activePresetId) return;

        const { error } = await supabase
            .from('wheel_presets')
            .update({ name: renamePresetName.trim() })
            .eq('id', activePresetId);

        if (error) {
            alert('Ошибка при переименовании: ' + error.message);
        } else {
            setPresets(
                presets.map((p) =>
                    p.id === activePresetId ? { ...p, name: renamePresetName.trim() } : p
                )
            );
            alert('Название пресета обновлено!');
        }
    };

    const handleDeletePreset = async () => {
        if (!activePresetId) return;
        if (presets.length <= 1) {
            alert('Нельзя удалить единственный пресет!');
            return;
        }

        if (!confirm('Вы уверены, что хотите удалить этот пресет? (Все роллы этого колеса также будут удалены из истории)')) return;

        // Удаляем историю данного колеса
        await supabase.from('wheel_history').delete().eq('preset_id', activePresetId);

        const { error } = await supabase
            .from('wheel_presets')
            .delete()
            .eq('id', activePresetId);

        if (error) {
            alert('Ошибка при удалении пресета: ' + error.message);
        } else {
            const filtered = presets.filter((p) => p.id !== activePresetId);
            setPresets(filtered);
            setActivePresetId(filtered[0].id);
            setSectors(filtered[0].sectors || []);
            setRenamePresetName(filtered[0].name);
        }
    };

    const handleSaveSectors = async () => {
        if (!activePresetId) return;

        const { error } = await supabase
            .from('wheel_presets')
            .update({ sectors })
            .eq('id', activePresetId);

        if (error) {
            alert('Ошибка сохранения секторов: ' + error.message);
        } else {
            setPresets(
                presets.map((p) =>
                    p.id === activePresetId ? { ...p, sectors } : p
                )
            );
            alert('Секторы успешно сохранены в БД!');
        }
    };

    const handleEqualizeChances = () => {
        if (sectors.length === 0) return;
        const equalShare = Number((100 / sectors.length).toFixed(1));
        const updated = sectors.map((s) => ({ ...s, chance: equalShare }));
        setSectors(updated);
    };

    const addSector = () => {
        const nextColor = DEFAULT_COLORS[sectors.length % DEFAULT_COLORS.length];
        setSectors([
            ...sectors,
            {
                id: Date.now().toString(),
                label: `Сектор ${sectors.length + 1}`,
                color: nextColor,
                chance: 10,
            },
        ]);
    };

    const removeSector = (id: string) => {
        if (sectors.length <= 2) {
            alert('В колесе должно быть минимум 2 сектора!');
            return;
        }
        setSectors(sectors.filter((s) => s.id !== id));
    };

    const updateSector = (id: string, field: keyof WheelSector, value: any) => {
        setSectors(
            sectors.map((s) => (s.id === id ? { ...s, [field]: value } : s))
        );
    };

    const getRandomWinner = (): WheelSector => {
        const total = sectors.reduce((sum, s) => sum + Number(s.chance || 0), 0);
        let rand = Math.random() * total;

        for (const sector of sectors) {
            if (rand < sector.chance) {
                return sector;
            }
            rand -= sector.chance;
        }
        return sectors[0];
    };

    const handleLaunchWheel = async () => {
        if (sectors.length < 2 || !activePresetId) return;

        setIsSpinning(true);
        const winningSector = getRandomWinner();
        const durationMs = 10000;
        const currentPlayer = playerName || 'Зритель';

        try {
            // Привязываем ролл к конкретному preset_id
            const { error: dbError } = await supabase
                .from('wheel_history')
                .insert([
                    {
                        preset_id: activePresetId,
                        player_name: currentPlayer,
                        prize_label: winningSector.label,
                        sector_chance: winningSector.chance
                    }
                ]);

            if (dbError) {
                console.error('Ошибка записи истории прокрута в БД:', dbError);
            } else {
                fetchWheelHistory(activePresetId);
            }
        } catch (err) {
            console.error('Ошибка при обращении к wheel_history:', err);
        }

        const payload = {
            id: Date.now().toString(),
            playerName: currentPlayer,
            sectors,
            winningSectorId: winningSector.id,
            durationMs,
            timestamp: Date.now(),
        };

        const channel = supabase.channel('wheel_events');
        await channel.subscribe();
        await channel.send({
            type: 'broadcast',
            event: 'START_SPIN',
            payload,
        });

        setTimeout(() => {
            setIsSpinning(false);
        }, durationMs + 4000);
    };

    const handleDeleteHistoryItem = async (id: string) => {
        const { error } = await supabase
            .from('wheel_history')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Ошибка удаления записи: ' + error.message);
        } else {
            setWheelHistory(prev => prev.filter(item => item.id !== id));
        }
    };

    const handleClearHistory = async () => {
        if (!activePresetId) return;
        if (!confirm('Вы уверены, что хотите очистить историю прокрутов текущего колеса?')) return;

        const { error } = await supabase
            .from('wheel_history')
            .delete()
            .eq('preset_id', activePresetId);

        if (error) {
            alert('Ошибка при очистке истории: ' + error.message);
        } else {
            setWheelHistory([]);
        }
    };

    const copyOBSLink = () => {
        const url = `${window.location.origin}/wheel/overlay`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0C] text-gray-100 flex items-center justify-center">
                <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-5 pb-16 px-4">

            {/* Шапка */}
            <div className="flex items-center justify-between gap-3 bg-[#121215] border border-[#1F1F24] rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition cursor-pointer"
                    >
                        <ArrowLeft size={16} /> Назад
                    </button>

                    <div className="flex items-center gap-2 pl-2 border-l border-[#1F1F24]">
                        <Disc size={18} className="text-amber-400" />
                        <span className="text-xs font-semibold text-white">Интерактивное колесо</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={copyOBSLink}
                        className="bg-[#18181C] hover:bg-[#222228] border border-[#2A2A32] text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-white transition cursor-pointer"
                    >
                        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        {copied ? 'Скопировано!' : 'Ссылка для OBS'}
                    </button>
                </div>
            </div>

            {/* Основная сетка страницы */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

                {/* Левая колонка: Запуск + Настройка секторов (7 колонок) */}
                <div className="lg:col-span-7 space-y-5">

                    {/* Ввод ника зрителя и запуск */}
                    <div className="bg-[#121215] border border-[#1F1F24] rounded-2xl p-5 shadow-xl space-y-3">
                        <label className="block text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                            Управление прокрутом
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Ник зрителя"
                                className="flex-1 bg-[#0A0A0C] border border-[#2A2A32] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                            <button
                                onClick={handleLaunchWheel}
                                disabled={isSpinning || sectors.length < 2}
                                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-amber-500/20"
                            >
                                <Play size={14} className="fill-black" />
                                {isSpinning ? 'Вращение...' : 'Крутить колесо'}
                            </button>
                        </div>
                    </div>

                    {/* Секторы */}
                    <div className="bg-[#121215] border border-[#1F1F24] rounded-2xl p-5 shadow-xl space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                                Секторы и % выпадения
                            </span>
                            <span
                                className={`text-xs font-mono font-bold ${totalChance === 100 ? 'text-emerald-400' : 'text-amber-400'
                                    }`}
                            >
                                сумма: {totalChance}% / 100%
                            </span>
                        </div>

                        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                            {sectors.map((sec) => (
                                <div
                                    key={sec.id}
                                    className="bg-[#0A0A0C] border border-[#1F1F24] rounded-xl p-2.5 flex items-center gap-2.5"
                                >
                                    <input
                                        type="color"
                                        value={sec.color}
                                        onChange={(e) => updateSector(sec.id, 'color', e.target.value)}
                                        className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer shrink-0"
                                    />

                                    <input
                                        type="text"
                                        value={sec.label}
                                        onChange={(e) => updateSector(sec.id, 'label', e.target.value)}
                                        placeholder="Название сектора"
                                        className="flex-1 bg-[#121215] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                                    />

                                    <div className="flex items-center gap-1 bg-[#121215] border border-[#2A2A32] rounded-lg px-2 py-1 w-24">
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            value={sec.chance}
                                            onChange={(e) =>
                                                updateSector(sec.id, 'chance', parseFloat(e.target.value) || 0)
                                            }
                                            className="w-full bg-transparent text-xs text-white text-right focus:outline-none"
                                        />
                                        <span className="text-xs text-gray-400">%</span>
                                    </div>

                                    <button
                                        onClick={() => removeSector(sec.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-400 transition cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                            <button
                                onClick={addSector}
                                className="bg-[#18181C] hover:bg-[#222228] border border-[#2A2A32] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                            >
                                <Plus size={14} /> Добавить сектор
                            </button>

                            <button
                                onClick={handleEqualizeChances}
                                className="bg-[#18181C] hover:bg-[#222228] border border-[#2A2A32] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                            >
                                <RotateCcw size={14} /> Разделить 100% поровну
                            </button>

                            <button
                                onClick={handleSaveSectors}
                                className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition uppercase tracking-wider cursor-pointer"
                            >
                                <Save size={14} /> Сохранить
                            </button>
                        </div>
                    </div>
                </div>

                {/* Правая колонка: Пресеты + Статистика + История прокрутов (5 колонок) */}
                <div className="lg:col-span-5 space-y-5">

                    {/* Пресеты */}
                    <div className="bg-[#121215] border border-[#1F1F24] rounded-2xl p-5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1F1F24] pb-3">
                            <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                                Пресеты колёс
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsPresetsCollapsed(!isPresetsCollapsed)}
                                className="p-1.5 bg-[#18181C] hover:bg-[#222228] border border-[#2A2A32] text-gray-400 hover:text-white rounded-xl transition cursor-pointer flex items-center gap-1 text-xs"
                            >
                                {isPresetsCollapsed ? (
                                    <>
                                        <ChevronDown size={14} />
                                        <span>Развернуть</span>
                                    </>
                                ) : (
                                    <>
                                        <ChevronUp size={14} />
                                        <span>Свернуть</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {!isPresetsCollapsed && (
                            <div className="space-y-4 pt-1">
                                <select
                                    value={activePresetId}
                                    onChange={(e) => handleSelectPreset(e.target.value)}
                                    className="w-full bg-[#0A0A0C] border border-[#2A2A32] rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                                >
                                    {presets.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newPresetName}
                                        onChange={(e) => setNewPresetName(e.target.value)}
                                        placeholder="Название нового пресета"
                                        className="flex-1 bg-[#0A0A0C] border border-[#2A2A32] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                                    />
                                    <button
                                        onClick={handleCreatePreset}
                                        className="bg-[#18181C] hover:bg-[#222228] border border-[#2A2A32] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition shrink-0 cursor-pointer"
                                    >
                                        <Plus size={14} /> Создать
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={renamePresetName}
                                        onChange={(e) => setRenamePresetName(e.target.value)}
                                        placeholder="Переименовать пресет"
                                        className="flex-1 bg-[#0A0A0C] border border-[#2A2A32] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                                    />
                                    <button
                                        onClick={handleRenamePreset}
                                        className="bg-[#18181C] hover:bg-[#222228] border border-[#2A2A32] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition shrink-0 cursor-pointer"
                                    >
                                        <Edit3 size={14} /> Обновить
                                    </button>
                                </div>

                                <button
                                    onClick={handleDeletePreset}
                                    className="w-full bg-red-950/40 hover:bg-red-900/50 border border-red-800/50 text-red-400 font-bold py-2 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                                >
                                    <Trash2 size={14} /> Удалить активный пресет
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Статистика выигрышей для ТЕКУЩЕГО КОЛЕСА */}
                    <div className="bg-[#121215] border border-[#1F1F24] rounded-2xl p-5 shadow-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-[#1F1F24] pb-3">
                            <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                                <BarChart3 size={14} className="text-indigo-400" />
                                <span>Статистика секторов</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">
                                Всего роллов: {wheelStats.totalRolls}
                            </span>
                        </div>

                        {wheelStats.totalRolls === 0 ? (
                            <div className="text-center py-3 text-xs text-gray-500 font-mono">
                                Пока нет выпадений для этого колеса
                            </div>
                        ) : (
                            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                                {wheelStats.items.map((stat, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-medium text-gray-200 truncate">{stat.label}</span>
                                            <span className="font-mono font-bold text-indigo-400 shrink-0">
                                                {stat.count} <span className="text-gray-500 text-[10px]">({stat.percentage}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-[#0A0A0C] border border-[#1F1F24] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                                style={{ width: `${stat.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* История прокрутов для ТЕКУЩЕГО КОЛЕСА */}
                    <div className="bg-[#121215] border border-[#1F1F24] rounded-2xl p-5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1F1F24] pb-3">
                            <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                                <History size={14} className="text-amber-400" />
                                <span>История роллов колеса</span>
                            </div>

                            {wheelHistory.length > 0 && (
                                <button
                                    onClick={handleClearHistory}
                                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition cursor-pointer"
                                >
                                    <Trash2 size={12} /> Очистить
                                </button>
                            )}
                        </div>

                        {loadingHistory ? (
                            <div className="flex items-center justify-center py-6 text-gray-500">
                                <Loader2 className="animate-spin text-amber-500 mr-2" size={18} />
                                <span>Загрузка истории...</span>
                            </div>
                        ) : wheelHistory.length === 0 ? (
                            <div className="text-center py-6 text-xs text-gray-500 font-mono">
                                История этого колеса пока пуста
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {wheelHistory.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-[#0A0A0C] border border-[#1F1F24] rounded-xl p-3 flex items-center justify-between gap-3 text-xs group"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-bold text-amber-400 truncate">{item.player_name}</span>
                                            <span className="text-gray-500">→</span>
                                            <span className="font-semibold text-white truncate">{item.prize_label}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="bg-[#18181C] px-2 py-0.5 rounded-md border border-[#2A2A32] text-emerald-400 font-bold font-mono text-[10px]">
                                                {item.sector_chance}%
                                            </span>
                                            <span className="text-gray-500 font-mono text-[10px]">
                                                {new Date(item.created_at).toLocaleString('ru-RU', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteHistoryItem(item.id)}
                                                className="text-gray-500 hover:text-red-400 p-1 rounded-md transition cursor-pointer"
                                                title="Удалить запись"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

            </div>

        </div>
    );
};