import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { WheelConfig, WheelSpinEvent } from '../types/wheel.types';
import { WheelCanvas } from '../components/wheel/WheelCanvas';
import { wheelAudio } from '../utils/wheelAudio';

export const WheelOverlayPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState<WheelConfig | null>(null);
    const [rotation, setRotation] = useState(0);
    const [winner, setWinner] = useState<{ name: string; prize: string } | null>(null);

    const animRef = useRef<number | null>(null);
    const lastTickSegmentRef = useRef<number>(-1);

    useEffect(() => {
        if (!token) return;

        // Подписка на уникальный канал токена пользователя
        const channelName = `wheel_events_${token}`;
        const channel = supabase
            .channel(channelName)
            .on(
                'broadcast',
                { event: 'WHEEL_SPIN_EVENT' },
                (payload: { payload: WheelSpinEvent }) => {
                    if (payload?.payload) {
                        startSpinSequence(payload.payload);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (animRef.current !== null) {
                cancelAnimationFrame(animRef.current);
            }
        };
    }, [token]);

    const startSpinSequence = (eventData: WheelSpinEvent) => {
        if (animRef.current !== null) {
            cancelAnimationFrame(animRef.current);
        }

        setConfig(eventData.config);
        setWinner(null);
        setVisible(true);

        const segmentsCount = eventData.config.segments.length;
        const segmentAngle = 360 / segmentsCount;
        const targetSegmentCenter = eventData.winningIndex * segmentAngle + segmentAngle / 2;
        const fullSpins = 360 * 8;
        const finalTargetRotation = fullSpins + (360 - targetSegmentCenter);

        const duration = 10000;
        const startTime = performance.now();
        lastTickSegmentRef.current = -1;

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentRot = finalTargetRotation * easeProgress;

            if (segmentsCount > 0) {
                const currentSegment = Math.floor(currentRot / segmentAngle);
                if (currentSegment !== lastTickSegmentRef.current) {
                    wheelAudio.playTick();
                    lastTickSegmentRef.current = currentSegment;
                }
            }

            setRotation(currentRot);

            if (progress < 1) {
                animRef.current = requestAnimationFrame(animate);
            } else {
                setWinner({ name: eventData.winnerName, prize: eventData.prizeLabel });
                wheelAudio.playWin();

                setTimeout(() => {
                    setVisible(false);
                }, 4000);
            }
        };

        animRef.current = requestAnimationFrame(animate);
    };

    if (!token) {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center text-red-500 font-mono font-bold text-lg">
                Ошибка: Укажите параметр token в URL (?token=YOUR_TOKEN)
            </div>
        );
    }

    if (!visible || !config) return null;

    return (
        <div className="fixed inset-0 bg-transparent flex flex-col items-center justify-center overflow-hidden select-none">
            <div
                className="flex flex-col items-center transition-all duration-700 transform"
                style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'scale(1)' : 'scale(0.85)'
                }}
            >
                <div className="relative flex items-center justify-center">
                    <WheelCanvas config={config} rotation={rotation} size={500} />

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center justify-center">
                        <img
                            src="/icons/burger.png"
                            alt="Burger"
                            className="w-20 h-20 object-contain drop-shadow-xl"
                        />
                    </div>
                </div>

                {winner && (
                    <div className="mt-8 text-center bg-gray-900/90 border border-indigo-500/50 p-6 rounded-2xl shadow-2xl backdrop-blur-md">
                        <div className="text-sm font-medium text-indigo-400 tracking-widest uppercase select-none">ПОЗДРАВЛЯЕМ!</div>
                        <div className="text-2xl font-black text-white my-1 select-none">{winner.name}</div>
                        <div className="text-xl font-extrabold text-amber-400 select-none">{winner.prize}</div>
                    </div>
                )}
            </div>
        </div>
    );
};