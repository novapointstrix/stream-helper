import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Lock, AtSign, AlertCircle, X } from 'lucide-react';

interface AdminLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const navigate = useNavigate();
    const [telegramUsername, setTelegramUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Очищаем введенный ник от лишних символов и пробелов
        const cleanUsername = telegramUsername.trim().replace(/^@/, '').toLowerCase();

        // Поддерживаем как полный email, так и ввод одного лишь ника Telegram
        const authEmail = cleanUsername.includes('@')
            ? cleanUsername
            : `${cleanUsername}@telegram.user`;

        try {
            // Прямой вход через сервисы Supabase Auth
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: authEmail,
                password: password,
            });

            if (authError) {
                throw authError;
            }

            if (data.session) {
                onSuccess();
                onClose();
                navigate('/history'); // 👈 Редирект на панель выбора/истории
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Ошибка входа. Проверьте правильность введенных данных.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#121215] border border-[#1F1F24] rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Авторизация</h2>
                        <p className="text-xs text-zinc-400">Введите логин и пароль</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ник Telegram</label>
                        <div className="relative">
                            <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="text"
                                required
                                value={telegramUsername}
                                onChange={(e) => setTelegramUsername(e.target.value)}
                                placeholder="username"
                                className="w-full bg-[#0A0A0C] border border-[#1F1F24] focus:border-amber-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Пароль</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-[#0A0A0C] border border-[#1F1F24] focus:border-amber-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-1/2 bg-[#1A1A1E] hover:bg-[#24242A] text-zinc-300 font-semibold py-2.5 rounded-xl text-xs transition"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-1/2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-black font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20"
                        >
                            {loading ? 'Вход...' : 'Войти'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};