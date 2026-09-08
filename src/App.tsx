import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { AdminLoginModal } from './components/common/AdminLoginModal';
import { Navbar } from './components/common/Navbar';
import { Lock } from 'lucide-react';

import { AdminDashboard } from './pages/AdminDashboard';
import { HistoryPage } from './pages/HistoryPage';
import { WheelControlPage } from './pages/WheelControlPage';
import { OBSOverlayPage } from './pages/OBSOverlayPage';
import { OBSWheelOverlayPage } from './pages/OBSWheelOverlayPage';

export const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setIsAdmin(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Ошибка получения профиля:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(profile?.role === 'admin');
    } catch (err) {
      console.error('Ошибка проверки статуса:', err);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkAdminStatus();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-500 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          Проверка прав доступа...
        </div>
      </div>
    );
  }

  const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-[#0A0A0C] text-white flex flex-col items-center justify-center p-4 font-sans">
          <div className="bg-[#121215] border border-[#1F1F24] p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl space-y-5">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
              <Lock size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Доступ ограничен</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Для работы с панелью управления авторизуйтесь как администратор.
              </p>
            </div>
            <button
              onClick={() => setLoginModalOpen(true)}
              className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-black font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Войти в аккаунт
            </button>
          </div>

          <AdminLoginModal
            isOpen={loginModalOpen}
            onClose={() => setLoginModalOpen(false)}
            onSuccess={() => checkAdminStatus()}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full bg-[#0A0A0C] text-white font-sans flex flex-col">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto pb-32">
          {children}
        </main>
      </div>
    );
  };

  return (
    <Routes>
      {/* 🌐 ПУБЛИЧНЫЕ МАРШРУТЫ ДЛЯ OBS И ОВЕРЛЕЕВ */}

      {/* Оверлеи Бонус Бая */}
      <Route path="/overlay" element={<OBSOverlayPage />} />
      <Route path="/overlay/:id" element={<OBSOverlayPage />} />
      <Route path="/obs/overlay" element={<OBSOverlayPage />} />
      <Route path="/obs/overlay/:id" element={<OBSOverlayPage />} />

      {/* Оверлеи Интерактивного Колеса */}
      <Route path="/wheel/overlay" element={<OBSWheelOverlayPage />} />
      <Route path="/wheel/overlay/:id" element={<OBSWheelOverlayPage />} />
      <Route path="/wheel-overlay" element={<OBSWheelOverlayPage />} />
      <Route path="/wheel-overlay/:id" element={<OBSWheelOverlayPage />} />
      <Route path="/overlay/wheel" element={<OBSWheelOverlayPage />} />
      <Route path="/obs/wheel" element={<OBSWheelOverlayPage />} />
      <Route path="/obs/wheel/:id" element={<OBSWheelOverlayPage />} />

      {/* 🔒 ЗАЩИЩЕННЫЕ МАРШРУТЫ АДМИНКИ */}
      <Route path="/" element={<ProtectedLayout><HistoryPage /></ProtectedLayout>} />
      <Route path="/history" element={<ProtectedLayout><HistoryPage /></ProtectedLayout>} />
      <Route path="/dashboard" element={<ProtectedLayout><AdminDashboard /></ProtectedLayout>} />
      <Route path="/dashboard/:id" element={<ProtectedLayout><AdminDashboard /></ProtectedLayout>} />
      <Route path="/wheel" element={<ProtectedLayout><WheelControlPage /></ProtectedLayout>} />

      {/* Редирект с некорректных адресов */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;