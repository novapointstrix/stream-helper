import React, { useState, useEffect } from 'react';
import { WheelConfig, WheelStylePreset } from '../../types/wheel.types';
import { calculateTotalWeight, generateDefaultSegments, normalizeWeights, selectWeightedWinner } from '../../lib/wheelUtils';
import { WheelCanvas } from './WheelCanvas';
import { broadcastMessage } from '../../lib/broadcast';

const STORAGE_KEY = 'wheel_config_data';

export const WheelManager: React.FC = () => {
    const [winnerName, setWinnerName] = useState<string>('@username');
    const [config, setConfig] = useState<WheelConfig>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return {
            segmentCount: 8,
            segments: generateDefaultSegments(8),
            preset: 'default'
        };
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }, [config]);

    const totalWeight = calculateTotalWeight(config.segments);
    const isValid = Math.abs(totalWeight - 100) < 0.1;

    const handleSegmentCountChange = (count: number) => {
        setConfig(prev => ({
            ...prev,
            segmentCount: count,
            segments: generateDefaultSegments(count)
        }));
    };

    const handleSegmentChange = (index: number, field: string, value: any) => {
        const updated = [...config.segments];
        updated[index] = { ...updated[index], [field]: value };
        setConfig(prev => ({ ...prev, segments: updated }));
    };

    const handleNormalize = () => {
        setConfig(prev => ({ ...prev, segments: normalizeWeights(prev.segments) }));
    };

    const handleLaunch = () => {
        if (!isValid) return;

        // 1. Взвешенный случайный выбор
        const winningIndex = selectWeightedWinner(config.segments);
        const prizeLabel = config.segments[winningIndex].label;

        // 2. Сигнал через BroadcastChannel для OBS
        broadcastMessage('WHEEL_SPIN_EVENT', {
            winningIndex,
            winnerName,
            prizeLabel,
            config,
            timestamp: Date.now()
        });

        // 3. Открытие отдельного окна для проверки
        window.open('/overlay/wheel', 'WheelOverlay', 'width=1280,height=720');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 text-white">
            {/* Панель настроек */}
            <div className="lg:col-span-7 space-y-6 bg-gray-900/60 p-6 rounded-2xl border border-gray-800 backdrop-blur-md">
                <h2 className="text-xl font-bold tracking-wide">НАСТРОЙКИ КОЛЕСА</h2>

                {/* Выбор количества сегментов */}
                <div>
                    <label className="block text-sm text-gray-400 mb-2">Количество сегментов</label>
                    <div className="flex flex-wrap gap-2">
                        {[4, 6, 8, 10, 12, 16].map(count => (
                            <button
                                key={count}
                                onClick={() => handleSegmentCountChange(count)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${config.segmentCount === count
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                                    }`}
                            >
                                {count}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Список сегментов */}
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {config.segments.map((seg, idx) => (
                        <div key={seg.id || idx} className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                            <span className="text-xs font-mono text-gray-400 w-6">#{idx + 1}</span>
                            <input
                                type="text"
                                value={seg.label}
                                onChange={(e) => handleSegmentChange(idx, 'label', e.target.value)}
                                placeholder="Приз"
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    value={seg.weight}
                                    onChange={(e) => handleSegmentChange(idx, 'weight', parseFloat(e.target.value) || 0)}
                                    className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-indigo-500"
                                />
                                <span className="text-sm text-gray-400">%</span>
                            </div>
                            <input
                                type="color"
                                value={seg.color}
                                onChange={(e) => handleSegmentChange(idx, 'color', e.target.value)}
                                className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                            />
                        </div>
                    ))}
                </div>

                {/* Проверка суммы шансов */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/80 border border-gray-700">
                    <div>
                        <span className="text-sm text-gray-400">Сумма шансов: </span>
                        <span className={`font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                            {totalWeight}%
                        </span>
                    </div>
                    {!isValid && (
                        <button
                            onClick={handleNormalize}
                            className="text-xs bg-indigo-600/80 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition"
                        >
                            Сбалансировать до 100%
                        </button>
                    )}
                </div>

                {/* Выбор визуального стиля */}
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

                {/* Никнейм и запуск */}
                <div className="pt-4 border-t border-gray-800 space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Никнейм победителя</label>
                        <input
                            type="text"
                            value={winnerName}
                            onChange={(e) => setWinnerName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <button
                        onClick={handleLaunch}
                        disabled={!isValid}
                        className={`w-full py-4 rounded-xl font-bold tracking-wider text-lg transition shadow-lg ${isValid
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-500/25 active:scale-[0.99]'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        ЗАПУСТИТЬ КОЛЕСО
                    </button>
                </div>
            </div>

            {/* Live Preview */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-gray-900/30 p-8 rounded-2xl border border-gray-800/50">
                <h3 className="text-xs font-semibold text-gray-500 tracking-wider mb-8">LIVE PREVIEW</h3>
                <WheelCanvas config={config} size={360} />
            </div>
        </div>
    );
};