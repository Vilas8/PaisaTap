import React, { useState, useEffect, useRef } from 'react';
import { useTelegram } from '../contexts/TelegramContext';
import { apiRequest } from '../utils/api';
import confetti from 'canvas-confetti';
import { Sparkles, Calendar, Zap, Award } from 'lucide-react';

interface UserData {
  telegramId: string;
  balance: number;
  totalEarned: number;
  streak: number;
  lastDailyClaim?: string;
  level: number;
  energy: number;
  maxEnergy: number;
}

interface FloatingPoint {
  id: number;
  x: number;
  y: number;
  amount: string;
}

export const Home: React.FC = () => {
  const { user, triggerHaptic } = useTelegram();
  const [dbUser, setDbUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyClaimLoading, setDailyClaimLoading] = useState(false);
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const pendingTapsRef = useRef(0);

  const tapTimerRef = useRef<any>(null);
  const userRef = useRef<UserData | null>(null);

  // Sync ref with state so the interval/timer can access the fresh data
  useEffect(() => {
    userRef.current = dbUser;
  }, [dbUser]);

  // Fetch initial profile on load
  const fetchProfile = async () => {
    try {
      const data = await apiRequest('/api/user/me');
      if (data.success) {
        setDbUser(data.user);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Setup background energy recovery interval (3 energy per second)
    const energyInterval = setInterval(() => {
      if (userRef.current) {
        const u = userRef.current;
        if (u.energy < u.maxEnergy) {
          setDbUser({
            ...u,
            energy: Math.min(u.maxEnergy, u.energy + 3),
          });
        }
      }
    }, 1000);

    return () => {
      clearInterval(energyInterval);
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  // Handle tap event
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dbUser || dbUser.energy <= 0) {
      triggerHaptic('error');
      return;
    }

    triggerHaptic('light');

    // Get click location relative to container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate value (including 5% level bonus)
    const multiplier = 1 + (dbUser.level - 1) * 0.05;
    const clickValue = (0.05 * multiplier).toFixed(2);

    // Add floating point particle
    const newPoint: FloatingPoint = {
      id: Date.now() + Math.random(),
      x,
      y,
      amount: `+₹${clickValue}`,
    };

    setFloatingPoints((prev) => [...prev, newPoint]);

    // Clean up particles
    setTimeout(() => {
      setFloatingPoints((prev) => prev.filter((p) => p.id !== newPoint.id));
    }, 800);

    // Optimistic UI updates
    const earned = parseFloat(clickValue);
    setDbUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        energy: Math.max(0, prev.energy - 1),
        balance: Math.round((prev.balance + earned) * 100) / 100,
        totalEarned: Math.round((prev.totalEarned + earned) * 100) / 100,
      };
    });

    // Add to pending batch
    pendingTapsRef.current += 1;

    // Reset sync timer (de-bounce backend save to 1.5s)
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      syncTapsWithBackend();
    }, 1500);
  };

  // Sync accumulated taps with Express backend
  const syncTapsWithBackend = async () => {
    const currentPending = pendingTapsRef.current;
    if (currentPending <= 0) return;

    pendingTapsRef.current = 0; // reset pending counter

    try {
      const data = await apiRequest('/api/user/tap', {
        method: 'POST',
        body: { taps: currentPending },
      });
      if (data.success) {
        // Re-sync final stats with backend
        setDbUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            balance: data.balance,
            totalEarned: data.totalEarned,
            energy: data.energy,
          };
        });
      }
    } catch (err) {
      console.error('Failed to sync taps:', err);
      fetchProfile(); // Rollback to actual backend state if sync fails
    }
  };

  // Handle daily streak claim
  const handleDailyClaim = async () => {
    if (dailyClaimLoading) return;
    setDailyClaimLoading(true);
    triggerHaptic('medium');

    try {
      const data = await apiRequest('/api/user/daily-claim', { method: 'POST' });
      if (data.success) {
        // Trigger confetti animation!
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#22c55e', '#f59e0b', '#ffffff'],
        });

        setDbUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            balance: data.balance,
            streak: data.streak,
            lastDailyClaim: new Date().toISOString(),
          };
        });

        triggerHaptic('success');
      }
    } catch (err: any) {
      triggerHaptic('error');
      alert(err.message || 'Already claimed today!');
    } finally {
      setDailyClaimLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#94a3b8' }}>
        Loading PaisaTap Dashboard...
      </div>
    );
  }

  // Calculate if today's reward is claimable
  const isDailyRewardClaimable = () => {
    if (!dbUser || !dbUser.lastDailyClaim) return true;
    const lastClaim = new Date(dbUser.lastDailyClaim);
    const now = new Date();
    return now.setHours(0, 0, 0, 0) - lastClaim.setHours(0, 0, 0, 0) > 0;
  };

  const dailyClaimedToday = !isDailyRewardClaimable();

  return (
    <div>
      {/* User Status Bar */}
      <div className="glass-card" style={{ marginTop: '20px', marginBottom: '10px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="user-avatar">
              {user?.first_name?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>
                {user?.first_name || 'Earning Master'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                @{user?.username || 'paisatap_user'}
              </div>
            </div>
          </div>
          
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <span className="user-level-badge">Lvl {dbUser?.level}</span>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Bonus: +{((dbUser?.level || 1) - 1) * 5}%
            </div>
          </div>
        </div>
      </div>

      {/* Balance display */}
      <div className="glass-card" style={{ marginTop: '0', marginBottom: '10px' }}>
        <div className="balance-display">
          <div className="balance-title">Paisa Balance</div>
          <div className="balance-amount">
            <span className="balance-symbol">₹</span>
            {dbUser?.balance.toFixed(2)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <Award size={14} style={{ color: 'var(--color-accent)' }} />
            Total Earned: ₹{dbUser?.totalEarned.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Tapping Game */}
      <div className="glass-card" style={{ marginTop: '0', marginBottom: '10px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '5px' }}>Tap to Earn Paisa</div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
          Consume energy to earn ₹{(0.05 * (1 + ((dbUser?.level || 1) - 1) * 0.05)).toFixed(2)} per tap
        </div>

        <div className="tap-container">
          <div className="tap-button" onClick={handleTap}>
            {floatingPoints.map((pt) => (
              <span
                key={pt.id}
                className="floating-point"
                style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
              >
                {pt.amount}
              </span>
            ))}
          </div>
          <div className="tap-glow-ring"></div>
        </div>

        {/* Energy bar */}
        <div className="energy-container">
          <div className="energy-header">
            <span className="energy-label">
              <Zap size={14} fill="var(--color-primary)" stroke="none" />
              Energy
            </span>
            <span>
              {dbUser?.energy} / {dbUser?.maxEnergy}
            </span>
          </div>
          <div className="energy-bar-bg">
            <div
              className="energy-bar-fill"
              style={{ width: `${((dbUser?.energy || 0) / (dbUser?.maxEnergy || 1000)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Daily streak claim */}
      <div className="glass-card" style={{ marginTop: '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontWeight: '600', fontSize: '15px' }}>Daily Check-In</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Streak: {dbUser?.streak} / 7 Days
          </span>
        </div>

        <div className="daily-reward-grid">
          {[1, 2, 5, 10, 15, 25, 50].map((amount, idx) => {
            const dayNum = idx + 1;
            const isClaimed = dbUser ? dbUser.streak >= dayNum && !isDailyRewardClaimable() : false;
            const isToday = dbUser ? (dbUser.streak === idx && isDailyRewardClaimable()) || (dbUser.streak === dayNum && !isDailyRewardClaimable()) : false;

            let cardClass = 'daily-day-card locked';
            if (isClaimed) cardClass = 'daily-day-card claimed';
            else if (isToday) cardClass = 'daily-day-card today';

            return (
              <div key={dayNum} className={cardClass}>
                <div className="daily-day-title">Day {dayNum}</div>
                <div className="daily-day-reward">₹{amount}</div>
              </div>
            );
          })}
        </div>

        <button
          className={`btn ${dailyClaimedToday ? 'btn-secondary' : 'btn-accent'}`}
          style={{ width: '100%', marginTop: '16px' }}
          onClick={handleDailyClaim}
          disabled={dailyClaimedToday || dailyClaimLoading}
        >
          <Sparkles size={16} />
          {dailyClaimedToday ? 'Claimed Today' : 'Claim Daily Reward'}
        </button>
      </div>
    </div>
  );
};
