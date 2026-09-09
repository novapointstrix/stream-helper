import { RollParticipant } from '../types/chatRoll';

const BACKEND_URL = import.meta.env.VITE_KICK_BACKEND_URL || 'http://localhost:3001';

/**
 * Очищает любую введенную строку (URL, @ник, сырой ввод) до чистого логина Kick
 */
export function extractKickUsername(input: string): string {
    let raw = input.trim().toLowerCase();

    if (raw.includes('kick.com/')) {
        const parts = raw.split('kick.com/');
        raw = parts[1] || '';
    }

    raw = raw.split('?')[0].split('/')[0].replace('@', '').trim();
    return raw;
}

export interface KickBroadcasterInfo {
    broadcasterUserId: number;
    slug: string;
}

/**
 * ПЕРЕДЕЛАНО: раньше здесь была ротация публичных CORS-прокси
 * (corsproxy.io, codetabs, allorigins) поверх неофициального
 * kick.com/api/v2/channels. Теперь узнаём канал через собственный
 * бэкенд, который дергает официальный Kick Public API с app-токеном —
 * см. README_KICK_MIGRATION.md.
 */
export async function getBroadcasterByUsername(input: string): Promise<KickBroadcasterInfo | null> {
    const cleanUsername = extractKickUsername(input);
    if (!cleanUsername) return null;

    try {
        const response = await fetch(
            `${BACKEND_URL}/api/kick/channel?username=${encodeURIComponent(cleanUsername)}`
        );

        if (!response.ok) {
            console.error(`[Kick API] Канал "${cleanUsername}" не найден (status ${response.status})`);
            return null;
        }

        const data = await response.json();
        if (!data?.broadcasterUserId) return null;

        console.log(`[Kick API Success] broadcaster_user_id (${data.broadcasterUserId}) для @${cleanUsername}`);
        return { broadcasterUserId: data.broadcasterUserId, slug: data.slug };
    } catch (err) {
        console.error('[Kick API] Ошибка запроса к бэкенду:', err);
        return null;
    }
}

export function calculateParticipantWeight(
    isVip: boolean,
    isSub: boolean,
    multipliers: { normal: number; vip: number; sub: number; vipSub: number }
): number {
    if (isVip && isSub) return multipliers.vipSub;
    if (isVip) return multipliers.vip;
    if (isSub) return multipliers.sub;
    return multipliers.normal;
}

export function pickWeightedWinner(
    participants: RollParticipant[],
    excludedKickUserIds: Set<string>
): RollParticipant | null {
    const eligible = participants.filter(
        p => p.eligible && !excludedKickUserIds.has(p.kick_user_id)
    );

    if (eligible.length === 0) return null;

    const totalWeight = eligible.reduce((acc, p) => acc + Number(p.chance_weight), 0);
    let random = Math.random() * totalWeight;

    for (const participant of eligible) {
        if (random < participant.chance_weight) {
            return participant;
        }
        random -= participant.chance_weight;
    }

    return eligible[eligible.length - 1];
}
