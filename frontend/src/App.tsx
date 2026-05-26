import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { TelegramProvider, useTelegram } from './contexts/TelegramContext';
import { apiRequest } from './utils/api';

// Pages
import { Home } from './pages/Home';
import { Tasks } from './pages/Tasks';
import { Games } from './pages/Games';
import { Refer } from './pages/Refer';
import { Wallet } from './pages/Wallet';
import { Admin } from './pages/Admin';

// Icons
import { Home as HomeIcon, CheckSquare, Gamepad2, Users, Wallet as WalletIcon, Settings } from 'lucide-react';

const AppContent: React.FC = () => {
  const { initData, isDevMode, triggerHaptic } = useTelegram();
  const [authComplete, setAuthComplete] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const location = useLocation();

  // Run Telegram onboarding and session handshakes on mount
  useEffect(() => {
    if (!initData) return;

    // Cache signatures so apiRequest can intercept them in header mounts
    localStorage.setItem('tg_init_data', initData);
    localStorage.setItem('is_dev_mode', isDevMode ? 'true' : 'false');

    // Detect Telegram deep link referral parameter e.g., https://t.me/PaisaTapBot?start=ref_12345
    let referrerId: string | null = null;
    
    try {
      // Access Telegram WebApp startup parameters
      const startParam = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param;
      if (startParam && startParam.startsWith('ref_')) {
        referrerId = startParam.substring(4);
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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0b0f19', color: '#fff', padding: '30px', textAlign: 'center', gap: '20px' }}>
        <div className="user-avatar" style={{ width: '60px', height: '60px', fontSize: '24px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)' }}>⚠️</div>
        <div style={{ fontWeight: '700', fontSize: '18px' }}>Authentication Failed</div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5', maxWidth: '300px' }}>
          {authError}
          <br /><br />
          <span style={{ color: 'var(--color-accent)' }}>Hint:</span> If this is a signature validation error, make sure your <strong>TELEGRAM_BOT_TOKEN</strong> environment variable on Render matches your bot's token from @BotFather.
        </div>
      </div>
    );
  }

  if (!authComplete) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0b0f19', color: '#fff', gap: '15px' }}>
        <div className="user-avatar" style={{ width: '50px', height: '50px', fontSize: '20px' }}>P</div>
        <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Verifying credentials...</div>
      </div>
    );
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
        {/* Support simple bypass access to Admin route on development */}
        {isDevMode && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => triggerHaptic('light')}>
            <Settings />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>
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
