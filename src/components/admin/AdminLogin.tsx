// src/components/admin/AdminLogin.tsx
import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, Send } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface Props {
    onSuccess: () => void;
}

export const AdminLogin: React.FC<Props> = ({ onSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });

            if (authError) throw authError;

            if (data.session) {
                onSuccess();
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Неверный email или пароль');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0E0E10] text-[#E3E3E3] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#18181C] border border-[#2A2A30] rounded-2xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-6">
                    <div className="p-3 bg-[#222228] rounded-xl mb-3 text-[#E3E3E3]">
                        <Lock size={24} />
                    </div>
                    <h1 className="text-xl font-medium tracking-tight text-white">Панель управления</h1>
                    <p className="text-xs text-[#8E8E93] mt-1">Авторизуйтесь для доступа</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full bg-[#0E0E10] border border-[#2A2A30] focus:border-amber-500 focus:outline-none text-white pl-10 pr-4 py-3 rounded-xl text-sm transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Пароль"
                                className="w-full bg-[#0E0E10] border border-[#2A2A30] focus:border-amber-500 focus:outline-none text-white pl-10 pr-4 py-3 rounded-xl text-sm transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm transition-all cursor-pointer"
                    >
                        {loading ? 'Вход...' : 'Войти'}
                    </button>
                </form>

                {/* Блок контактов под формой */}
                <div className="mt-6 pt-6 border-t border-[#2A2A30] text-center">
                    <p className="text-xs text-[#8E8E93] mb-1.5">
                        Помощь / Регистрация / Другие вопросы
                    </p>
                    <a
                        href="https://t.me/jirni_otec"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors"
                    >
                        <Send size={12} />
                        TG @jirni_otec
                    </a>
                </div>
            </div>
        </div>
    );
};