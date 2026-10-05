import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

export const InvisibleMusicWidget: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const playerRef = useRef<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [currentVideoId, setCurrentVideoId] = useState<string>('');
    const [status, setStatus] = useState<string>('paused');
    const [volume, setVolume] = useState<number>(50);

    // 1. Инициализация официального YouTube IFrame API
    useEffect(() => {
        const initPlayer = () => {
            if (!window.YT || !window.YT.Player) return;

            playerRef.current = new window.YT.Player('invisible-yt-player', {
                height: '200',
                width: '200',
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    modestbranding: 1,
                    rel: 0,
                    origin: window.location.origin,
                },
                events: {
                    onReady: () => setIsReady(true),
                },
            });
        };

        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

            window.onYouTubeIframeAPIReady = () => {
                initPlayer();
            };
        } else {
            initPlayer();
        }
    }, []);

    // 2. Первичная загрузка и Realtime-подписка на обновления таблицы
    useEffect(() => {
        if (!id) return;

        const fetchWidgetData = async () => {
            const { data } = await supabase
                .from('music_widgets')
                .select('*')
                .eq('id', id)
                .single();

            if (data) {
                setCurrentVideoId((data as any).youtube_video_id || '');
                setStatus((data as any).status);
                setVolume((data as any).volume);
            }
        };

        fetchWidgetData();

        const channel = supabase
            .channel(`realtime_music_${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'music_widgets',
                    filter: `id=eq.${id}`,
                },
                (payload: any) => {
                    const updated = payload.new;
                    setCurrentVideoId(updated.youtube_video_id || '');
                    setStatus(updated.status);
                    setVolume(updated.volume);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    // 3. Управление громкостью, треком и паузой
    useEffect(() => {
        if (!isReady || !playerRef.current) return;

        if (typeof playerRef.current.setVolume === 'function') {
            playerRef.current.setVolume(volume);
        }

        if (currentVideoId) {
            const currentUrl = playerRef.current.getVideoUrl?.() || '';
            if (!currentUrl.includes(currentVideoId)) {
                playerRef.current.loadVideoById(currentVideoId);
            }
        }

        if (status === 'playing') {
            playerRef.current.playVideo?.();
        } else if (status === 'paused') {
            playerRef.current.pauseVideo?.();
        }
    }, [isReady, currentVideoId, status, volume]);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'transparent',
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
        >
            <div
                id="invisible-yt-player"
                style={{
                    position: 'absolute',
                    top: '-9999px',
                    left: '-9999px',
                    opacity: 0,
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
};