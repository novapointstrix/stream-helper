// lib/kickClient.ts
//
// ПЕРЕДЕЛАНО: раньше здесь был прямой коннект к Pusher-каналу Kick
// (chatrooms.<id>.v2). Kick закрыл этот путь на своей стороне — см.
// README_KICK_MIGRATION.md. Теперь слушаем chat.message.sent через
// официальный Kick Events API (вебхуки), которые принимает наш бэкенд
// (backend/server.js) и ретранслирует сюда через Server-Sent Events.

export interface KickChatMessage {
    id: string;
    content: string;
    sender: {
        id: string;
        username: string;
        is_vip: boolean;
        is_subscriber: boolean;
    };
}

const BACKEND_URL = import.meta.env.VITE_KICK_BACKEND_URL || 'http://localhost:3001';

export class KickChatListener {
    private eventSource: EventSource | null = null;
    private broadcasterUserId: number | null = null;

    /**
     * @param broadcasterUserId — теперь это НЕ chatroom_id, а broadcaster_user_id
     * из официального Kick API (см. rollService.getBroadcasterByUsername).
     */
    async connect(broadcasterUserId: number, onMessage: (msg: KickChatMessage) => void) {
        this.broadcasterUserId = broadcasterUserId;

        // 1. Просим бэкенд создать подписку на chat.message.sent для этого канала
        //    (если она уже активна — бэкенд просто переиспользует её)
        try {
            const startRes = await fetch(`${BACKEND_URL}/api/kick/roll/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ broadcasterUserId }),
            });
            if (!startRes.ok) {
                console.error('[Kick Chat] Бэкенд не смог создать подписку на события чата:', await startRes.text());
                return;
            }
        } catch (err) {
            console.error('[Kick Chat] Не удалось достучаться до бэкенда:', err);
            return;
        }

        // 2. Открываем SSE-поток — сюда бэкенд пушит события из вебхука Kick
        const es = new EventSource(
            `${BACKEND_URL}/api/kick/roll/stream?broadcasterUserId=${broadcasterUserId}`
        );
        this.eventSource = es;

        es.onopen = () => {
            console.log(`[Kick Chat] SSE-поток открыт для broadcaster ${broadcasterUserId}`);
        };
        es.onerror = (err) => {
            console.error('[Kick Chat] Ошибка SSE-соединения:', err);
        };

        es.addEventListener('chat_message', (event: MessageEvent) => {
            try {
                const msg: KickChatMessage = JSON.parse(event.data);
                console.log('[Kick Chat] Сообщение:', msg.sender.username, '->', msg.content);
                onMessage(msg);
            } catch (e) {
                console.error('[Kick Chat] Ошибка парсинга сообщения:', e);
            }
        });
    }

    async disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        if (this.broadcasterUserId !== null) {
            try {
                await fetch(`${BACKEND_URL}/api/kick/roll/stop`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ broadcasterUserId: this.broadcasterUserId }),
                });
            } catch (e) {
                console.warn('[Kick Chat] Не удалось корректно отписаться от бэкенда:', e);
            }
            this.broadcasterUserId = null;
        }
    }
}
