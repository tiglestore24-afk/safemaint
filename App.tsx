
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
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
import { ExtraDemands } from './pages/ExtraDemands'; // Importado
import { OMManagement } from './pages/OMManagement';
import { StorageService } from './services/storage';
import { SplashScreen } from './components/SplashScreen';
import { AvailabilityBoard } from './pages/AvailabilityBoard';
import { AppHeader } from './components/AppHeader';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check initial auth
    const auth = localStorage.getItem('safemaint_auth') === 'true';
    setIsAuthenticated(auth);
    
    if (auth) {
        StorageService.initialSync();
        StorageService.setupSubscriptions(); // Inicia ouvintes de Realtime
    }
    
    // AUTO-SYNC INTERVAL (10 Seconds)
    const syncInterval = setInterval(() => {
        if (navigator.onLine && localStorage.getItem('safemaint_auth') === 'true') {
            console.log('SAFEMAINT: Sincronização Automática (10s)...');
            StorageService.initialSync();
        }
    }, 10000);

    setIsLoading(false);
    
    return () => clearInterval(syncInterval);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    StorageService.initialSync();
    StorageService.setupSubscriptions(); // Inicia ouvintes de Realtime
  };

  const handleLogout = () => {
      localStorage.removeItem('safemaint_auth');
      localStorage.removeItem('safemaint_user');
      localStorage.removeItem('safemaint_role');
      setIsAuthenticated(false);
      window.location.href = '/';
  };

  // 1. SPLASH SCREEN (Prioridade Máxima Visual)
  if (showSplash) {
      return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // 2. LOADING STATE (Se o app ainda estiver carregando lógica pesada, opcional)
  if (isLoading) return null;

  // 3. NÃO AUTENTICADO -> LOGIN
  if (!isAuthenticated) {
      return (
          <HashRouter>
              <Routes>
                  <Route path="*" element={<Login onLogin={handleLogin} />} />
              </Routes>
          </HashRouter>
      );
  }

  // 4. APP AUTENTICADO
  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-gray-100">
        <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} onLogout={handleLogout} />
        
        <main 
            className="flex-1 overflow-auto p-4 md:p-8 pt-16 md:pt-8 w-full relative"
            style={{
                background: '#f3f4f6', // Cor base sólida e limpa (gray-100)
                backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', // Dot pattern muito sutil
                backgroundSize: '24px 24px'
            }}
        >
          <div className="max-w-[1920px] mx-auto">
            <AppHeader />
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/login" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/om-management" element={<OMManagement />} />
                <Route path="/art-emergencial" element={<ARTEmergencial />} />
                <Route path="/art-atividade" element={<ARTAtividade />} />
                <Route path="/checklist" element={<Checklist />} />
                <Route path="/availability" element={<AvailabilityBoard />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/tv-schedule" element={<TVSchedule />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/trash" element={<Trash />} />
                <Route path="/report" element={<Report />} />
                <Route path="/extra-demands" element={<ExtraDemands />} /> 
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
