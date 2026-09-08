import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tv2, ShieldCheck, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export const Navbar: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserEmail(data.user.email ?? null);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <header className="bg-[#121215] border-b border-[#27272A] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="p-1.5 bg-[#18181B] border border-[#27272A] rounded-xl text-[#F4F4F5] group-hover:border-[#3F3F46] transition">
            <Tv2 size={16} />
          </div>
          <span className="font-semibold text-xs tracking-tight text-[#F4F4F5]">
            Stream<span className="text-[#A1A1AA] font-normal">Helper</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {/* Плашка админа и кнопка Выхода */}
          <div className="flex items-center gap-2 ml-2">
            <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-3 py-1.5 rounded-xl font-mono">
              <ShieldCheck size={14} />
              {userEmail}
            </span>
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
    </header>
  );
};