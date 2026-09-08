// src/lib/auth.ts
const ADMIN_PASSWORD_KEY = 'admin_authenticated';
// Задайте ваш пароль для админки здесь или через env переменную VITE_ADMIN_PASSWORD
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '8cds1231_1sos1!';

export const checkIsAuthenticated = (): boolean => {
    return localStorage.getItem(ADMIN_PASSWORD_KEY) === 'true';
};

export const loginAdmin = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
        localStorage.setItem(ADMIN_PASSWORD_KEY, 'true');
        return true;
    }
    return false;
};

export const logoutAdmin = (): void => {
    localStorage.removeItem(ADMIN_PASSWORD_KEY);
};