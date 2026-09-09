import React, { useState, useEffect } from 'react';
import { WheelConfig, WheelStylePreset } from '../../types/wheel.types';
import { calculateTotalWeight, normalizeWeights, selectWeightedWinner } from '../../lib/wheelUtils';
import { WheelCanvas } from './WheelCanvas';
import { broadcastMessage } from '../../lib/broadcast';
import { supabase } from '../../lib/supabaseClient';

export const WheelManager: React.FC = () => {
    const [winnerName, setWinnerName] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    // Начальное состояние пустой конфигурации
    const [config, setConfig] = useState<WheelConfig>({
        segmentCount: 0,
        segments: [],
        preset: 'default'
    });

    // Загрузка секторов текущего пользователя
    useEffect(() => {
        const loadWheelData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (user?.id) {
                const { data, error } = await supabase
                    .from('wheel_sectors')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true });

                if (!error && data && data.length > 0) {
                    const loadedSegments = data.map(s => ({
                        id: s.id,
                        label: s.label || s.title || '',
                        weight: s.weight || s.chance || 0,
                        color: s.color || '#3b82f6',
                        textColor: s.text_color || '#ffffff'
                    }));

                    setConfig({
                        segmentCount: loadedSegments.length,
                        segments: loadedSegments,
                        preset: 'default'
                    });
                } else {
                    setConfig({
                        segmentCount: 0,
                        segments: [],
                        preset: 'default'
                    });
                }
            }
            setLoading(false);
        };

        loadWheelData();
    }, []);

    const totalWeight = calculateTotalWeight(config.segments);
    const isValid = config.segments.length > 0 && Math.abs(totalWeight - 100) < 0.1;

    // Добавление нового сектора с генерируемым UUID
    const handleAddSector = () => {
        const newSector = {
            id: crypto.randomUUID(),
            label: '',
            weight: 0,
            color: '#3b82f6',
            textColor: '#ffffff'
        };
        setConfig(prev => ({
            ...prev,
            segmentCount: prev.segments.length + 1,
            segments: [...prev.segments, newSector]
        }));
    };

    // Сохранение секторов текущего пользователя
    const handleSaveToDatabase = async (updatedSegments = config.segments) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('wheel_sectors').delete().eq('user_id', user.id);

        if (updatedSegments.length === 0) return;

        const newRows = updatedSegments.map(s => ({
            id: s.id || crypto.randomUUID(),
            user_id: user.id,
            label: s.label,
            weight: s.weight,
            color: s.color,
            text_color: s.textColor || '#ffffff'
        }));

        await supabase.from('wheel_sectors').insert(newRows);
    };

    const handleSegmentChange = (index: number, field: string, value: any) => {
        const updated = [...config.segments];
        updated[index] = { ...updated[index], [field]: value };
        setConfig(prev => ({ ...prev, segments: updated }));
    };

    const handleRemoveSector = (index: number) => {
        const updated = config.segments.filter((_, i) => i !== index);
        setConfig(prev => ({
            ...prev,
            segmentCount: updated.length,
            segments: updated
        }));
    };

    const handleNormalize = async () => {
        const normalized = normalizeWeights(config.segments);
        setConfig(prev => ({ ...prev, segments: normalized }));
        await handleSaveToDatabase(normalized);
    };

    const handleLaunch = async () => {
        if (!isValid) return;

        await handleSaveToDatabase();

        const winningIndex = selectWeightedWinner(config.segments);
        const prizeLabel = config.segments[winningIndex].label;

        broadcastMessage('WHEEL_SPIN_EVENT', {
            winningIndex,
            winnerName: winnerName || 'Зритель',
            prizeLabel,
            config,
            timestamp: Date.now()
        });

        window.open('/overlay/wheel', 'WheelOverlay', 'width=1280,height=720');
    };

    if (loading) {
        return <div className="p-6 text-white text-center text-sm font-mono">Загрузка данных колеса...</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 text-white">
            <div className="lg:col-span-7 space-y-6 bg-gray-900/60 p-6 rounded-2xl border border-gray-800 backdrop-blur-md">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold tracking-wide">НАСТРОЙКИ КОЛЕСА</h2>
                    <button
                        onClick={() => handleSaveToDatabase()}
                        className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                        Сохранить в БД
                    </button>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {config.segments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            Сектора не добавлены. Нажмите «Добавить сектор».
                        </div>
                    ) : (
                        config.segments.map((seg, idx) => (
                            <div key={seg.id || idx} className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                                <span className="text-xs font-mono text-gray-400 w-6">#{idx + 1}</span>
                                <input
                                    type="text"
                                    value={seg.label}
                                    onChange={(e) => handleSegmentChange(idx, 'label', e.target.value)}
                                    placeholder="Название сектора"
                                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 text-white"
                                />
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        value={seg.weight}
                                        onChange={(e) => handleSegmentChange(idx, 'weight', parseFloat(e.target.value) || 0)}
                                        className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-amber-500 text-white"
                                    />
                                    <span className="text-sm text-gray-400">%</span>
                                </div>
                                <input
                                    type="color"
                                    value={seg.color}
                                    onChange={(e) => handleSegmentChange(idx, 'color', e.target.value)}
                                    className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                                />
                                <button
                                    onClick={() => handleRemoveSector(idx)}
                                    className="text-red-400 hover:text-red-300 p-1 text-xs font-bold"
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleAddSector}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl border border-gray-700 transition"
                    >
                        + Добавить сектор
                    </button>
                    {config.segments.length > 0 && !isValid && (
                        <button
                            onClick={handleNormalize}
                            className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition"
                        >
                            Разделить 100% поровну
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/80 border border-gray-700">
                    <span className="text-sm text-gray-400">Сумма шансов:</span>
                    <span className={`font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                        {totalWeight}% / 100%
                    </span>
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-2">Стиль оформления</label>
                    <div className="grid grid-cols-4 gap-2">
                        {(['default', 'neon', 'dark', 'premium'] as WheelStylePreset[]).map(p => (
                            <button
                                key={p}
                                onClick={() => setConfig(prev => ({ ...prev, preset: p }))}
                                className={`py-2 text-xs font-bold uppercase rounded-xl border transition ${config.preset === p
                                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                                    : 'border-gray-800 bg-gray-800/40 text-gray-400 hover:bg-gray-800'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-800 space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Ник зрителя</label>
                        <input
                            type="text"
                            value={winnerName}
                            onChange={(e) => setWinnerName(e.target.value)}
                            placeholder="Ник зрителя"
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 text-white"
                        />
                    </div>

                    <button
                        onClick={handleLaunch}
                        disabled={!isValid}
                        className={`w-full py-4 rounded-xl font-bold tracking-wider text-lg transition shadow-lg ${isValid
                            ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25 active:scale-[0.99] cursor-pointer'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        КРУТИТЬ КОЛЕСО
                    </button>
                </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-gray-900/30 p-8 rounded-2xl border border-gray-800/50">
                <h3 className="text-xs font-semibold text-gray-500 tracking-wider mb-8">ПРОСМОТР</h3>
                <WheelCanvas config={config} size={360} />
            </div>
        </div>
    );
};