import React, { useState, useEffect } from 'react';
import { useTelegram } from '../contexts/TelegramContext';
import { apiRequest } from '../utils/api';
import { 
  Calendar, 
  Award, 
  TrendingUp, 
  Users, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck 
} from 'lucide-react';

interface WithdrawalRecord {
  _id: string;
  amount: number;
  fee: number;
  netAmount: number;
  upiId: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: string;
}

interface ProfileData {
  telegramId: string;
  balance: number;
  totalEarned: number;
  streak: number;
  level: number;
  referralCount: number;
  createdAt: string;
  isBanned: boolean;
}

export const Profile: React.FC = () => {
  const { user } = useTelegram();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndTransactions = async () => {
    try {
      // 1. Fetch main user details
      const userRes = await apiRequest('/api/user/me');
      if (userRes.success) {
        setProfile(userRes.user);
      }

      // 2. Fetch wallet balance & withdrawals transactions
      const walletRes = await apiRequest('/api/wallet/balance');
      if (walletRes.success) {
        setWithdrawals(walletRes.withdrawals || []);
      }
    } catch (e) {
      console.error('Error loading profile and transaction details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndTransactions();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#94a3b8' }}>
        Loading your Profile...
      </div>
    );
  }

  // Cap level at 100 for safety / visual completeness
  const displayLevel = profile ? Math.min(100, profile.level) : 1;
  const levelProgress = (displayLevel / 100) * 100;
  const tapBonus = Math.floor(displayLevel / 10);

  return (
    <div style={{ padding: '0 20px 20px 20px' }}>
      <h1 className="page-title" style={{ marginTop: '20px' }}>User Profile</h1>
      <p className="page-subtitle">Your personal account details, statistics, and cashout history.</p>

      {/* Profile Info Header */}
      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="user-avatar" style={{ width: '60px', height: '60px', fontSize: '24px', flexShrink: 0 }}>
            {user?.first_name?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700' }}>
              {user?.first_name || 'Earning Master'} {user?.last_name || ''}
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span>ID: {profile?.telegramId || user?.id}</span>
              <span>@{user?.username || 'paisatap_user'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Level Progress Card */}
      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} style={{ color: 'var(--color-primary)' }} />
            Multiplier Level Capping
          </span>
          <span className="user-level-badge" style={{ padding: '2px 10px', fontSize: '12px' }}>
            Lvl {displayLevel} / 100
          </span>
        </div>
        
        {/* Progress Bar */}
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ width: `${levelProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-primary), #10b981)', borderRadius: '10px' }}></div>
        </div>
        
        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
          Tapping Multiplier Bonus: <strong style={{ color: '#fff' }}>+₹{tapBonus}/tap</strong>
        </div>
      </div>

      {/* Account Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '0 0 20px 0' }}>
        {/* Streak */}
        <div className="glass-card" style={{ margin: '0', padding: '14px' }}>
          <div style={{ color: 'var(--color-accent)', marginBottom: '6px' }}>
            <Calendar size={18} />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Daily Streak</div>
          <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px' }}>{profile?.streak || 0} Days</div>
        </div>

        {/* Referrals */}
        <div className="glass-card" style={{ margin: '0', padding: '14px' }}>
          <div style={{ color: 'var(--color-primary)', marginBottom: '6px' }}>
            <Users size={18} />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Referrals</div>
          <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px' }}>{profile?.referralCount || 0} Friends</div>
        </div>

        {/* Current Balance */}
        <div className="glass-card" style={{ margin: '0', padding: '14px' }}>
          <div style={{ color: 'var(--color-primary)', marginBottom: '6px' }}>
            <Wallet size={18} />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Available Paisa</div>
          <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px', color: 'var(--color-primary)' }}>
            ₹{profile?.balance.toFixed(2)}
          </div>
        </div>

        {/* Total Earned */}
        <div className="glass-card" style={{ margin: '0', padding: '14px' }}>
          <div style={{ color: 'var(--color-accent)', marginBottom: '6px' }}>
            <Award size={18} />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Earned</div>
          <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px' }}>
            ₹{profile?.totalEarned.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Account Info list */}
      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>Account Status</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
            <span style={{ 
              color: profile?.isBanned ? 'var(--color-danger)' : 'var(--color-primary)', 
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <ShieldCheck size={14} />
              {profile?.isBanned ? 'Banned' : 'Active'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '2px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Member Since:</span>
            <span style={{ fontWeight: '500' }}>
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions Ledger */}
      <h3 style={{ margin: '20px 0 10px 0', fontSize: '16px', fontWeight: '700' }}>Cashout Transactions</h3>
      <div className="list-container">
        {withdrawals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            No cashout history. Submit your first payout request in the Wallet tab!
          </div>
        ) : (
          withdrawals.map((tx) => (
            <div key={tx._id} className="list-item" style={{ padding: '12px 16px' }}>
              <div className="list-item-left">
                <div className="icon-box" style={{ 
                  background: tx.status === 'completed' 
                    ? 'rgba(34, 197, 94, 0.1)' 
                    : tx.status === 'rejected' 
                    ? 'rgba(239, 68, 68, 0.1)' 
                    : 'rgba(245, 158, 11, 0.1)',
                  color: tx.status === 'completed' 
                    ? 'var(--color-primary)' 
                    : tx.status === 'rejected' 
                    ? 'var(--color-danger)' 
                    : 'var(--color-accent)'
                }}>
                  {tx.status === 'completed' && <CheckCircle2 size={18} />}
                  {tx.status === 'rejected' && <XCircle size={18} />}
                  {(tx.status === 'pending' || tx.status === 'processing') && <Clock size={18} />}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                    UPI: {tx.upiId}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                  ₹{tx.amount.toFixed(2)}
                </div>
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: '600', 
                  textTransform: 'uppercase', 
                  color: tx.status === 'completed' 
                    ? 'var(--color-primary)' 
                    : tx.status === 'rejected' 
                    ? 'var(--color-danger)' 
                    : 'var(--color-accent)'
                }}>
                  {tx.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
