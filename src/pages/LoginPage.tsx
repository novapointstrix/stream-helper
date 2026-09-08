import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase клиента для браузера
// (Используем Publishable / Anon ключ, НЕ Service Role!)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nzczjdlwalgzbyklwmmi.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ВАШ_PUBLISHABLE_КЛЮЧ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);

        // Авторизация пользователя через Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
        });

        setLoading(false);

        if (error) {
            setErrorMsg('Неверный логин или пароль.');
            return;
        }

        if (data.user) {
            // Перенаправление в закрытую часть приложения после успешного входа
            window.location.href = '/dashboard';
        }
    };

    return (
        <div style={styles.container}>
            <form onSubmit={handleLogin} style={styles.card}>
                <h2 style={styles.title}>Вход в сервис</h2>

                {errorMsg && <div style={styles.error}>{errorMsg}</div>}

                <div style={styles.inputGroup}>
                    <label style={styles.label}>E-mail</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@mail.com"
                        required
                        style={styles.input}
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Пароль</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        style={styles.input}
                    />
                </div>

                <button type="submit" disabled={loading} style={styles.button}>
                    {loading ? 'Вход...' : 'Войти'}
                </button>
            </form>
        </div>
    );
}

// Базовые стили для быстрого старта
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        fontFamily: 'sans-serif',
    },
    card: {
        width: '100%',
        maxWidth: '400px',
        padding: '32px',
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
    },
    title: {
        margin: '0 0 24px 0',
        textAlign: 'center',
        fontSize: '24px',
    },
    error: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        padding: '10px 14px',
        borderRadius: '6px',
        marginBottom: '16px',
        fontSize: '14px',
        border: '1px solid #ef4444',
    },
    inputGroup: {
        marginBottom: '16px',
    },
    label: {
        display: 'block',
        marginBottom: '6px',
        fontSize: '14px',
        color: '#94a3b8',
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '6px',
        border: '1px solid #334155',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        fontSize: '16px',
        boxSizing: 'border-box',
    },
    button: {
        width: '100%',
        padding: '12px',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '8px',
    },
};