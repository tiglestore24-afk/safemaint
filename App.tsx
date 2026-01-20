
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
import { TVSplitView } from './pages/TVSplitView'; 
import { Archive } from './pages/Archive';
import { Trash } from './pages/Trash';
import { Report } from './pages/Report';
import { Settings } from './pages/Settings';
import { ExtraDemands } from './pages/ExtraDemands'; 
import { OMManagement } from './pages/OMManagement';
import { AvailabilityBoard } from './pages/AvailabilityBoard';
import { StorageService } from './services/storage';
import { SplashScreen } from './components/SplashScreen';
import { AppHeader } from './components/AppHeader';

const IDLE_TIMEOUT = 28800000; 

const AppLayout: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    const isTvMode = location.pathname === '/tv-schedule' || location.pathname === '/tv-split';

    if (isTvMode) {
        return (
            <div className="h-screen w-full bg-slate-900 overflow-hidden">
                <Routes>
                    <Route path="/tv-schedule" element={<TVSchedule />} />
                    <Route path="/tv-split" element={<TVSplitView />} />
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
                        <Route path="/schedule" element={<Schedule />} />
                        <Route path="/archive" element={<Archive />} />
                        <Route path="/trash" element={<Trash />} />
                        <Route path="/report" element={<Report />} />
                        <Route path="/extra-demands" element={<ExtraDemands />} /> 
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/indicators" element={<AvailabilityBoard />} />
                        <Route path="*" element={<Navigate to="/dashboard" />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('safemaint_auth') === 'true';
  });
  const [showSplash, setShowSplash] = useState(true);
  
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (isIdle) setIsIdle(false);
      
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
        resetIdleTimer();
        
        StorageService.initialSync();
        StorageService.setupSubscriptions();
    }

    return () => {
        events.forEach(event => window.removeEventListener(event, handleActivity));
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isAuthenticated, resetIdleTimer]);

  const handleLogin = () => {
    localStorage.setItem('safemaint_auth', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
      StorageService.logoutUser();
      setIsAuthenticated(false);
      setIsIdle(false);
      window.location.href = '/';
  };

  if (showSplash) {
      return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

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
        {isIdle && <TVSplitView onWake={resetIdleTimer} />}
        <HashRouter>
            <AppLayout onLogout={handleLogout} />
        </HashRouter>
    </>
  );
};

export default App;
