import React, { useState } from 'react';
import { BonusBuy } from '../../types/database.types';

interface FortuneWheelProps {
    bonuses: BonusBuy[];
    onSelectBonus?: (bonus: BonusBuy) => void;
}

export const FortuneWheel: React.FC<FortuneWheelProps> = ({ bonuses, onSelectBonus }) => {
    const [spinning, setSpinning] = useState(false);
    const [selectedBonus, setSelectedBonus] = useState<BonusBuy | null>(null);

    const handleSpin = () => {
        if (bonuses.length === 0 || spinning) return;

        setSpinning(true);
        setSelectedBonus(null);

        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * bonuses.length);
            const winner = bonuses[randomIndex];
            setSelectedBonus(winner);
            setSpinning(false);

            if (onSelectBonus) {
                onSelectBonus(winner);
            }
        }, 2000);
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <div className={`w-48 h-48 rounded-full border-4 border-amber-500/50 flex items-center justify-center bg-[#18181B] relative shadow-[0_0_20px_rgba(245,158,11,0.15)] ${spinning ? 'animate-spin' : ''}`}>
                <span className="text-xs text-[#A1A1AA] font-mono text-center px-4">
                    {spinning ? 'Вращение...' : selectedBonus ? selectedBonus.slot_name : 'Нажмите "Крутить"'}
                </span>
            </div>

            <button
                onClick={handleSpin}
                disabled={spinning || bonuses.length === 0}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs transition cursor-pointer"
            >
                {spinning ? 'Крутится...' : 'Крутить колесо'}
            </button>

            {selectedBonus && (
                <div className="text-center text-xs text-amber-400 font-bold">
                    Выпал слот: {selectedBonus.slot_name}
                </div>
            )}
        </div>
    );
};