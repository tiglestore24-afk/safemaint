import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { ARTEmergencial } from './pages/ARTEmergencial.tsx';
import { ARTAtividade } from './pages/ARTAtividade.tsx';
import { Checklist } from './pages/Checklist.tsx';
import { Schedule } from './pages/Schedule.tsx';
import { TVSchedule } from './pages/TVSchedule.tsx';
import { Archive } from './pages/Archive.tsx';
import { Trash } from './pages/Trash.tsx';
import { Report } from './pages/Report.tsx';
import { Settings } from './pages/Settings.tsx';
import { Chat } from './pages/Chat.tsx';
import { Login } from './pages/Login.tsx';
import { OMManagement } from './pages/OMManagement.tsx';
import { StorageService } from './services/storage.ts';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('safemaint_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      StorageService.initialSync();
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    StorageService.initialSync();
  };

  const handleLogout = () => {
    localStorage.removeItem('safemaint_auth');
    localStorage.removeItem('safemaint_user');
    localStorage.removeItem('safemaint_role');
    setIsAuthenticated(false);
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
        
        <Route 
          path="/*" 
          element={
            isAuthenticated ? (
              <div className="flex h-screen overflow-hidden bg-gray-200">
                <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} onLogout={handleLogout} />
                
                <main 
                    className="flex-1 overflow-auto p-4 md:p-8 pt-16 md:pt-8 w-full relative"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)),
                            repeating-linear-gradient(45deg, #e5e7eb 0, #e5e7eb 1px, transparent 0, transparent 50%)
                        `,
                        backgroundSize: '20px 20px'
                    }}
                >
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/om-management" element={<OMManagement />} />
                    <Route path="/art-emergencial" element={<ARTEmergencial />} />
                    <Route path="/art-atividade" element={<ARTAtividade />} />
                    <Route path="/checklist" element={<Checklist />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/tv-schedule" element={<TVSchedule />} />
                    <Route path="/archive" element={<Archive />} />
                    <Route path="/trash" element={<Trash />} />
                    <Route path="/report" element={<Report />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </main>
              </div>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </HashRouter>
  );
};

export default App;