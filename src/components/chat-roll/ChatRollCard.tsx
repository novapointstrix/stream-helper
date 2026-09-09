import React from 'react';

interface ChatRollCardProps {
    onOpen: () => void;
}

export const ChatRollCard: React.FC<ChatRollCardProps> = ({ onOpen }) => {
    return (
        <div
            className="rounded-2xl p-6 border flex flex-col justify-between transition-all duration-300 hover:scale-[1.01]"
            style={{
                backgroundColor: 'var(--widget-surface, #121215)',
                borderColor: 'var(--widget-border, #1F1F24)',
            }}
        >
            <div>
                <div className="flex items-center justify-between mb-4">
                    <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: 'var(--widget-accent, #F59E0B)',
                        }}
                    >
                        NEW
                    </span>
                    <span className="text-2xl">🎲</span>
                </div>

                <h3
                    className="text-xl font-bold mb-2"
                    style={{ color: 'var(--widget-text-primary, #FFFFFF)' }}
                >
                    Chat Roll
                </h3>

                <p
                    className="text-sm mb-6 line-clamp-2"
                    style={{ color: 'var(--widget-text-secondary, #9CA3AF)' }}
                >
                    Быстрые розыгрыши прямо в чате Kick по кодовому слову с повышенными шансами для VIP и сабов.
                </p>
            </div>

            <button
                onClick={onOpen}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all shadow-lg hover:brightness-110 active:scale-[0.98]"
                style={{
                    backgroundColor: 'var(--widget-accent, #F59E0B)',
                    color: '#000000',
                }}
            >
                Запустить Chat Roll
            </button>
        </div>
    );
};