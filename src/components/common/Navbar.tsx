import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Tv } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  if (location.pathname.startsWith('/overlay')) return null;

  const links = [
    { to: '/admin', label: 'Дашборд Стрима', icon: LayoutDashboard },
    { to: '/admin/streams', label: 'Все Стримы (История)', icon: History },
  ];

  return (
    <nav className="bg-[#090204]/90 border-b border-red-900/40 px-8 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-700 rounded-xl text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]">
          <Tv size={20} />
        </div>
        <span className="font-black text-lg tracking-wider text-white uppercase">
          БОНУС БАЙ <span className="text-red-500">ТРЕКЕР</span>
        </span>
      </div>

      <div className="flex gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to || (link.to === '/admin' && location.pathname.startsWith('/admin/streams/'));
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                isActive
                  ? 'bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                  : 'text-red-300/60 hover:text-white hover:bg-red-950/40'
              }`}
            >
              <Icon size={16} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};