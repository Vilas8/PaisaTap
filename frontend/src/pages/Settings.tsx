import React, { useState, useEffect } from 'react';
import { useTelegram } from '../contexts/TelegramContext';
import { apiRequest } from '../utils/api';
import { 
  Sliders, 
  RotateCcw, 
  Info, 
  ExternalLink, 
  ShieldCheck, 
  Terminal 
} from 'lucide-react';

interface HealthData {
  status: string;
  time: string;
}

export const Settings: React.FC = () => {
  const { user, triggerHaptic, isDevMode } = useTelegram();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const checkHealthStatus = async () => {
      const start = Date.now();
      try {
        const data = await apiRequest('/health');
        if (data.status === 'ok') {
          setHealth(data);
          setLatency(Date.now() - start);
        }
      } catch (err) {
        console.error('Failed to fetch API health status:', err);
      }
    };
    checkHealthStatus();
  }, []);

  const handleToggleDevMode = () => {
    triggerHaptic('medium');
    const nextMode = !isDevMode;
    localStorage.setItem('is_dev_mode', nextMode ? 'true' : 'false');
    if (nextMode) {
      // Prompt for dev inputs if turning on
      const newId = prompt('Enter Dev Telegram User ID (e.g. 12345):', localStorage.getItem('dev_user_id') || '9999');
      const newUsername = prompt('Enter Dev Telegram Username (e.g. dev_master):', localStorage.getItem('dev_user_name') || 'dev_master');
      if (newId) localStorage.setItem('dev_user_id', newId);
      if (newUsername) localStorage.setItem('dev_user_name', newUsername);
    } else {
      localStorage.removeItem('dev_user_id');
      localStorage.removeItem('dev_user_name');
    }
    window.location.reload();
  };

  const handleClearCache = () => {
    triggerHaptic('warning');
    if (confirm('Are you sure you want to clear your local session cache? This will reset local dev configs and reload.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div style={{ padding: '0 20px 20px 20px' }}>
      <h1 className="page-title" style={{ marginTop: '20px' }}>App Settings</h1>
      <p className="page-subtitle">Configure application settings, view diagnostic specs, and clear cache.</p>

      {/* Account Info Preview */}
      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="user-avatar" style={{ width: '40px', height: '40px', fontSize: '16px', flexShrink: 0 }}>
            {user?.first_name?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>
              {user?.first_name || 'Earning Master'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              @{user?.username || 'paisatap_user'}
            </div>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <h3 style={{ margin: '20px 0 10px 0', fontSize: '14px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>Diagnostics & Dev Mode</h3>
      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '8px 16px' }}>
        
        {/* Dev Mode toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Terminal size={18} style={{ color: 'var(--color-accent)' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>Sandbox Developer Mode</div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>Emulate Telegram context on web browsers.</div>
            </div>
          </div>
          <button 
            onClick={handleToggleDevMode} 
            className={`btn ${isDevMode ? 'btn-accent' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', minHeight: 'fit-content' }}
          >
            {isDevMode ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Clear cache */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <RotateCcw size={18} style={{ color: 'var(--color-danger)' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>Reset Session Cache</div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>Clears local key storage and re-authenticates.</div>
            </div>
          </div>
          <button 
            onClick={handleClearCache} 
            className="btn btn-secondary"
            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', minHeight: 'fit-content', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)' }}
          >
            Reset
          </button>
        </div>

      </div>

      {/* Support & Links */}
      <h3 style={{ margin: '20px 0 10px 0', fontSize: '14px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>Links & Support</h3>
      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '8px 16px' }}>
        
        {/* Support Channel */}
        <a 
          href="https://t.me/PaisaTapOfficial" 
          target="_blank" 
          rel="noreferrer"
          onClick={() => triggerHaptic('light')}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', textDecoration: 'none', color: '#fff' }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Sliders size={18} style={{ color: 'var(--color-primary)' }} />
            <div style={{ fontSize: '13px', fontWeight: '600' }}>Official Channel</div>
          </div>
          <ExternalLink size={14} style={{ color: 'var(--color-text-secondary)' }} />
        </a>

        {/* Support Bot */}
        <a 
          href="https://t.me/PaisaTapOfficial" 
          target="_blank" 
          rel="noreferrer"
          onClick={() => triggerHaptic('light')}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', textDecoration: 'none', color: '#fff' }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Info size={18} style={{ color: 'var(--color-accent)' }} />
            <div style={{ fontSize: '13px', fontWeight: '600' }}>Help & Support</div>
          </div>
          <ExternalLink size={14} style={{ color: 'var(--color-text-secondary)' }} />
        </a>

      </div>

      {/* App Information */}
      <h3 style={{ margin: '20px 0 10px 0', fontSize: '14px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>App Specifications</h3>
      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Client Version:</span>
            <span style={{ fontWeight: '500' }}>1.1.0</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Server Health:</span>
            <span style={{ 
              color: health ? 'var(--color-primary)' : 'var(--color-text-secondary)', 
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <ShieldCheck size={14} />
              {health ? 'Online' : 'Offline'}
            </span>
          </div>

          {latency !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>API Latency:</span>
              <span style={{ fontWeight: '500', color: latency < 150 ? 'var(--color-primary)' : latency < 350 ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                {latency} ms
              </span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
