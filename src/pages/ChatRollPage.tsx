import React, { useState, useEffect, useRef } from 'react';
import { KickChatListener, KickChatMessage } from '../lib/kickClient';
import { calculateParticipantWeight, pickWeightedWinner, getBroadcasterByUsername } from '../services/rollService';
import { RollParticipant } from '../types/chatRoll';
import {
    Play, RotateCcw, ArrowLeft, Users, Trophy, Clock,
    Sparkles, History, Search, Radio, CheckCircle2, ShieldAlert, Infinity, Square
} from 'lucide-react';

const STORAGE_KEY = 'chat_roll_state_v1';

export const ChatRollPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    // Настройки ролла
    const [streamerChannel, setStreamerChannel] = useState('');
    const [keyword, setKeyword] = useState('!roll');
    const [useTimer, setUseTimer] = useState(false);
    const [duration, setDuration] = useState(60);

    // Состояния процесса
    const [loadingChannel, setLoadingChannel] = useState(false);
    const [channelError, setChannelError] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [activeBroadcasterId, setActiveBroadcasterId] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    // Данные ролла
    const [participants, setParticipants] = useState<RollParticipant[]>([]);
    const [messagesCount, setMessagesCount] = useState(0);
    const [winner, setWinner] = useState<RollParticipant | null>(null);
    const [excludedWinners, setExcludedWinners] = useState<Set<string>>(new Set());

    // История запусков
    const [history, setHistory] = useState<Array<{
        id: string;
        channel: string;
        keyword: string;
        winner: string;
        participantsCount: number;
        date: string;
    }>>([]);

    const listenerRef = useRef<KickChatListener | null>(null);
    const keywordRef = useRef(keyword);
    useEffect(() => {
        keywordRef.current = keyword;
    }, [keyword]);

    const multipliers = {
        normal: 1.0,
        vip: 2.0,
        sub: 2.0,
        vipSub: 3.0,
    };

    // 1. Восстановление состояния из LocalStorage при загрузке
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setStreamerChannel(parsed?.streamerChannel || '');
                setKeyword(parsed?.keyword || '!roll');
                setUseTimer(parsed?.useTimer || false);
                setDuration(parsed?.duration || 60);
                setParticipants(parsed?.participants || []);
                setMessagesCount(parsed?.messagesCount || 0);
                setIsActive(parsed?.isActive || false);
                setActiveBroadcasterId(parsed?.activeBroadcasterId ?? null);
                setWinner(parsed?.winner || null);
                setHistory(parsed?.history || []);
            }
        } catch (e) {
            console.error('Ошибка чтения из localStorage:', e);
        }
    }, []);

    // 2. Сохранение состояния в LocalStorage при изменениях
    useEffect(() => {
        const stateToSave = {
            streamerChannel,
            keyword,
            useTimer,
            duration,
            participants,
            messagesCount,
            isActive,
            activeBroadcasterId,
            winner,
            history
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [streamerChannel, keyword, useTimer, duration, participants, messagesCount, isActive, activeBroadcasterId, winner, history]);

    // Функция подключения к чату Kick через SSE
    const connectToChat = async (broadcasterUserId: number) => {
        if (listenerRef.current) {
            await listenerRef.current.disconnect();
        }

        const listener = new KickChatListener();
        listenerRef.current = listener;

        await listener.connect(broadcasterUserId, (msg: KickChatMessage) => {
            setMessagesCount(prev => prev + 1);

            const cleanMsg = msg?.content?.trim().toLowerCase() || '';
            const cleanKw = keywordRef.current?.trim().toLowerCase() || '';

            if (cleanMsg && cleanKw && cleanMsg === cleanKw) {
                const isVip = msg?.sender?.is_vip ?? false;
                const isSub = msg?.sender?.is_subscriber ?? false;
                const weight = calculateParticipantWeight(isVip, isSub, multipliers);

                setParticipants(prev => {
                    if (prev.some(p => p.kick_user_id === msg.sender.id)) {
                        return prev;
                    }
                    return [
                        ...prev,
                        {
                            id: Math.random().toString(),
                            roll_id: 'active',
                            user_id: 'current',
                            kick_user_id: msg.sender.id,
                            kick_username: msg.sender.username,
                            display_name: msg.sender.username,
                            is_vip: isVip,
                            is_subscriber: isSub,
                            chance_weight: weight,
                            joined_at: new Date().toISOString(),
                            eligible: true,
                        }
                    ];
                });
            }
        });
    };

    useEffect(() => {
        if (isActive && activeBroadcasterId) {
            connectToChat(activeBroadcasterId);
        }
        return () => {
            if (listenerRef.current) listenerRef.current.disconnect();
        };
    }, [isActive, activeBroadcasterId]);

    // Запуск сбора
    const handleStartRoll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!streamerChannel.trim()) {
            setChannelError('Введите никнейм или ссылку на канал');
            return;
        }

        setChannelError('');
        setLoadingChannel(true);

        const broadcaster = await getBroadcasterByUsername(streamerChannel);
        setLoadingChannel(false);

        if (!broadcaster) {
            setChannelError('Не удалось найти канал Kick. Проверьте правильность ника.');
            return;
        }

        setParticipants([]);
        setMessagesCount(0);
        setWinner(null);
        setExcludedWinners(new Set());
        setTimeLeft(useTimer ? duration : 0);

        setActiveBroadcasterId(broadcaster.broadcasterUserId);
        setIsActive(true);
    };

    // Обратный отсчет
    useEffect(() => {
        if (!isActive || !useTimer || timeLeft <= 0) {
            if (isActive && useTimer && timeLeft === 0) {
                finishRoll();
            }
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [isActive, useTimer, timeLeft]);

    // Завершение сбора
    const finishRoll = () => {
        setIsActive(false);
        if (listenerRef.current) {
            listenerRef.current.disconnect();
        }
        handlePickWinner();
    };

    // Выбор победителя
    const handlePickWinner = () => {
        const picked = pickWeightedWinner(participants, excludedWinners);
        if (picked) {
            setWinner(picked);
            setHistory(prev => [
                {
                    id: Math.random().toString(),
                    channel: streamerChannel,
                    keyword: keyword,
                    winner: picked.kick_username,
                    participantsCount: participants.length,
                    date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                },
                ...prev
            ]);
        }
    };

    const handleReroll = () => {
        if (winner) {
            setExcludedWinners(prev => new Set(prev).add(winner.kick_user_id));
        }
        handlePickWinner();
    };

    const resetRollData = () => {
        setIsActive(false);
        setActiveBroadcasterId(null);
        setParticipants([]);
        setWinner(null);
        if (listenerRef.current) listenerRef.current.disconnect();
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <div className="w-full min-h-screen bg-[#0A0A0C] text-white p-4 sm:p-8 font-sans space-y-6">

            {/* Верхняя навигация */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#121215] border border-[#1F1F24] p-4 sm:p-6 rounded-2xl shadow-xl">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2.5 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] rounded-xl transition text-zinc-300 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                        <ArrowLeft size={16} /> Назад
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                            🎲 CHAT ROLL <span className="text-amber-500 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 font-mono">KICK LIVE</span>
                        </h1>
                    </div>
                </div>

                {isActive && (
                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-xl text-red-400 animate-pulse">
                        <Radio size={18} className="animate-spin" />
                        <span className="font-mono font-bold text-sm">
                            {useTimer ? `СБОР: ${timeLeft}s` : 'ИДЕТ СБОР (БЕЗ ТАЙМЕРА)'}
                        </span>
                        <button
                            onClick={finishRoll}
                            className="ml-2 text-xs bg-red-500 hover:bg-red-600 text-black font-extrabold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                            <Square size={12} fill="currentColor" /> СТОП И ВЫБРАТЬ
                        </button>
                    </div>
                )}
            </div>

            {/* ЭКРАН 1: Панель создания ролла и история */}
            {!isActive && participants.length === 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Форма запуска */}
                    <div className="lg:col-span-2 bg-[#121215] border border-[#1F1F24] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
                        <div className="flex items-center gap-3 border-b border-[#1F1F24] pb-4">
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold">Параметры нового ролла</h2>
                                <p className="text-xs text-zinc-400">Укажите никнейм или ссылку на канал Kick и кодовое слово</p>
                            </div>
                        </div>

                        <form onSubmit={handleStartRoll} className="space-y-5">
                            <div>
                                <label className="block text-xs font-mono text-zinc-400 uppercase mb-2">
                                    Никнейм или Ссылка на Kick
                                </label>
                                <input
                                    type="text"
                                    value={streamerChannel}
                                    onChange={e => setStreamerChannel(e.target.value)}
                                    placeholder="name или https://kick.com/name"
                                    className="w-full bg-[#0A0A0C] border border-[#27272A] focus:border-amber-500 rounded-xl px-4 py-3.5 text-sm text-white font-bold placeholder-zinc-600 focus:outline-none transition"
                                />
                                {channelError && (
                                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1 font-medium">
                                        <ShieldAlert size={14} /> {channelError}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono text-zinc-400 uppercase mb-2">
                                        Кодовое слово (на любом языке)
                                    </label>
                                    <input
                                        type="text"
                                        value={keyword}
                                        onChange={e => setKeyword(e.target.value)}
                                        placeholder="!roll или рулетка"
                                        className="w-full bg-[#0A0A0C] border border-[#27272A] focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-white font-mono font-bold focus:outline-none transition"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-mono text-zinc-400 uppercase">
                                            Таймер сбора
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setUseTimer(!useTimer)}
                                            className="text-[10px] font-mono text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                                        >
                                            {useTimer ? <Clock size={12} /> : <Infinity size={12} />}
                                            {useTimer ? 'Включен' : 'Без таймера (по умолчанию)'}
                                        </button>
                                    </div>

                                    {useTimer ? (
                                        <input
                                            type="number"
                                            value={duration}
                                            onChange={e => setDuration(Number(e.target.value))}
                                            placeholder="Секунды"
                                            className="w-full bg-[#0A0A0C] border border-[#27272A] focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-white font-mono font-bold focus:outline-none transition"
                                        />
                                    ) : (
                                        <div className="w-full bg-[#0A0A0C]/50 border border-[#27272A] rounded-xl px-4 py-3 text-xs text-zinc-500 font-mono flex items-center justify-between">
                                            <span>Без ограничения по времени</span>
                                            <Infinity size={16} className="text-amber-500/50" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loadingChannel}
                                className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-extrabold py-4 rounded-xl text-sm uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                            >
                                {loadingChannel ? (
                                    <>Поиск чата стримера...</>
                                ) : (
                                    <>
                                        <Play size={18} fill="currentColor" /> Начать сбор участников
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* История */}
                    <div className="bg-[#121215] border border-[#1F1F24] rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 border-b border-[#1F1F24] pb-4 mb-4">
                                <div className="p-2.5 bg-zinc-800 text-zinc-300 rounded-xl">
                                    <History size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold">История сессий</h2>
                                    <p className="text-xs text-zinc-500">Прошлые победители</p>
                                </div>
                            </div>

                            <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1">
                                {history.length === 0 ? (
                                    <div className="text-center py-12 text-zinc-600 text-xs font-mono">
                                        История пуста
                                    </div>
                                ) : (
                                    history.map((item) => (
                                        <div key={item.id} className="bg-[#18181B] border border-[#27272A] p-3 rounded-xl space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-amber-400">@{item.channel}</span>
                                                <span className="text-[10px] font-mono text-zinc-500">{item.date}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-zinc-300">
                                                <span>Победитель: <strong className="text-white">@{item.winner}</strong></span>
                                                <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">{item.participantsCount} уч.</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ЭКРАН 2: Полноэкранный монитор активного сбора */}
            {(isActive || participants.length > 0) && (
                <div className="space-y-6">

                    {/* Метрики */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#121215] border border-[#1F1F24] p-5 rounded-2xl flex items-center justify-between shadow-lg">
                            <div>
                                <div className="text-xs font-mono text-zinc-400 uppercase">Канал Kick</div>
                                <div className="text-xl font-bold text-amber-400">@{streamerChannel}</div>
                            </div>
                            <Search size={28} className="text-zinc-700" />
                        </div>

                        <div className="bg-[#121215] border border-[#1F1F24] p-5 rounded-2xl flex items-center justify-between shadow-lg">
                            <div>
                                <div className="text-xs font-mono text-zinc-400 uppercase">Участники («{keyword}»)</div>
                                <div className="text-2xl font-black text-white">{participants.length}</div>
                            </div>
                            <Users size={28} className="text-amber-500/40" />
                        </div>

                        <div className="bg-[#121215] border border-[#1F1F24] p-5 rounded-2xl flex items-center justify-between shadow-lg">
                            <div>
                                <div className="text-xs font-mono text-zinc-400 uppercase">Всего сообщений</div>
                                <div className="text-2xl font-black text-zinc-300">{messagesCount}</div>
                            </div>
                            <Clock size={28} className="text-zinc-700" />
                        </div>
                    </div>

                    {/* Таблица в реальном времени */}
                    <div className="bg-[#121215] border border-[#1F1F24] rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1F1F24] pb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Users size={20} className="text-amber-500" /> Собранные участники
                            </h3>
                            <div className="flex gap-2">
                                {isActive && (
                                    <button
                                        onClick={finishRoll}
                                        className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-3 py-1.5 rounded-xl transition cursor-pointer"
                                    >
                                        Остановись и выбрать победителя
                                    </button>
                                )}
                                <button
                                    onClick={resetRollData}
                                    className="text-xs bg-[#18181B] hover:bg-zinc-800 border border-[#27272A] px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white transition cursor-pointer"
                                >
                                    Сбросить ролл
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#1F1F24] text-xs font-mono text-zinc-500 uppercase">
                                        <th className="pb-3 font-medium">Никнейм Kick</th>
                                        <th className="pb-3 font-medium">Бейджи</th>
                                        <th className="pb-3 font-medium">Множитель шанса</th>
                                        <th className="pb-3 font-medium text-right">Время входа</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1F1F24]/60">
                                    {participants.map((p) => (
                                        <tr key={p.kick_user_id} className="hover:bg-[#18181B]/50 transition">
                                            <td className="py-3 font-bold text-white flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                {p.kick_username}
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {p.is_vip && (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                            VIP
                                                        </span>
                                                    )}
                                                    {p.is_subscriber && (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                            SUB
                                                        </span>
                                                    )}
                                                    {!p.is_vip && !p.is_subscriber && (
                                                        <span className="text-xs text-zinc-600">Зритель</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 font-mono font-bold text-amber-400">
                                                {p.chance_weight}x
                                            </td>
                                            <td className="py-3 font-mono text-xs text-zinc-500 text-right">
                                                {new Date(p.joined_at).toLocaleTimeString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {participants.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-zinc-500 text-xs font-mono">
                                                Ожидание сообщений «{keyword}» в чате @{streamerChannel}...
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Всплывающее окно Победителя */}
            {winner && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="max-w-lg w-full bg-[#121215] border border-amber-500/40 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>

                        <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-center mx-auto text-amber-400 shadow-xl">
                            <Trophy size={36} />
                        </div>

                        <div>
                            <span className="text-xs font-mono text-amber-500 uppercase tracking-widest">Победитель выбран!</span>
                            <h2 className="text-3xl font-black text-white mt-1">@{winner.kick_username}</h2>
                        </div>

                        <div className="py-3 px-4 rounded-xl bg-[#0A0A0C] border border-[#1F1F24] flex items-center justify-around text-xs text-zinc-400 font-mono">
                            <span>Шанс: <strong className="text-amber-400">{winner.chance_weight}x</strong></span>
                            <span>Канал: <strong className="text-white">@{streamerChannel}</strong></span>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleReroll}
                                className="flex-1 py-3.5 rounded-xl font-bold border border-[#27272A] bg-[#18181B] hover:bg-[#27272A] text-zinc-300 hover:text-white transition flex items-center justify-center gap-2 text-xs uppercase cursor-pointer"
                            >
                                <RotateCcw size={16} /> Реролл
                            </button>
                            <button
                                onClick={() => setWinner(null)}
                                className="flex-1 py-3.5 rounded-xl font-extrabold bg-amber-500 hover:bg-amber-400 text-black transition flex items-center justify-center gap-2 text-xs uppercase shadow-lg shadow-amber-500/20 cursor-pointer"
                            >
                                <CheckCircle2 size={16} /> Готово
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};