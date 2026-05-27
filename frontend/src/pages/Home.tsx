import React, { useState, useEffect, useRef } from 'react';
import { useTelegram } from '../contexts/TelegramContext';
import { apiRequest } from '../utils/api';
import { AdsgramService } from '../utils/adsgram';
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
  adRefillsWatched: number;
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
  const [adRefillLoading, setAdRefillLoading] = useState(false);
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

    // Setup background energy recovery interval (completely refills in 4 hours, 14,400 seconds)
    const energyInterval = setInterval(() => {
      if (userRef.current) {
        const u = userRef.current;
        if (u.energy < u.maxEnergy) {
          const refillRate = u.maxEnergy / 14400;
          setDbUser({
            ...u,
            energy: Math.min(u.maxEnergy, u.energy + refillRate),
          });
        }
      }
    }, 1000);

    return () => {
      clearInterval(energyInterval);
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
      // Sync any remaining taps immediately
      if (pendingTapsRef.current > 0) {
        syncTapsWithBackend();
      }
    };
  }, []);

  // Handle ad watch energy refill
  const handleAdEnergyRefill = async () => {
    if (adRefillLoading || !dbUser) return;
    if (dbUser.energy >= dbUser.maxEnergy) {
      alert('Your energy is already full!');
      return;
    }

    setAdRefillLoading(true);
    triggerHaptic('medium');

    try {
      // Trigger Ad (PaisaTap ad block ID is configured, e.g. 'block_energy_refill')
      await AdsgramService.showAd('block_energy_refill');

      const data = await apiRequest('/api/user/ad-watch', {
        method: 'POST',
        body: { action: 'energy_refill' },
      });

      if (data.success) {
        setDbUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            energy: data.energy,
            adRefillsWatched: data.adRefillsWatched,
          };
        });

        triggerHaptic('success');
        
        if (data.energy === dbUser.maxEnergy) {
          confetti({
            particleCount: 50,
            spread: 40,
            origin: { y: 0.7 },
            colors: ['#10b981', '#ffffff'],
          });
        }
      }
    } catch (err: any) {
      console.error('Ad refill error:', err);
      triggerHaptic('error');
      if (err.message !== 'User skipped the ad.') {
        alert(err.message || 'Failed to play ad. Please try again.');
      }
    } finally {
      setAdRefillLoading(false);
    }
  };

  // Handle tap event
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dbUser || dbUser.energy < 1) {
      triggerHaptic('error');
      return;
    }

    triggerHaptic('light');

    // Get click location relative to container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate value (₹0.05 base + ₹1 for every 10 levels)
    const bonus = Math.floor(dbUser.level / 10);
    const clickValue = (0.05 + bonus).toFixed(2);

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

    // Sync taps periodically (throttle to every 1 second)
    if (!tapTimerRef.current) {
      tapTimerRef.current = setTimeout(() => {
        syncTapsWithBackend();
        tapTimerRef.current = null;
      }, 1000);
    }
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
              Bonus: +₹{Math.floor((dbUser?.level || 1) / 10)}/tap
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
          Consume energy to earn ₹{(0.05 + Math.floor((dbUser?.level || 1) / 10)).toFixed(2)} per tap
        </div>

        <div className="tap-container">
          <div className="tap-button" onClick={handleTap}>
            <svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              {/* Outer shadow / 3D rim */}
              <circle cx="75" cy="75" r="70" fill="url(#goldRimGradient)" stroke="url(#goldRimBorder)" strokeWidth="4" />
              
              {/* Inner bevel */}
              <circle cx="75" cy="75" r="58" fill="url(#innerGreenGradient)" stroke="url(#goldInnerBorder)" strokeWidth="2" />
              
              {/* Indian Rupee Stylized Symbol */}
              <path d="M52 48H92 M52 61H84 M67 48V78 M67 61C80 61 80 78 67 78 M67 78L88 102" stroke="url(#rupeeGoldGradient)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              
              {/* Glowing reflections / Sparkles */}
              <circle cx="75" cy="75" r="66" stroke="white" strokeOpacity="0.15" strokeWidth="2" strokeDasharray="40 180" style={{ transformOrigin: 'center', animation: 'rotateGlow 8s linear infinite' }} />
              
              {/* Gradients */}
              <defs>
                <linearGradient id="goldRimGradient" x1="0" y1="0" x2="150" y2="150" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="30%" stopColor="#f59e0b" />
                  <stop offset="70%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
                <linearGradient id="goldRimBorder" x1="150" y1="0" x2="0" y2="150" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#451a03" />
                </linearGradient>
                <linearGradient id="innerGreenGradient" x1="25" y1="25" x2="125" y2="125" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#064e3b" />
                  <stop offset="50%" stopColor="#022c22" />
                  <stop offset="100%" stopColor="#064e3b" />
                </linearGradient>
                <linearGradient id="goldInnerBorder" x1="0" y1="0" x2="150" y2="150" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="rupeeGoldGradient" x1="0" y1="0" x2="40" y2="50" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
            </svg>
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
              {Math.floor(dbUser?.energy || 0)} / {dbUser?.maxEnergy}
            </span>
          </div>
          <div className="energy-bar-bg">
            <div
              className="energy-bar-fill"
              style={{ width: `${((dbUser?.energy || 0) / (dbUser?.maxEnergy || 1000)) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Ad Refill Section */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
            <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Instant Refill progress:
              <span style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3].map((num) => (
                  <span
                    key={num}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: (dbUser?.adRefillsWatched || 0) >= num ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'inline-block',
                      transition: 'background-color 0.2s',
                    }}
                  />
                ))}
              </span>
            </span>
            {dbUser && dbUser.energy >= dbUser.maxEnergy ? (
              <span style={{ color: 'var(--color-primary)', fontSize: '11px', fontWeight: '500' }}>Fully Charged</span>
            ) : (
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>{dbUser?.adRefillsWatched || 0}/3 watched</span>
            )}
          </div>
          <button
            className="btn btn-accent"
            style={{ width: '100%', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', minHeight: '42px' }}
            disabled={!dbUser || dbUser.energy >= dbUser.maxEnergy || adRefillLoading}
            onClick={handleAdEnergyRefill}
          >
            <Sparkles size={14} />
            {adRefillLoading ? 'Loading Video Sponsor...' : dbUser && dbUser.energy >= dbUser.maxEnergy ? 'Energy Already Full' : 'Watch Ad to Refill (+1/3)'}
          </button>
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
