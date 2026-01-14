
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { ExtraDemands } from './pages/ExtraDemands'; 
import { OMManagement } from './pages/OMManagement';
import { StorageService } from './services/storage';
import { SplashScreen } from './components/SplashScreen';
import { AvailabilityBoard } from './pages/AvailabilityBoard';
import { AppHeader } from './components/AppHeader';
import { StandbyScreen } from './components/StandbyScreen'; // Importado

// --- CONFIGURAÇÃO DE TEMPO DE ESPERA (MS) ---
// 5 Minutos = 300000 ms
const IDLE_TIMEOUT = 300000; 

// --- COMPONENTE DE LAYOUT INTERNO ---
// Separa a lógica de layout (Sidebar/Header) do roteamento principal
const AppLayout: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Identifica se é o modo TV para remover header/sidebar
    const isTvMode = location.pathname === '/tv-schedule';

    if (isTvMode) {
        return (
            <div className="h-screen w-full bg-slate-900 overflow-hidden">
                <Routes>
                    <Route path="/tv-schedule" element={<TVSchedule />} />
                </Routes>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100">
            <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} onLogout={onLogout} />
            
            <main 
                className="flex-1 overflow-auto p-4 md:p-8 pt-16 md:pt-8 w-full relative"
                style={{
                    background: '#f3f4f6', 
                    backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', 
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
                        {/* Route for TV Schedule exists but is handled by the conditional above if visited directly via URL */}
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
    );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  
  // Standby State
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (isIdle) setIsIdle(false);
      
      // Só ativa o timer se estiver autenticado
      if (isAuthenticated) {
          idleTimerRef.current = setTimeout(() => {
              setIsIdle(true);
          }, IDLE_TIMEOUT);
      }
  }, [isAuthenticated, isIdle]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => resetIdleTimer();

    if (isAuthenticated) {
        events.forEach(event => window.addEventListener(event, handleActivity));
        resetIdleTimer(); // Inicia contagem
    }

    return () => {
        events.forEach(event => window.removeEventListener(event, handleActivity));
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isAuthenticated, resetIdleTimer]);

  useEffect(() => {
    const auth = localStorage.getItem('safemaint_auth') === 'true';
    setIsAuthenticated(auth);
    
    if (auth) {
        StorageService.initialSync();
        StorageService.setupSubscriptions();
    }
    
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
    StorageService.setupSubscriptions();
  };

  const handleLogout = () => {
      localStorage.removeItem('safemaint_auth');
      localStorage.removeItem('safemaint_user');
      localStorage.removeItem('safemaint_role');
      setIsAuthenticated(false);
      setIsIdle(false); // Reseta standby ao sair
      window.location.href = '/';
  };

  if (showSplash) {
      return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (isLoading) return null;

  if (!isAuthenticated) {
      return (
          <HashRouter>
              <Routes>
                  <Route path="*" element={<Login onLogin={handleLogin} />} />
              </Routes>
          </HashRouter>
      );
  }

  return (
    <>
        {isIdle && <StandbyScreen onWake={resetIdleTimer} />}
        <HashRouter>
            <AppLayout onLogout={handleLogout} />
        </HashRouter>
    </>
  );
};

export default App;
