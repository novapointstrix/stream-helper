// backend/server.js
//
// Замена старой связки "CORS-прокси + прямой Pusher-коннект", которую Kick
// закрыл (см. README_KICK_MIGRATION.md). Теперь всё идёт через официальный
// Kick Public API + Events (webhooks):
//
//   1) app access token через client_credentials
//   2) поиск канала по нику -> GET /public/v1/channels?slug=...
//   3) подписка на chat.message.sent -> POST /public/v1/events/subscriptions
//   4) Kick шлёт события на наш публичный вебхук -> POST /api/kick/webhook
//   5) мы ретранслируем их фронтенду через Server-Sent Events (SSE)
//
// Веб-хук URL настраивается ОДИН РАЗ в кабинете разработчика Kick
// (https://kick.com/settings/developer), не в каждом запросе подписки.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());

const { KICK_CLIENT_ID, KICK_CLIENT_SECRET, PORT = 3001 } = process.env;

if (!KICK_CLIENT_ID || !KICK_CLIENT_SECRET) {
    console.error(
        '[Kick Backend] Не заданы KICK_CLIENT_ID / KICK_CLIENT_SECRET. ' +
        'Скопируйте .env.example в .env и заполните значениями из кабинета разработчика Kick.'
    );
    process.exit(1);
}

const KICK_TOKEN_URL = 'https://id.kick.com/oauth/token';
const KICK_API_BASE = 'https://api.kick.com/public/v1';

// ---------------------------------------------------------------------------
// 1. App access token (client_credentials), с кэшем до истечения срока жизни
// ---------------------------------------------------------------------------
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAppToken() {
    if (cachedToken && Date.now() < tokenExpiresAt - 30_000) {
        return cachedToken;
    }

    const res = await fetch(KICK_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: KICK_CLIENT_ID,
            client_secret: KICK_CLIENT_SECRET,
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Kick OAuth token error ${res.status}: ${text}`);
    }

    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000;
    console.log(`[Kick Backend] Новый app access token получен, живёт ${data.expires_in}s`);
    return cachedToken;
}

async function kickApiFetch(path, options = {}) {
    const token = await getAppToken();
    return fetch(`${KICK_API_BASE}${path}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
        },
    });
}

// ---------------------------------------------------------------------------
// 2. Поиск канала по нику — замена старого списка CORS-прокси в rollService.ts
// ---------------------------------------------------------------------------
app.get('/api/kick/channel', async (req, res) => {
    const username = String(req.query.username || '').trim().toLowerCase();
    if (!username) return res.status(400).json({ error: 'username required' });

    try {
        const kickRes = await kickApiFetch(`/channels?slug=${encodeURIComponent(username)}`);
        if (!kickRes.ok) {
            return res.status(kickRes.status).json({ error: 'Kick API error' });
        }
        const body = await kickRes.json();
        const channel = body?.data?.[0];
        if (!channel) return res.status(404).json({ error: 'channel not found' });

        res.json({
            broadcasterUserId: channel.broadcaster_user_id,
            slug: channel.slug,
        });
    } catch (err) {
        console.error('[Kick Backend] /api/kick/channel error:', err);
        res.status(500).json({ error: 'internal error' });
    }
});

// ---------------------------------------------------------------------------
// 3. Подписки на chat.message.sent + SSE-раздача фронтенду
// ---------------------------------------------------------------------------
// broadcasterUserId (number) -> { subscriptionId, clients: Set<express.Response> }
const activeStreams = new Map();

app.post('/api/kick/roll/start', express.json(), async (req, res) => {
    const broadcasterUserId = Number(req.body?.broadcasterUserId);
    if (!broadcasterUserId) return res.status(400).json({ error: 'broadcasterUserId required' });

    if (activeStreams.has(broadcasterUserId)) {
        return res.json({ ok: true, alreadyActive: true });
    }

    try {
        const subRes = await kickApiFetch('/events/subscriptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                broadcaster_user_id: broadcasterUserId,
                method: 'webhook',
                events: [{ name: 'chat.message.sent', version: 1 }],
            }),
        });

        if (!subRes.ok) {
            const text = await subRes.text();
            console.error('[Kick Backend] Ошибка создания подписки:', subRes.status, text);
            return res.status(subRes.status).json({ error: 'subscribe failed', details: text });
        }

        const subBody = await subRes.json();
        const subscriptionId = subBody?.data?.[0]?.subscription_id ?? subBody?.data?.[0]?.id ?? null;

        activeStreams.set(broadcasterUserId, { subscriptionId, clients: new Set() });
        console.log(`[Kick Backend] Подписка создана: broadcaster=${broadcasterUserId} sub=${subscriptionId}`);
        res.json({ ok: true, subscriptionId });
    } catch (err) {
        console.error('[Kick Backend] /api/kick/roll/start error:', err);
        res.status(500).json({ error: 'internal error' });
    }
});

app.post('/api/kick/roll/stop', express.json(), async (req, res) => {
    const broadcasterUserId = Number(req.body?.broadcasterUserId);
    const stream = activeStreams.get(broadcasterUserId);
    if (!stream) return res.json({ ok: true });

    try {
        if (stream.subscriptionId) {
            await kickApiFetch(`/events/subscriptions?id=${encodeURIComponent(stream.subscriptionId)}`, {
                method: 'DELETE',
            });
        }
    } catch (err) {
        console.warn('[Kick Backend] Не удалось отписаться от событий Kick (не критично):', err);
    }

    for (const client of stream.clients) client.end();
    activeStreams.delete(broadcasterUserId);
    res.json({ ok: true });
});

// SSE-поток, который слушает фронтенд вместо старого прямого Pusher-коннекта
app.get('/api/kick/roll/stream', (req, res) => {
    const broadcasterUserId = Number(req.query.broadcasterUserId);
    const stream = activeStreams.get(broadcasterUserId);
    if (!stream) {
        return res.status(404).json({ error: 'no active subscription for this broadcaster' });
    }

    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    res.flushHeaders();
    res.write(': connected\n\n');

    stream.clients.add(res);
    req.on('close', () => stream.clients.delete(res));
});

// ---------------------------------------------------------------------------
// 4. Приём вебхуков от Kick
// ---------------------------------------------------------------------------
// ⚠️ TODO ДО ПРОДА: проверить криптографическую подпись вебхука. Kick подписывает
// доставку событий — актуальные заголовки и алгоритм смотри в разделе про
// верификацию событий на https://github.com/KickEngineering/KickDevDocs
// (могло измениться после написания этого файла). Пока обрабатываем без проверки.
app.post('/api/kick/webhook', express.json({ type: '*/*' }), (req, res) => {
    // Отвечаем сразу 200 — иначе Kick посчитает доставку неуспешной и будет ретраить
    res.sendStatus(200);

    const eventType = req.header('Kick-Event-Type');
    if (eventType && eventType !== 'chat.message.sent') return;

    const payload = req.body || {};

    // --- Разбор отправителя -------------------------------------------------
    // ⚠️ ПРОВЕРЬ ЭТО: точная форма payload может отличаться от того, что было в
    // старом неофициальном Pusher-формате. Раскомментируй строку ниже, отправь
    // тестовое сообщение в чат и посмотри реальную структуру в логах бэкенда,
    // затем поправь пути ниже при необходимости.
    // console.log('[Kick Webhook] RAW PAYLOAD:', JSON.stringify(payload, null, 2));

    const broadcasterUserId = Number(payload?.broadcaster?.user_id ?? payload?.broadcaster_user_id);
    const sender = payload?.sender || {};
    const badges = sender?.identity?.badges || sender?.badges || [];
    const isVip = badges.some((b) => b?.type === 'vip');
    const isSub = badges.some((b) => b?.type === 'subscriber' || b?.type === 'sub_gifter');

    const chatMessage = {
        id: payload?.message_id || payload?.id || crypto.randomUUID(),
        content: payload?.content || '',
        sender: {
            id: String(sender?.user_id ?? sender?.id ?? ''),
            username: sender?.username || 'unknown',
            is_vip: isVip,
            is_subscriber: isSub,
        },
    };

    const stream = activeStreams.get(broadcasterUserId);
    if (!stream) return; // сейчас никто не собирает участников по этому каналу

    const sseData = `event: chat_message\ndata: ${JSON.stringify(chatMessage)}\n\n`;
    for (const client of stream.clients) client.write(sseData);
});

app.listen(PORT, () => {
    console.log(`[Kick Backend] Сервер запущен: http://localhost:${PORT}`);
    console.log('[Kick Backend] Не забудь публично туннелировать /api/kick/webhook для получения событий от Kick.');
});
