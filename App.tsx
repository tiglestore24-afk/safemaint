import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ARTEmergencial } from './pages/ARTEmergencial';
import { ARTAtividade } from './pages/ARTAtividade';
import { Checklist } from './pages/Checklist';
import { Schedule } from './pages/Schedule';
import { TVSchedule } from './pages/TVSchedule';
import { Archive } from './pages/Archive';
import { Trash } from './pages/Trash';
import { Report } from './pages/Report';
import { Settings } from './pages/Settings';
import { Chat } from './pages/Chat';
import { Login } from './pages/Login';
import { OMManagement } from './pages/OMManagement';
import { StorageService } from './services/storage';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check local storage for auth token
    const auth = localStorage.getItem('safemaint_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      // Sync data from Supabase in background
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
    setIsAuthenticated(false);
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
        
        {/* Protected Routes Wrapper */}
        <Route 
          path="/*" 
          element={
            isAuthenticated ? (
              <div className="flex h-screen overflow-hidden bg-gray-200">
                <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} onLogout={handleLogout} />
                
                {/* Main Content Area with Industrial Texture Background */}
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