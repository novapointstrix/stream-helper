import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { WheelSector } from '../types/database.types';
import { wheelAudio } from '../utils/wheelAudio';
import { LOGO_OPTIONS } from '../components/StreamIconRenderer';

export const OBSWheelOverlayPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [userId, setUserId] = useState<string | null>(null);
    const [streamIcon, setStreamIcon] = useState<string>('burger');
    const [playerName, setPlayerName] = useState('');
    const [winner, setWinner] = useState<WheelSector | null>(null);
    const [visible, setVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    const lastSectorIndexRef = useRef<number>(-1);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchUserByToken = async () => {
            if (!token) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('id, stream_icon')
                .eq('obs_token', token)
                .maybeSingle();

            if (data && !error) {
                setUserId(data.id);
                if (data.stream_icon) {
                    setStreamIcon(data.stream_icon);
                }
            } else {
                console.error('Ошибка верификации OBS токена или пользователь не найден');
            }
        };

        fetchUserByToken();
    }, [token]);

    useEffect(() => {
        if (!userId) return;

        const profileChannel = supabase
            .channel(`obs_wheel_profile_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.new && (payload.new as any).stream_icon) {
                        setStreamIcon((payload.new as any).stream_icon);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(profileChannel);
        };
    }, [userId]);

    useEffect(() => {
        const originalBodyOverflow = document.body.style.overflow;
        const originalHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.documentElement.style.overflow = originalHtmlOverflow;
        };
    }, []);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
        } else {
            const timer = setTimeout(() => {
                setShouldRender(false);
                setWinner(null);
                setPlayerName('');
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    // Отрисовка цветного векторного бургера / выбранной иконки в центре Canvas
    const drawCenterIcon = (ctx: CanvasRenderingContext2D, center: number, iconId: string) => {
        ctx.save();
        ctx.translate(center, center);

        const currentLogo = LOGO_OPTIONS.find((opt) => opt.id === iconId) || LOGO_OPTIONS[0];

        if (currentLogo.id === 'burger') {
            const scale = 1.3;
            ctx.scale(scale, scale);

            // Верхняя булочка
            ctx.beginPath();
            ctx.pathFromPath2D?.(new Path2D("M-10 -2 C-10 -7.5 -5.5 -11 0 -11 C5.5 -11 10 -7.5 10 -2 Z"));
            ctx.fillStyle = "#E58A42";
            ctx.fill();

            // Кунжут
            ctx.fillStyle = "#FCE7D0";
            ctx.beginPath(); ctx.arc(-4, -6, 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -7.5, 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(4, -6, 0.7, 0, Math.PI * 2); ctx.fill();

            // Салат
            ctx.beginPath();
            ctx.roundRect?.(-11, -1, 22, 2.5, 1.25);
            ctx.fillStyle = "#34D399";
            ctx.fill();

            // Сыр
            ctx.beginPath();
            ctx.roundRect?.(-10, 2.5, 20, 2.5, 1);
            ctx.fillStyle = "#FBBF24";
            ctx.fill();

            // Котлета
            ctx.beginPath();
            ctx.roundRect?.(-11, 6, 22, 3, 1.5);
            ctx.fillStyle = "#78350F";
            ctx.fill();

            // Нижняя булочка
            ctx.beginPath();
            ctx.pathFromPath2D?.(new Path2D("M-10 10 C-10 11.5 -8.5 12.5 -7 12.5 H7 C8.5 12.5 10 11.5 10 10 V10 H-10 V10 Z"));
            ctx.fillStyle = "#E58A42";
            ctx.fill();
        } else {
            // Эмодзи-фоллбэк для остальных иконок
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const symbolMap: Record<string, string> = {
                flame: '🔥', crown: '👑', gem: '💎', dices: '🎲',
                rocket: '🚀', sparkles: '✨', gamepad: '🎮', ghost: '👻', beer: '🍺'
            };
            ctx.fillText(symbolMap[iconId] || '🍔', 0, 1);
        }

        ctx.restore();
    };

    const drawStaticWheel = (
        angle: number,
        activeSectors: WheelSector[]
    ) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const totalSectors = activeSectors.length;
        if (totalSectors === 0) return;

        const arc = (Math.PI * 2) / totalSectors;
        const size = canvas.width;
        const center = size / 2;

        const radius = center - 24;

        ctx.clearRect(0, 0, size, size);

        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 5;
        ctx.shadowColor = 'rgba(255,255,255,0.15)';
        ctx.shadowBlur = 22;
        ctx.stroke();
        ctx.restore();

        for (let i = 0; i < totalSectors; i++) {
            const sectorAngle = angle + i * arc - Math.PI / 2;

            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, sectorAngle, sectorAngle + arc);
            ctx.closePath();

            ctx.fillStyle = activeSectors[i].color || '#3F3F46';
            ctx.fill();

            const gradient = ctx.createLinearGradient(
                center,
                center - radius,
                center,
                center + radius
            );
            gradient.addColorStop(0, 'rgba(255,255,255,0.12)');
            gradient.addColorStop(0.45, 'rgba(255,255,255,0)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.18)');

            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.lineTo(
                center + Math.cos(sectorAngle) * radius,
                center + Math.sin(sectorAngle) * radius
            );
            ctx.strokeStyle = 'rgba(255,255,255,0.28)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(sectorAngle + arc / 2);
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';

            let fontSize = 17;
            if (activeSectors[i].label.length > 12) fontSize = 14;
            if (activeSectors[i].label.length > 18) fontSize = 12;

            ctx.font = `800 ${fontSize}px Arial, sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0,0,0,0.55)';
            ctx.shadowBlur = 6;

            ctx.fillText(activeSectors[i].label, radius - 28, 0);
            ctx.restore();
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.20)';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(center, center, radius - 7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.20)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, 39, 0, Math.PI * 2);
        ctx.fillStyle = '#111318';
        ctx.shadowColor = 'rgba(0,0,0,0.65)';
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(center, center, 36, 0, Math.PI * 2);
        ctx.fillStyle = '#17191F';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 3;
        ctx.stroke();

        drawCenterIcon(ctx, center, streamIcon);
    };

    useEffect(() => {
        if (!token) return;

        const channelName = `wheel_events_${token}`;

        const channel = supabase.channel(channelName, {
            config: {
                broadcast: { self: true },
            },
        });

        channel
            .on(
                'broadcast',
                { event: 'START_SPIN' },
                ({ payload }) => {
                    if (payload) {
                        if (userId && payload.userId && payload.userId !== userId) {
                            return;
                        }
                        startSpinSequence(payload);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [token, userId, streamIcon]);

    const startSpinSequence = (payload: any) => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }

        setPlayerName(payload.playerName || 'Зритель');
        setWinner(null);
        setVisible(true);

        setTimeout(() => {
            runSpinAnimation(payload);
        }, 100);

        hideTimerRef.current = setTimeout(() => {
            setVisible(false);
        }, 13000);
    };

    const runSpinAnimation = (payload: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const activeSectors: WheelSector[] = payload.sectors || [];
        const durationMs = payload.durationMs || 6000;
        const totalSectors = activeSectors.length;

        if (totalSectors === 0) return;

        const arc = (Math.PI * 2) / totalSectors;
        const winningIndex = activeSectors.findIndex(
            (s) => s.id === payload.winningSectorId
        );

        const extraRotations = 8 * Math.PI * 2;
        const targetSectorCenter =
            (totalSectors - (winningIndex >= 0 ? winningIndex : 0) - 0.5) * arc;

        const finalAngle = extraRotations + targetSectorCenter;
        const startTime = performance.now();
        lastSectorIndexRef.current = -1;

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / durationMs, 1);

            const ease = 1 - Math.pow(1 - progress, 4.5);
            const currentAngle = finalAngle * ease;

            const currentSectorIndex = Math.floor((currentAngle % (Math.PI * 2)) / arc);
            if (currentSectorIndex !== lastSectorIndexRef.current) {
                wheelAudio.playTick();
                lastSectorIndexRef.current = currentSectorIndex;
            }

            drawStaticWheel(currentAngle, activeSectors);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                const winSec =
                    activeSectors[winningIndex >= 0 ? winningIndex : 0];
                setWinner(winSec);
                wheelAudio.playWin();
            }
        };

        requestAnimationFrame(animate);
    };

    if (token && !userId) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-transparent text-white font-mono text-xs">
                Загрузка оверлея колеса...
            </div>
        );
    }

    return (
        <>
            <style>{`
                html, body {
                    overflow: hidden !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    background: transparent !important;
                }
                ::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                * {
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                }
            `}</style>

            {shouldRender && (
                <div
                    className={`
                        fixed
                        inset-0
                        w-full
                        h-full
                        bg-transparent
                        flex
                        flex-col
                        items-center
                        justify-center
                        font-sans
                        overflow-hidden
                        select-none
                        transition-all
                        duration-600
                        ease-in-out
                        ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
                    `}
                >
                    <div
                        className="
                            absolute
                            w-[500px]
                            h-[500px]
                            rounded-full
                            bg-white/[0.03]
                            blur-[80px]
                            pointer-events-none
                        "
                    />

                    <div
                        className="
                            flex
                            flex-col
                            items-center
                            z-30
                            mb-[-5px]
                        "
                    >
                        {playerName && (
                            <div
                                className="
                                    text-sm
                                    font-bold
                                    tracking-wide
                                    text-white
                                    bg-[#111318]/95
                                    border
                                    border-white/10
                                    backdrop-blur-xl
                                    px-6
                                    py-2.5
                                    rounded-full
                                    shadow-[0_8px_30px_rgba(0,0,0,0.5)]
                                "
                            >
                                <span className="text-white/45">Крутит</span>
                                <span className="mx-2 text-white/20">•</span>
                                <span className="text-white">{playerName}</span>
                            </div>
                        )}

                        <div
                            className="
                                relative
                                z-40
                                w-0
                                h-0
                                border-l-[10px]
                                border-l-transparent
                                border-r-[10px]
                                border-r-transparent
                                border-t-[20px]
                                border-t-white
                                drop-shadow-[0_3px_10px_rgba(255,255,255,0.55)]
                                -mt-[1px]
                            "
                        />
                    </div>

                    <div
                        className="
                            relative
                            w-[480px]
                            h-[480px]
                        "
                    >
                        <canvas
                            ref={canvasRef}
                            width={480}
                            height={480}
                            className="
                                relative
                                rounded-full
                            "
                        />
                    </div>

                    <div
                        className="
                            h-28
                            mt-2
                            flex
                            items-center
                            justify-center
                        "
                    >
                        {winner && (
                            <div
                                className="
                                    text-center
                                    bg-[#111318]/95
                                    border
                                    border-white/10
                                    backdrop-blur-xl
                                    text-white
                                    px-9
                                    py-3
                                    rounded-2xl
                                    shadow-[0_12px_40px_rgba(0,0,0,0.5)]
                                    animate-fade-in
                                "
                            >
                                <div
                                    className="
                                        text-[10px]
                                        uppercase
                                        font-bold
                                        tracking-[0.2em]
                                        text-white/40
                                        mb-0.5
                                    "
                                >
                                    Приз
                                </div>

                                <div
                                    className="
                                        text-3xl
                                        font-black
                                        tracking-tight
                                    "
                                >
                                    {winner.label}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};