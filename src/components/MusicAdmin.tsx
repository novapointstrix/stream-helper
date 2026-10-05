import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Play, Pause, Volume2, Copy, Check, Plus, Music2 } from 'lucide-react';

export const MusicAdmin: React.FC = () => {
    const [widgets, setWidgets] = useState<any[]>([]);
    const [activeWidget, setActiveWidget] = useState<any | null>(null);
    const [inputUrl, setInputUrl] = useState('');
    const [copied, setCopied] = useState(false);

    // Достает 11-значный ID из любых ссылок (desktop, mobile, shorts, youtu.be)
    const parseYouTubeId = (url: string): string | null => {
        const cleanUrl = url.trim();
        const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
        const match = cleanUrl.match(regExp);
        return match ? match[1] : null;
    };

    const loadWidgets = async () => {
        const { data } = await supabase
            .from('music_widgets')
            .select('*')
            .order('updated_at', { ascending: false });

        if (data && data.length > 0) {
            setWidgets(data);
            if (!activeWidget) {
                setActiveWidget(data[0]);
            } else {
                const found = data.find((w: any) => w.id === activeWidget.id);
                if (found) setActiveWidget(found);
            }
        }
    };

    useEffect(() => {
        loadWidgets();
    }, []);

    const createWidget = async () => {
        const name = prompt('Название виджета (например, "Музыка на стриме"):', 'Стрим Музыка');
        if (!name) return;

        const { data } = await supabase
            .from('music_widgets')
            .insert([{ name, volume: 50, status: 'paused', youtube_video_id: '' }])
            .select()
            .single();

        if (data) {
            setWidgets([data, ...widgets]);
            setActiveWidget(data);
        }
    };

    const updateWidget = async (updates: Partial<any>) => {
        if (!activeWidget) return;

        const { data } = await supabase
            .from('music_widgets')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', activeWidget.id)
            .select()
            .single();

        if (data) {
            setActiveWidget(data);
            setWidgets(widgets.map((w) => (w.id === data.id ? data : w)));
        }
    };

    const handlePlayUrl = () => {
        const videoId = parseYouTubeId(inputUrl);
        if (!videoId) {
            alert('Вставьте корректную ссылку на YouTube видео!');
            return;
        }
        updateWidget({ youtube_video_id: videoId, status: 'playing' });
        setInputUrl('');
    };

    const copyWidgetUrl = () => {
        if (!activeWidget) return;
        const url = `${window.location.origin}/widget/music/${activeWidget.id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                            <Music2 size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Управление музыкой в OBS</h1>
                            <p className="text-xs text-zinc-400">Включай треки стримеру в реальном времени</p>
                        </div>
                    </div>
                    <button
                        onClick={createWidget}
                        className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition"
                    >
                        <Plus size={16} /> Создать виджет
                    </button>
                </div>

                {/* Переключение между виджетами */}
                {widgets.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {widgets.map((w) => (
                            <button
                                key={w.id}
                                onClick={() => setActiveWidget(w)}
                                className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition border ${activeWidget?.id === w.id
                                    ? 'bg-zinc-800 border-violet-500 text-white font-medium'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                {w.name}
                            </button>
                        ))}
                    </div>
                )}

                {activeWidget ? (
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">

                        {/* Ссылка для OBS */}
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Ссылка для OBS Browser Source
                                </span>
                                <p className="text-xs font-mono text-zinc-300 mt-1 select-all break-all">
                                    {window.location.origin}/widget/music/{activeWidget.id}
                                </p>
                            </div>
                            <button
                                onClick={copyWidgetUrl}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3.5 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition shrink-0"
                            >
                                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                {copied ? 'Скопировано' : 'Копировать'}
                            </button>
                        </div>

                        {/* Ввод ссылки */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">
                                Вставить ссылку на YouTube
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    placeholder="https://www.youtube.com/watch?v=... или https://youtu.be/..."
                                    value={inputUrl}
                                    onChange={(e) => setInputUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handlePlayUrl()}
                                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-violet-500 transition"
                                />
                                <button
                                    onClick={handlePlayUrl}
                                    className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition"
                                >
                                    <Play size={16} /> Включить
                                </button>
                            </div>
                        </div>

                        {/* Элементы управления */}
                        <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <button
                                    onClick={() =>
                                        updateWidget({
                                            status: activeWidget.status === 'playing' ? 'paused' : 'playing',
                                        })
                                    }
                                    className="w-12 h-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition shadow-lg shrink-0"
                                >
                                    {activeWidget.status === 'playing' ? <Pause size={20} /> : <Play size={20} />}
                                </button>
                                <div className="truncate">
                                    <div className="text-sm font-medium text-zinc-200">
                                        {activeWidget.status === 'playing' ? 'Играет' : 'Пауза'}
                                    </div>
                                    <div className="text-xs text-zinc-500 truncate">
                                        ID: {activeWidget.youtube_video_id || 'нет трека'}
                                    </div>
                                </div>
                            </div>

                            {/* Громкость */}
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <Volume2 size={18} className="text-zinc-400" />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={activeWidget.volume}
                                    onChange={(e) => updateWidget({ volume: Number(e.target.value) })}
                                    className="w-32 accent-violet-500 cursor-pointer"
                                />
                                <span className="text-xs font-mono text-zinc-400 w-8 text-right">
                                    {activeWidget.volume}%
                                </span>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-sm">
                        Нет активных виджетов. Нажмите «Создать виджет».
                    </div>
                )}
            </div>
        </div>
    );
};