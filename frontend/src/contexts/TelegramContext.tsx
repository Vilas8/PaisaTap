import React, { createContext, useContext, useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramContextType {
  tg: typeof WebApp;
  user: TelegramUser | null;
  initData: string;
  isReady: boolean;
  isDevMode: boolean;
  setDevUser: (telegramId: string, username?: string) => void;
  triggerHaptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    // 1. Tell Telegram the WebApp is ready to show
    try {
      WebApp.ready();
      WebApp.expand(); // Expand to full screen height
      
      // Parse User Details if available
      if (WebApp.initDataUnsafe && WebApp.initDataUnsafe.user) {
        setUser(WebApp.initDataUnsafe.user as TelegramUser);
        setInitData(WebApp.initData);
        setIsDevMode(false);
      } else {
        // Fallback for local browser development
        console.warn('Running outside Telegram context. Activating dev mode.');
        setIsDevMode(true);
        
        // Retrieve or generate persistent dev user credentials
        const cachedDevId = localStorage.getItem('dev_user_id') || Math.floor(100000 + Math.random() * 900000).toString();
        const cachedDevName = localStorage.getItem('dev_user_name') || 'dev_master';
        localStorage.setItem('dev_user_id', cachedDevId);
        localStorage.setItem('dev_user_name', cachedDevName);

        setUser({
          id: parseInt(cachedDevId),
          username: cachedDevName,
          first_name: 'Dev',
          last_name: 'PaisaTap',
        });
        setInitData(`user=%7B%22id%22%3A${cachedDevId}%2C%22first_name%22%3A%22Dev%22%2C%22last_name%22%3A%22PaisaTap%22%2C%22username%22%3A%22${cachedDevName}%22%7D&hash=mock_hash`);
      }
    } catch (e) {
      console.warn('Failed to initialize Telegram WebApp SDK. Falling back to dev mode:', e);
      setIsDevMode(true);
      
      // Retrieve or generate persistent dev user credentials
      const cachedDevId = localStorage.getItem('dev_user_id') || Math.floor(100000 + Math.random() * 900000).toString();
      const cachedDevName = localStorage.getItem('dev_user_name') || 'dev_master';
      localStorage.setItem('dev_user_id', cachedDevId);
      localStorage.setItem('dev_user_name', cachedDevName);

      setUser({
        id: parseInt(cachedDevId),
        username: cachedDevName,
        first_name: 'Dev',
        last_name: 'PaisaTap',
      });
      setInitData(`user=%7B%22id%22%3A${cachedDevId}%2C%22first_name%22%3A%22Dev%22%2C%22last_name%22%3A%22PaisaTap%22%2C%22username%22%3A%22${cachedDevName}%22%7D&hash=mock_hash`);
    } finally {
      setIsReady(true);
    }
  }, []);

  const setDevUser = (telegramId: string, username: string = 'dev_user') => {
    if (!isDevMode) return;
    localStorage.setItem('dev_user_id', telegramId);
    localStorage.setItem('dev_user_name', username);
    setUser({
      id: parseInt(telegramId),
      username,
      first_name: 'Dev',
      last_name: 'Custom',
    });
    setInitData(`user=%7B%22id%22%3A${telegramId}%2C%22first_name%22%3A%22Dev%22%2C%22last_name%22%3A%22Custom%22%2C%22username%22%3A%22${username}%22%7D&hash=mock_hash`);
    
    // Reload page to re-trigger API auth with new mock headers
    window.location.reload();
  };

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    try {
      if (WebApp.HapticFeedback) {
        if (type === 'success' || type === 'warning' || type === 'error') {
          WebApp.HapticFeedback.notificationOccurred(type);
        } else {
          WebApp.HapticFeedback.impactOccurred(type);
        }
      }
    } catch (e) {
      // Haptics not available in standard browser, fail silently
    }
  };

  return (
    <TelegramContext.Provider
      value={{
        tg: WebApp,
        user,
        initData,
        isReady,
        isDevMode,
        setDevUser,
        triggerHaptic,
      }}
    >
      {isReady ? children : <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0b0f19', color: '#fff' }}>Loading PaisaTap...</div>}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (context === undefined) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
};
