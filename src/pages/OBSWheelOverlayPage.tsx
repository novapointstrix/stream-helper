import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { WheelSector } from '../types/database.types';
import { wheelAudio } from '../utils/wheelAudio';

export const OBSWheelOverlayPage: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [playerName, setPlayerName] = useState('');
    const [winner, setWinner] = useState<WheelSector | null>(null);
    const [visible, setVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    const lastSectorIndexRef = useRef<number>(-1);

    // ---------------------------------------------------------
    // ОТКЛЮЧЕНИЕ СКРОЛЛА
    // ---------------------------------------------------------
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

    // Управление монтированием/демонтированием
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

    // ---------------------------------------------------------
    // ОТРИСОВКА ВЕКТОРНОГО БУРГЕРА
    // ---------------------------------------------------------
    const drawVectorBurger = (ctx: CanvasRenderingContext2D, center: number) => {
        ctx.save();
        ctx.translate(center, center);

        const scale = 0.85;
        ctx.scale(scale, scale);

        ctx.beginPath();
        ctx.arc(0, -2, 18, Math.PI, 0, false);
        ctx.fillStyle = '#E28743';
        ctx.fill();

        ctx.fillStyle = '#FFF8E7';
        const seeds = [
            { x: -8, y: -10 },
            { x: 0, y: -13 },
            { x: 8, y: -9 },
            { x: -4, y: -6 },
            { x: 4, y: -5 }
        ];
        seeds.forEach((seed) => {
            ctx.beginPath();
            ctx.ellipse(seed.x, seed.y, 1.3, 0.7, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.beginPath();
        ctx.fillStyle = '#48BB78';
        ctx.roundRect(-19, -2, 38, 4, 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = '#ECC94B';
        ctx.moveTo(-18, 2);
        ctx.lineTo(18, 2);
        ctx.lineTo(18, 6);
        ctx.lineTo(10, 6);
        ctx.lineTo(6, 11);
        ctx.lineTo(2, 6);
        ctx.lineTo(-18, 6);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = '#633211';
        ctx.roundRect(-18, 6, 36, 6, 3);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = '#C8702E';
        ctx.roundRect(-17, 12, 34, 5, [1, 1, 3, 3]);
        ctx.fill();

        ctx.restore();
    };

    // ---------------------------------------------------------
    // ОТРИСОВКА КОЛЕСА
    // ---------------------------------------------------------
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

        drawVectorBurger(ctx, center);
    };

    // ---------------------------------------------------------
    // SUPABASE ПОДКЛЮЧЕНИЕ
    // ---------------------------------------------------------
    useEffect(() => {
        const channel = supabase.channel('wheel_events');

        channel
            .on(
                'broadcast',
                { event: 'START_SPIN' },
                ({ payload }) => {
                    startSpinSequence(payload);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // ---------------------------------------------------------
    // ЗАПУСК И АНИМАЦИЯ
    // ---------------------------------------------------------
    const startSpinSequence = (payload: any) => {
        setPlayerName(payload.playerName);
        setWinner(null);
        setVisible(true);

        requestAnimationFrame(() => {
            runSpinAnimation(payload);
        });

        // Продлено до 13000 мс (6 сек вращения + 7 сек показа победного приза)
        setTimeout(() => {
            setVisible(false);
        }, 13000);
    };

    const runSpinAnimation = (payload: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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

            // Щелчок при смене сектора
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

                // Победный звук
                wheelAudio.playWin();
            }
        };

        requestAnimationFrame(animate);
    };

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
                    {/* Подсветка */}
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

                    {/* Ник зрителя + стрелка */}
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

                        {/* Указатель сверху */}
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

                    {/* Колесо (Canvas) */}
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

                    {/* Блок победного приза */}
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