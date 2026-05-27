import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { TelegramProvider, useTelegram } from './contexts/TelegramContext';
import { apiRequest } from './utils/api';
import { LoadingScreen } from './components/LoadingScreen';

// Pages
import { Home } from './pages/Home';
import { Tasks } from './pages/Tasks';
import { Games } from './pages/Games';
import { Refer } from './pages/Refer';
import { Wallet } from './pages/Wallet';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
import { Settings as SettingsPage } from './pages/Settings';

// Icons
import { 
  Home as HomeIcon, 
  CheckSquare, 
  Gamepad2, 
  Users, 
  Wallet as WalletIcon, 
  Settings,
  CheckCircle,
  AlertTriangle,
  Info,
  ShieldAlert
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { initData, isDevMode, triggerHaptic } = useTelegram();
  const [authComplete, setAuthComplete] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customAlert, setCustomAlert] = useState<{ message: string; type: 'info' | 'warning' | 'success' } | null>(null);
  const location = useLocation();

  // Setup Global Alert Interceptor
  useEffect(() => {
    window.alert = (msg: string) => {
      let type: 'info' | 'warning' | 'success' = 'warning';
      const lower = msg.toLowerCase();
      
      if (lower.includes('success') || lower.includes('congratulations') || lower.includes('complete') || lower.includes('claim') || lower.includes('copied')) {
        type = 'success';
      } else if (lower.includes('invalid') || lower.includes('failed') || lower.includes('error') || lower.includes('insufficient') || lower.includes('not enough') || lower.includes('only') || lower.includes('limit') || lower.includes('cheating') || lower.includes('violation') || lower.includes('suspended')) {
        type = 'warning';
      } else {
        type = 'info';
      }

      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg && tg.HapticFeedback) {
          if (type === 'success') {
            tg.HapticFeedback.notificationOccurred('success');
          } else if (type === 'warning') {
            tg.HapticFeedback.notificationOccurred('warning');
          } else {
            tg.HapticFeedback.impactOccurred('light');
          }
        }
      } catch (e) {
        console.warn(e);
      }

      setCustomAlert({ message: msg, type });
    };
  }, []);

  // Run Telegram onboarding and session handshakes on mount
  useEffect(() => {
    if (!initData) return;

    // Cache signatures so apiRequest can intercept them in header mounts
    localStorage.setItem('tg_init_data', initData);
    localStorage.setItem('is_dev_mode', isDevMode ? 'true' : 'false');

    // Detect Telegram deep link referral parameter e.g., start=ref_12345 or start=12345
    let referrerId: string | null = null;
    
    try {
      // Access Telegram WebApp startup parameters
      const startParam = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param;
      if (startParam) {
        referrerId = startParam.startsWith('ref_') ? startParam.substring(4) : startParam;
        console.log(`Detected referral registration. Referrer Telegram ID: ${referrerId}`);
      }
    } catch (e) {
      console.warn('Error reading start_param:', e);
    }

    // Call authentication endpoint
    apiRequest('/api/auth/telegram', {
      method: 'POST',
      body: { referredBy: referrerId },
    })
      .then((data) => {
        if (data.success) {
          console.log('Session authentication verified.');
          setAuthError(null);
          setIsAdmin(!!data.isAdmin);
        }
      })
      .catch((err) => {
        console.error('Session handshakes failed:', err);
        setAuthError(err.message || 'Authentication handshakes failed');
      })
      .finally(() => {
        setAuthComplete(true);
      });
  }, [initData, isDevMode]);

  // Setup Back Button behaviour based on route stack
  useEffect(() => {
    try {
      const backButton = (window as any).Telegram?.WebApp?.BackButton;
      if (backButton) {
        if (location.pathname !== '/' && location.pathname !== '/home') {
          backButton.show();
          const handleBackClick = () => {
            triggerHaptic('light');
            window.location.hash = '#/home';
          };
          backButton.onClick(handleBackClick);
          return () => {
            backButton.offClick(handleBackClick);
          };
        } else {
          backButton.hide();
        }
      }
    } catch (e) {
      // standard browser sandbox, do nothing
    }
  }, [location.pathname]);

  if (authError) {
    const isSuspended = authError.toLowerCase().includes('suspended') || authError.toLowerCase().includes('forbidden') || authError.toLowerCase().includes('ban');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0b0f19', color: '#fff', padding: '30px', textAlign: 'center', gap: '20px', fontFamily: "'Outfit', sans-serif" }}>
        {isSuspended ? (
          <>
            <div style={{ 
              width: '72px', 
              height: '72px', 
              borderRadius: '50%', 
              background: 'rgba(239, 68, 68, 0.12)', 
              color: 'var(--color-danger)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
            }}>
              <ShieldAlert size={36} />
            </div>
            <div style={{ fontWeight: '700', fontSize: '20px' }}>Account Suspended</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', maxWidth: '320px' }}>
              {authError}
              <br /><br />
              If you believe this is an error, please contact the administrator via the support channels in the official community group.
            </div>
          </>
        ) : (
          <>
            <div style={{ 
              width: '72px', 
              height: '72px', 
              borderRadius: '50%', 
              background: 'rgba(245, 158, 11, 0.12)', 
              color: 'var(--color-accent)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)'
            }}>
              <AlertTriangle size={36} />
            </div>
            <div style={{ fontWeight: '700', fontSize: '20px' }}>Authentication Failed</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', maxWidth: '320px' }}>
              {authError}
              <br /><br />
              <span style={{ color: 'var(--color-accent)', fontWeight: '600' }}>Hint:</span> If this is a signature validation error, make sure your <strong>TELEGRAM_BOT_TOKEN</strong> environment variable on Render matches your bot's token from @BotFather.
            </div>
          </>
        )}
      </div>
    );
  }

  if (!authComplete) {
    return <LoadingScreen />;
  }

  return (
    <div className="app-container">
      {/* Scrollable Viewport */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/games" element={<Games />} />
          <Route path="/refer" element={<Refer />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>

      {/* Persistent Bottom Tab Bar */}
      <nav className="bottom-nav">
        <NavLink to="/home" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => triggerHaptic('light')}>
          <HomeIcon />
          <span>Home</span>
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => triggerHaptic('light')}>
          <CheckSquare />
          <span>Tasks</span>
        </NavLink>
        <NavLink to="/games" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => triggerHaptic('light')}>
          <Gamepad2 />
          <span>Games</span>
        </NavLink>
        <NavLink to="/refer" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => triggerHaptic('light')}>
          <Users />
          <span>Refer</span>
        </NavLink>
        <NavLink to="/wallet" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => triggerHaptic('light')}>
          <WalletIcon />
          <span>Wallet</span>
        </NavLink>
        {/* Render Admin option only for authorized admins */}
        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => triggerHaptic('light')}>
            <Settings />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      {/* Beautiful Custom Glassmorphic Alert Overlay */}
      {customAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(5, 8, 16, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: '24px',
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '320px',
            padding: '24px',
            textAlign: 'center',
            margin: 0,
            border: customAlert.type === 'success' 
              ? '1px solid rgba(34, 197, 94, 0.25)' 
              : customAlert.type === 'warning' 
              ? '1px solid rgba(245, 158, 11, 0.25)' 
              : '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(22, 31, 48, 0.95)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            borderRadius: '24px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: customAlert.type === 'success' 
                ? 'rgba(34, 197, 94, 0.12)' 
                : customAlert.type === 'warning' 
                ? 'rgba(245, 158, 11, 0.12)' 
                : 'rgba(148, 163, 184, 0.12)',
              color: customAlert.type === 'success' 
                ? 'var(--color-primary)' 
                : customAlert.type === 'warning' 
                ? 'var(--color-accent)' 
                : 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}>
              {customAlert.type === 'success' && <CheckCircle size={28} />}
              {customAlert.type === 'warning' && <AlertTriangle size={28} />}
              {customAlert.type === 'info' && <Info size={28} />}
            </div>

            <div style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              lineHeight: '1.5', 
              color: 'var(--color-text-primary)', 
              marginBottom: '20px',
              whiteSpace: 'pre-wrap'
            }}>
              {customAlert.message}
            </div>

            <button 
              onClick={() => { triggerHaptic('light'); setCustomAlert(null); }}
              className={`btn ${customAlert.type === 'success' ? 'btn-primary' : customAlert.type === 'warning' ? 'btn-accent' : 'btn-secondary'}`}
              style={{ width: '100%', minHeight: '42px', padding: '10px' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <TelegramProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </TelegramProvider>
  );
}
