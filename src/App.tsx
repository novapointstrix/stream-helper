import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { AdminDashboard } from './pages/AdminDashboard';
import { HistoryPage } from './pages/HistoryPage';
import { OBSOverlayPage } from './pages/OBSOverlayPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#060102] text-gray-100 font-sans">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/streams" element={<HistoryPage />} />
          <Route path="/admin/streams/:id" element={<AdminDashboard />} />
          <Route path="/overlay/:streamId" element={<OBSOverlayPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;