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
    BarChart3,
    Lock
} from 'lucide-react';

interface WheelPresetDB {
    id: string;
    name: string;
    sectors: WheelSector[];
    user_id?: string;
}

interface WheelHistoryItem {
    id: string;
    created_at: string;
    player_name: string;
    prize_label: string;
    sector_chance: number;
    preset_id?: string;
    user_id?: string;
}

const DEFAULT_COLORS = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export const WheelControlPage: React.FC = () => {
    const navigate = useNavigate();
    const [playerName, setPlayerName] = useState('');
    const [obsToken, setObsToken] = useState<string | null>(null);

    const [presets, setPresets] = useState<WheelPresetDB[]>([]);
    const [activePresetId, setActivePresetId] = useState<string>('');
    const [newPresetName, setNewPresetName] = useState('');
    const [renamePresetName, setRenamePresetName] = useState('');
    const [loading, setLoading] = useState(true);

    const [isPresetsCollapsed, setIsPresetsCollapsed] = useState(false);

    const [sectors, setSectors] = useState<WheelSector[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [copied, setCopied] = useState(false);

    const [wheelHistory, setWheelHistory] = useState<WheelHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchUserData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('obs_token')
                .eq('id', user.id)
                .maybeSingle();

            if (profile?.obs_token) {
                setObsToken(profile.obs_token);
            } else {
                const newToken = crypto.randomUUID().replace(/-/g, '');
                await supabase
                    .from('profiles')
                    .upsert({ id: user.id, obs_token: newToken });
                setObsToken(newToken);
            }

            const { data, error } = await supabase
                .from('wheel_presets')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (!error && data && data.length > 0) {
                setPresets(data);
                if (!activePresetId) {
                    setActivePresetId(data[0].id);
                    setSectors(data[0].sectors || []);
                    setRenamePresetName(data[0].name);
                }
            } else {
                setPresets([]);
                setActivePresetId('');
                setSectors([]);
                setRenamePresetName('');
            }
        }
        setLoading(false);
    };

    const fetchWheelHistory = async (presetId: string) => {
        if (!presetId) {
            setWheelHistory([]);
            return;
        }
        setLoadingHistory(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.id) {
            const { data, error } = await supabase
                .from('wheel_history')
                .select('*')
                .eq('preset_id', presetId)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(100);

            if (!error && data) {
                setWheelHistory(data);
            }
        }
        setLoadingHistory(false);
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    useEffect(() => {
        if (activePresetId) {
            fetchWheelHistory(activePresetId);
        } else {
            setWheelHistory([]);
        }
    }, [activePresetId]);

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const initialSectors: WheelSector[] = [
            { id: crypto.randomUUID(), label: 'Приз 1', color: '#F59E0B', chance: 50 },
            { id: crypto.randomUUID(), label: 'Приз 2', color: '#3B82F6', chance: 50 },
        ];

        const { data, error } = await supabase
            .from('wheel_presets')
            .insert([{ name: newPresetName.trim(), sectors: initialSectors, user_id: user.id }])
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('wheel_presets')
            .update({ name: renamePresetName.trim() })
            .eq('id', activePresetId)
            .eq('user_id', user.id);

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (!confirm('Вы уверены, что хотите удалить этот пресет?')) return;

        await supabase.from('wheel_history').delete().eq('preset_id', activePresetId).eq('user_id', user.id);

        const { error } = await supabase
            .from('wheel_presets')
            .delete()
            .eq('id', activePresetId)
            .eq('user_id', user.id);

        if (error) {
            alert('Ошибка при удалении пресета: ' + error.message);
        } else {
            const filtered = presets.filter((p) => p.id !== activePresetId);
            setPresets(filtered);
            if (filtered.length > 0) {
                setActivePresetId(filtered[0].id);
                setSectors(filtered[0].sectors || []);
                setRenamePresetName(filtered[0].name);
            } else {
                setActivePresetId('');
                setSectors([]);
                setRenamePresetName('');
            }
        }
    };

    const handleSaveSectors = async () => {
        if (!activePresetId) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('wheel_presets')
            .update({ sectors })
            .eq('id', activePresetId)
            .eq('user_id', user.id);

        if (error) {
            alert('Ошибка сохранения секторов: ' + error.message);
        } else {
            setPresets(
                presets.map((p) =>
                    p.id === activePresetId ? { ...p, sectors } : p
                )
            );
            alert('Секторы успешно сохранены!');
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
                id: crypto.randomUUID(),
                label: `Сектор ${sectors.length + 1}`,
                color: nextColor,
                chance: 0,
            },
        ]);
    };

    const removeSector = (id: string) => {
        setSectors(sectors.filter((s) => s.id !== id));
    };

    const updateSector = (id: string, field: keyof WheelSector, value: any) => {
        setSectors(
            sectors.map((s) => (s.id === id ? { ...s, [field]: value } : s))
        );
    };

    const getRandomWinnerIndex = (): number => {
        const total = sectors.reduce((sum, s) => sum + Number(s.chance || 0), 0);
        let rand = Math.random() * total;

        for (let i = 0; i < sectors.length; i++) {
            if (rand < sectors[i].chance) {
                return i;
            }
            rand -= sectors[i].chance;
        }
        return 0;
    };

    const handleLaunchWheel = async () => {
        if (sectors.length < 2 || !activePresetId || isSpinning || !obsToken) return;
        const { data: { user } } = await supabase.auth.getUser();

        setIsSpinning(true);
        const winningIndex = getRandomWinnerIndex();
        const winningSector = sectors[winningIndex];
        const currentPlayer = playerName.trim() || 'Зритель';

        try {
            const { error: dbError } = await supabase
                .from('wheel_history')
                .insert([
                    {
                        user_id: user?.id || null,
                        preset_id: activePresetId,
                        player_name: currentPlayer,
                        prize_label: winningSector.label,
                        sector_chance: winningSector.chance
                    }
                ]);

            if (!dbError) {
                fetchWheelHistory(activePresetId);
            }
        } catch (err) {
            console.error('Ошибка записи wheel_history:', err);
        }

        const payload = {
            userId: user?.id,
            playerName: currentPlayer,
            winningSectorId: winningSector.id,
            sectors: sectors,
            durationMs: 6000
        };

        const channelName = `wheel_events_${obsToken}`;
        const channel = supabase.channel(channelName);

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                channel.send({
                    type: 'broadcast',
                    event: 'START_SPIN',
                    payload,
                }).then(() => {
                    window.setTimeout(() => {
                        try {
                            supabase.removeChannel(channel);
                        } catch (e) {
                            console.warn('Ошибка отключения канала:', e);
                        }
                    }, 500);
                });
            }
        });

        window.setTimeout(() => {
            setIsSpinning(false);
        }, 11000);
    };

    const handleClearHistory = async () => {
        if (!activePresetId) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (!confirm('Вы уверены, что хотите очистить всю историю для этого колеса?')) return;

        const { error } = await supabase
            .from('wheel_history')
            .delete()
            .eq('preset_id', activePresetId)
            .eq('user_id', user.id);

        if (error) {
            alert('Ошибка при очистке истории: ' + error.message);
        } else {
            setWheelHistory([]);
        }
    };

    const handleDeleteHistoryItem = async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('wheel_history')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            alert('Ошибка при удалении записи: ' + error.message);
        } else {
            setWheelHistory(wheelHistory.filter((item) => item.id !== id));
        }
    };

    const copyOBSLink = () => {
        if (!obsToken) return;
        const url = `${window.location.origin}/wheel/overlay?token=${obsToken}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
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
                        disabled={!obsToken}
                        className="bg-[#18181C] hover:bg-[#222228] border border-[#2A2A32] text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-white transition cursor-pointer disabled:opacity-50"
                    >
                        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        {copied ? 'Скопировано!' : 'Ссылка для OBS'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-7 space-y-5">
                    {/* Блок: Управление */}
                    <div className="relative bg-[#121215] border border-[#1F1F24] rounded-2xl p-5 shadow-xl space-y-3 overflow-hidden">
                        <label className="block text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                            Управление
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Ник зрителя"
                                disabled={!activePresetId}
                                className="flex-1 bg-[#0A0A0C] border border-[#2A2A32] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-40"
                            />
                            <button
                                onClick={handleLaunchWheel}
                                disabled={!activePresetId || isSpinning || sectors.length < 2 || totalChance !== 100}
                                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-amber-500/20"
                            >
                                <Play size={14} className="fill-black" />
                                {isSpinning ? 'Вращение...' : 'Крутить колесо'}
                            </button>
                        </div>

                        {/* Заглушка, если нет активного пресета */}
                        {!activePresetId && (
                            <div className="absolute inset-0 bg-[#121215]/90 backdrop-blur-[2px] z-10 flex items-center justify-center p-4">
                                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-semibold bg-[#18181C] border border-amber-500/30 px-4 py-2 rounded-xl shadow-lg">
                                    <Lock size={14} />
                                    <span>Создайте или выберите пресет колеса</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Блок: Секторы и шанс выпадения */}
                    <div className="relative bg-[#121215] border border-[#1F1F24] rounded-2xl p-5 shadow-xl space-y-4 overflow-hidden">
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
                            {sectors.length === 0 ? (
                                <div className="text-center py-6 text-xs text-gray-500 font-mono">
                                    Нет доступных секторов. Создайте пресет или добавьте сектор.
                                </div>
                            ) : (
                                sectors.map((sec) => (
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
                                ))
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                            <button
                                onClick={addSector}
                                disabled={!activePresetId}
                                className="bg-[#18181C] hover:bg-[#222228] border border-[#2A2A32] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40"
                            >
                                <Plus size={14} /> Добавить сектор
                            </button>

                            <button
                                onClick={handleEqualizeChances}
                                disabled={!activePresetId}
                                className="bg-[#18181C] hover:bg-[#222228] border border-[#2A2A32] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40"
                            >
                                <RotateCcw size={14} /> Разделить 100% поровну
                            </button>

                            <button
                                onClick={handleSaveSectors}
                                disabled={!activePresetId}
                                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition uppercase tracking-wider cursor-pointer"
                            >
                                <Save size={14} /> Сохранить
                            </button>
                        </div>

                        {/* Заглушка, если нет активного пресета */}
                        {!activePresetId && (
                            <div className="absolute inset-0 bg-[#121215]/90 backdrop-blur-[2px] z-10 flex items-center justify-center p-4">
                                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-semibold bg-[#18181C] border border-amber-500/30 px-4 py-2 rounded-xl shadow-lg">
                                    <Lock size={14} />
                                    <span>Создайте или выберите пресет колеса</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-5 space-y-5">
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
                                {presets.length > 0 ? (
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
                                ) : (
                                    <div className="text-xs text-gray-500 font-mono">
                                        Нет созданных пресетов.
                                    </div>
                                )}

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

                                {activePresetId && (
                                    <>
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
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-[#121215] border border-[#1F1F24] rounded-2xl p-5 shadow-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-[#1F1F24] pb-3">
                            <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                                <BarChart3 size={14} className="text-indigo-400" />
                                <span>Статистика</span>
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

                    <div className="bg-[#121215] border border-[#1F1F24] rounded-2xl p-5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1F1F24] pb-3">
                            <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                                <History size={14} className="text-amber-400" />
                                <span>История</span>
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