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
    setSelectedLogoId(id);
    setIsLogoModalOpen(false);

    window.dispatchEvent(
      new CustomEvent('stream_icon_changed', { detail: { iconId: id } })
    );

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
    <header className="bg-[#121215] border-b border-[#27272A] sticky top-0 z-50 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">

        {/* Динамичный логотип */}
        <Link to="/" className="flex items-center gap-2 group relative shrink-0">
          <div className="relative p-1.5 bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 rounded-xl text-zinc-950 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 group-hover:scale-105 transition-all duration-300">
            <Tv2 size={18} className="stroke-[2.5]" />
            <Sparkles
              size={10}
              className="absolute -top-1 -right-1 text-amber-200 animate-pulse"
            />
          </div>

          <div className="relative flex flex-col">
            <span className="absolute -top-2.5 -right-5 text-[8px] font-extrabold font-mono px-1 py-0.2 bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 rounded-md tracking-wider shadow-sm uppercase scale-90">
              BETA
            </span>

            <span className="font-black text-xs sm:text-sm tracking-tight text-white group-hover:text-amber-400 transition-colors">
              Stream<span className="text-amber-500 font-extrabold">Helper</span>
            </span>
          </div>
        </Link>

        {/* Правый блок действий */}
        <nav className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">

            {/* Фиксированная пропорциональная кнопка иконки */}
            <button
              onClick={() => setIsLogoModalOpen(true)}
              className={`w-9 h-9 aspect-square shrink-0 rounded-xl border transition cursor-pointer hover:scale-105 flex items-center justify-center ${currentLogoObj.bg}`}
              title="Изменить иконку стрима"
            >
              <StreamIconRenderer iconId={selectedLogoId} size={18} />
            </button>

            {/* Блок почты с адаптивным скрытием и Truncate */}
            {userEmail && (
              <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-2.5 py-1.5 rounded-xl font-mono max-w-[130px] sm:max-w-[220px]">
                <ShieldCheck size={14} className="shrink-0" />
                <span className="truncate">{userEmail}</span>
              </span>
            )}

            <button
              onClick={handleLogout}
              className="w-9 h-9 aspect-square shrink-0 bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-red-400 hover:border-red-500/40 rounded-xl transition cursor-pointer flex items-center justify-center"
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
          <div className="bg-[#121215] border border-[#27272A] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Выберите иконку стрима
              </h3>
              <button
                onClick={() => setIsLogoModalOpen(false)}
                className="text-zinc-400 hover:text-white transition cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Выбранный векторный символ будет отображаться в шапке, в центре интерактивного колеса и на оверлеях.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
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
                    <div className={`p-2 rounded-lg border shrink-0 flex items-center justify-center w-8 h-8 aspect-square ${item.bg}`}>
                      <StreamIconRenderer iconId={item.id} size={18} />
                    </div>
                    <span className="text-xs font-medium leading-tight truncate">{item.label}</span>
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