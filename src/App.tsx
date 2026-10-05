import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { AdminDashboard } from './pages/AdminDashboard';
import { HistoryPage } from './pages/HistoryPage';
import { OBSOverlayPage } from './pages/OBSOverlayPage';
import { InvisibleMusicWidget } from './components/InvisibleMusicWidget';
import { MusicAdminPage } from './pages/MusicAdminPage';

// Обертка для скрытия Navbar на страницах OBS оверлеев и виджетов
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isOverlay = location.pathname.startsWith('/overlay') || location.pathname.startsWith('/widget');

  return (
    <div className={`min-h-screen ${isOverlay ? 'bg-transparent' : 'bg-[#060102] text-gray-100'} font-sans`}>
      {!isOverlay && <Navbar />}
      {children}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/streams" element={<HistoryPage />} />
          <Route path="/admin/streams/:id" element={<AdminDashboard />} />
          <Route path="/admin/music" element={<MusicAdminPage />} />
          <Route path="/overlay/:streamId" element={<OBSOverlayPage />} />
          <Route path="/widget/music/:id" element={<InvisibleMusicWidget />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;