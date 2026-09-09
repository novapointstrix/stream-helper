import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tv2, ShieldCheck, LogOut, Sparkles, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { LOGO_OPTIONS, StreamIconRenderer } from '../StreamIconRenderer';

export const Navbar: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedLogoId, setSelectedLogoId] = useState<string>('burger');
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const navigate = useNavigate();

  const loadProfileIcon = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email ?? null);

      const { data } = await supabase
        .from('profiles')
        .select('stream_icon')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.stream_icon) {
        setSelectedLogoId(data.stream_icon);
      }
    } catch (err) {
      console.error('Ошибка загрузки иконки профиля:', err);
    }
  };

  useEffect(() => {
    loadProfileIcon();

    // Слушаем глобальное событие обновления иконки
    const handleIconChange = (event: CustomEvent<{ iconId: string }>) => {
      if (event.detail?.iconId) {
        setSelectedLogoId(event.detail.iconId);
      }
    };

    window.addEventListener('stream_icon_changed' as any, handleIconChange);

    return () => {
      window.removeEventListener('stream_icon_changed' as any, handleIconChange);
    };
  }, []);

  const handleSelectLogo = async (id: string) => {
    // 1. Мгновенно меняем иконку в локальном UI Navbar (Optimistic UI)
    setSelectedLogoId(id);
    setIsLogoModalOpen(false);

    // 2. Оповещаем все остальные компоненты на странице
    window.dispatchEvent(
      new CustomEvent('stream_icon_changed', { detail: { iconId: id } })
    );

    // 3. Фоново отправляем изменения в Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ stream_icon: id })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Ошибка сохранения иконки профиля:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const currentLogoObj = LOGO_OPTIONS.find((opt) => opt.id === selectedLogoId) || LOGO_OPTIONS[0];

  return (
    <header className="bg-[#121215] border-b border-[#27272A] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

        {/* Динамичный логотип */}
        <Link to="/" className="flex items-center gap-2.5 group relative">
          <div className="relative p-1.5 bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 rounded-xl text-zinc-950 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 group-hover:scale-105 transition-all duration-300">
            <Tv2 size={18} className="stroke-[2.5]" />
            <Sparkles
              size={10}
              className="absolute -top-1 -right-1 text-amber-200 animate-pulse"
            />
          </div>

          <div className="relative flex flex-col">
            <span className="absolute -top-2.5 -right-6 text-[9px] font-extrabold font-mono px-1 py-0.2 bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 rounded-md tracking-wider shadow-sm uppercase scale-90">
              BETA
            </span>

            <span className="font-black text-sm tracking-tight text-white group-hover:text-amber-400 transition-colors">
              Stream<span className="text-amber-500 font-extrabold">Helper</span>
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {/* Плашка с иконкой, почтой и кнопкой выхода */}
          <div className="flex items-center gap-2 ml-2">

            {/* Кнопка выбора иконки возле почты */}
            <button
              onClick={() => setIsLogoModalOpen(true)}
              className={`p-1.5 rounded-xl border transition cursor-pointer hover:scale-105 ${currentLogoObj.bg}`}
              title="Изменить иконку стрима"
            >
              <StreamIconRenderer iconId={selectedLogoId} size={18} />
            </button>

            {userEmail && (
              <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-3 py-1.5 rounded-xl font-mono">
                <ShieldCheck size={14} />
                {userEmail}
              </span>
            )}

            <button
              onClick={handleLogout}
              className="bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-red-400 hover:border-red-500/40 p-1.5 rounded-xl transition cursor-pointer"
              title="Выйти из системы"
            >
              <LogOut size={14} />
            </button>
          </div>
        </nav>
      </div>

      {/* Модальное окно выбора иконки */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272A] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Выберите иконку стрима
              </h3>
              <button
                onClick={() => setIsLogoModalOpen(false)}
                className="text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Выбранный векторный символ будет отображаться в шапке, в центре интерактивного колеса и на оверлеях.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {LOGO_OPTIONS.map((item) => {
                const isSelected = selectedLogoId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectLogo(item.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition text-left cursor-pointer ${isSelected
                      ? 'bg-amber-500/10 border-amber-500 text-white'
                      : 'bg-[#18181B] border-[#27272A] hover:border-[#3F3F46] text-zinc-300 hover:text-white'
                      }`}
                  >
                    <div className={`p-2 rounded-lg border ${item.bg}`}>
                      <StreamIconRenderer iconId={item.id} size={20} />
                    </div>
                    <span className="text-xs font-medium leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};