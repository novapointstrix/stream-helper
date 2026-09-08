// src/components/admin/AdminLogin.tsx
import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { loginAdmin } from '../../lib/auth';

interface Props {
    onSuccess: () => void;
}

export const AdminLogin: React.FC<Props> = ({ onSuccess }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (loginAdmin(password)) {
            setError(false);
            onSuccess();
        } else {
            setError(true);
        }
    };

    return (
        <div className="min-h-screen bg-[#0E0E10] text-[#E3E3E3] flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#18181C] border border-[#2A2A30] rounded-2xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-6">
                    <div className="p-3 bg-[#222228] rounded-xl mb-3 text-[#E3E3E3]">
                        <Lock size={24} />
                    </div>
                    <h1 className="text-xl font-medium tracking-tight text-white">Панель управления</h1>
                    <p className="text-xs text-[#8E8E93] mt-1">Введите пароль для доступа</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError(false);
                            }}
                            placeholder="Пароль"
                            className={`w-full bg-[#0E0E10] border ${error ? 'border-amber-500/50' : 'border-[#2A2A30]'
                                } focus:border-[#4E4E58] focus:outline-none text-white px-4 py-3 rounded-xl text-sm transition-all`}
                            autoFocus
                        />
                        {error && (
                            <p className="text-xs text-amber-500/80 mt-1.5 text-center">
                                Неверный пароль доступа
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-[#2A2A32] hover:bg-[#34343E] text-white font-medium py-3 rounded-xl text-sm transition-all border border-[#3A3A45]"
                    >
                        Войти
                    </button>
                </form>
            </div>
        </div>
    );
};