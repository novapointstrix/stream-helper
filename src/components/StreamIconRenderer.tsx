import React from 'react';

export interface LogoOption {
    id: string;
    label: string;
    bg: string;
    color: string;
    svg: (size: number, className?: string) => React.ReactNode;
}

export const LOGO_OPTIONS: LogoOption[] = [
    {
        id: 'burger',
        label: 'Бургер',
        color: 'text-amber-500',
        bg: 'bg-amber-500/10 border-amber-500/30',
        svg: (size, className = '') => (
            <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
                {/* Верхняя булочка */}
                <path d="M6 14C6 8.5 10.5 5 16 5C21.5 5 26 8.5 26 14H6Z" fill="#E58A42" />
                {/* Кунжут */}
                <ellipse cx="12" cy="8.5" rx="1" ry="0.6" fill="#FCE7D0" transform="rotate(-15 12 8.5)" />
                <ellipse cx="16" cy="7.5" rx="1" ry="0.6" fill="#FCE7D0" />
                <ellipse cx="20" cy="8.5" rx="1" ry="0.6" fill="#FCE7D0" transform="rotate(15 20 8.5)" />
                {/* Салат */}
                <rect x="5" y="15" width="22" height="2.5" rx="1.25" fill="#34D399" />
                {/* Сыр */}
                <rect x="6" y="18.5" width="20" height="2.5" rx="1" fill="#FBBF24" />
                {/* Котлета */}
                <rect x="5" y="22" width="22" height="3" rx="1.5" fill="#78350F" />
                {/* Нижняя булочка */}
                <path d="M6 26C6 27.5 7.5 28.5 9 28.5H23C24.5 28.5 26 27.5 26 26V26H6V26Z" fill="#E58A42" />
            </svg>
        )
    },
    {
        id: 'flame',
        label: 'Занос / Огонь',
        color: 'text-orange-500',
        bg: 'bg-orange-500/10 border-orange-500/30',
        svg: (size, className = '') => (
            <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
                <path d="M16 4C16 4 21 9 21 15C21 18 19 21 16 21C13 21 11 18 11 15C11 12 12.5 10 13.5 8.5C10 10.5 7 14.5 7 19.5C7 24.5 11 28.5 16 28.5C21 28.5 25 24.5 25 19.5C25 12 16 4 16 4Z" fill="#F97316" />
                <path d="M16 12C16 12 19 15 19 18.5C19 20.5 17.5 22.5 16 22.5C14.5 22.5 13 20.5 13 18.5C13 16.5 14 15 14.5 14C12.5 15 11 17 11 19C11 22 13 24.5 16 24.5C19 24.5 21 22 21 19C21 15 16 12 16 12Z" fill="#FBBF24" />
            </svg>
        )
    },
    {
        id: 'crown',
        label: 'Король / Big Win',
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10 border-yellow-400/30',
        svg: (size, className = '') => (
            <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
                <path d="M4 25H28L25 11L19 17L16 6L13 17L7 11L4 25Z" fill="#FACC15" />
                <rect x="4" y="26" width="24" height="3" rx="1.5" fill="#EAB308" />
                <circle cx="16" cy="6" r="2" fill="#EF4444" />
                <circle cx="7" cy="11" r="1.5" fill="#3B82F6" />
                <circle cx="25" cy="11" r="1.5" fill="#3B82F6" />
            </svg>
        )
    },
    {
        id: 'gem',
        label: 'Алмаз / Профит',
        color: 'text-cyan-400',
        bg: 'bg-cyan-400/10 border-cyan-400/30',
        svg: (size, className = '') => (
            <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
                <path d="M9 5H23L29 13L16 28L3 13L9 5Z" fill="#38BDF8" />
                <path d="M9 5L13 13L16 28L19 13L23 5" fill="#0EA5E9" />
                <path d="M3 13H29" stroke="#7DD3FC" strokeWidth="1.5" />
            </svg>
        )
    },
    {
        id: 'dices',
        label: 'Кости / Казино',
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/10 border-emerald-400/30',
        svg: (size, className = '') => (
            <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
                <rect x="4" y="4" width="24" height="24" rx="5" fill="#10B981" />
                <circle cx="10" cy="10" r="2" fill="#FFFFFF" />
                <circle cx="22" cy="22" r="2" fill="#FFFFFF" />
                <circle cx="16" cy="16" r="2" fill="#FFFFFF" />
                <circle cx="22" cy="10" r="2" fill="#FFFFFF" />
                <circle cx="10" cy="22" r="2" fill="#FFFFFF" />
            </svg>
        )
    },
    {
        id: 'rocket',
        label: 'Иксы / Ракета',
        color: 'text-purple-400',
        bg: 'bg-purple-400/10 border-purple-400/30',
        svg: (size, className = '') => (
            <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
                <path d="M16 4C22 4 25 10 25 18L16 23L7 18C7 10 10 4 16 4Z" fill="#C084FC" />
                <circle cx="16" cy="12" r="3" fill="#38BDF8" />
                <path d="M7 18L4 23V26L9 22" fill="#A855F7" />
                <path d="M25 18L28 23V26L23 22" fill="#A855F7" />
                <path d="M13 23H19L16 29L13 23Z" fill="#F97316" />
            </svg>
        )
    }
];

export const StreamIconRenderer: React.FC<{ iconId?: string; size?: number; className?: string }> = ({
    iconId = 'burger',
    size = 24,
    className = ''
}) => {
    // Нормализуем входящую строку (убираем лишние пробелы и приводим к нижнему регистру)
    const normalizedId = String(iconId || 'burger').trim().toLowerCase();

    // Ищем совпадение
    const item = LOGO_OPTIONS.find((opt) => opt.id.toLowerCase() === normalizedId) || LOGO_OPTIONS[0];

    return (
        <span
            className={`inline-flex items-center justify-center shrink-0 ${className}`}
            style={{ width: size, height: size }}
        >
            {item.svg(size, 'w-full h-full object-contain display-block')}
        </span>
    );
};