import React, { useState, useEffect } from 'react';
import { useTelegram } from '../contexts/TelegramContext';
import { apiRequest } from '../utils/api';
import { Share2, Copy, Users, Trophy, Gift } from 'lucide-react';

interface ReferralStat {
  telegramId: string;
  username: string;
  name: string;
  level: number;
  status: 'completed' | 'pending';
  createdAt: string;
}

interface LeaderboardUser {
  rank: number;
  username: string;
  name: string;
  referralCount: number;
  totalEarned: number;
}

interface ReferStats {
  referralLink: string;
  totalReferred: number;
  activeReferrals: number;
  pendingReferrals: number;
  earnings: number;
  referrals: ReferralStat[];
}

export const Refer: React.FC = () => {
  const { triggerHaptic } = useTelegram();
  const [stats, setStats] = useState<ReferStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invites' | 'leaderboard'>('invites');

  const fetchData = async () => {
    try {
      const [statsData, leaderboardData] = await Promise.all([
        apiRequest('/api/referral/stats'),
        apiRequest('/api/referral/leaderboard'),
      ]);

      if (statsData.success) {
        setStats(statsData);
      }
      if (leaderboardData.success) {
        setLeaderboard(leaderboardData.leaderboard);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyLink = () => {
    if (!stats) return;
    triggerHaptic('medium');
    
    navigator.clipboard.writeText(stats.referralLink);
    alert('Referral link copied to clipboard!');
  };

  const handleTelegramShare = () => {
    if (!stats) return;
    triggerHaptic('heavy');
    
    // Format text message to send
    const text = encodeURIComponent('🚀 Hey! Join PaisaTap on Telegram, tap to earn money, play games, and get cash out instantly! 💸 Get ₹20 starting bonus now:');
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(stats.referralLink)}&text=${text}`;
    
    window.open(shareUrl, '_blank');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#94a3b8' }}>
        Loading referral details...
      </div>
    );
  }

  return (
    <div style={{ padding: '0 20px 20px 20px' }}>
      <h1 className="page-title" style={{ marginTop: '20px' }}>Invite & Earn</h1>
      <p className="page-subtitle">Invite your friends and earn money when they join and complete tasks!</p>

      {/* Rewards Description Box */}
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)', border: '1px solid rgba(34, 197, 94, 0.25)', margin: '0 0 20px 0', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'start' }}>
          <div className="icon-box" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
            <Gift size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: '#fff', marginBottom: '4px' }}>
              Referral Reward Distribution
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
              You get <strong style={{ color: 'var(--color-primary)' }}>₹40</strong> and your friend gets <strong style={{ color: 'var(--color-accent)' }}>₹20</strong> when they sign up and complete their <strong style={{ color: '#fff' }}>first task</strong>.
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link Box */}
      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="form-input"
            readOnly
            value={stats?.referralLink || ''}
            style={{ fontSize: '13px', background: 'rgba(0,0,0,0.2)' }}
          />
          <button className="btn btn-secondary" style={{ padding: '12px' }} onClick={handleCopyLink}>
            <Copy size={16} />
          </button>
        </div>
        
        <button className="btn btn-accent" style={{ width: '100%', marginTop: '12px' }} onClick={handleTelegramShare}>
          <Share2 size={16} />
          Share on Telegram
        </button>
      </div>

      {/* Referral Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <div className="glass-card" style={{ margin: '0', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Invites</div>
          <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px' }}>{stats?.totalReferred}</div>
        </div>
        <div className="glass-card" style={{ margin: '0', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Active</div>
          <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px', color: 'var(--color-primary)' }}>{stats?.activeReferrals}</div>
        </div>
        <div className="glass-card" style={{ margin: '0', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Earnings</div>
          <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px', color: 'var(--color-accent)' }}>₹{stats?.earnings}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
        <button
          className="btn"
          style={{
            flex: 1,
            background: activeTab === 'invites' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
            boxShadow: 'none',
            borderRadius: '10px',
            padding: '8px',
            fontSize: '13px',
            color: activeTab === 'invites' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
          }}
          onClick={() => setActiveTab('invites')}
        >
          <Users size={14} style={{ marginRight: '4px' }} />
          Invited Friends
        </button>
        <button
          className="btn"
          style={{
            flex: 1,
            background: activeTab === 'leaderboard' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
            boxShadow: 'none',
            borderRadius: '10px',
            padding: '8px',
            fontSize: '13px',
            color: activeTab === 'leaderboard' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
          }}
          onClick={() => setActiveTab('leaderboard')}
        >
          <Trophy size={14} style={{ marginRight: '4px' }} />
          Leaderboard
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'invites' ? (
        <div className="list-container">
          {stats?.referrals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
              No friends referred yet. Share your invite link to get started!
            </div>
          ) : (
            stats?.referrals.map((invite) => (
              <div key={invite.telegramId} className="list-item" style={{ padding: '12px 16px' }}>
                <div className="list-item-left">
                  <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '13px' }}>
                    {invite.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{invite.name || invite.username}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      Joined {new Date(invite.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {invite.status === 'completed' ? (
                    <span style={{ fontSize: '11px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                      Active (+₹40)
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                      Pending Tasks
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="list-container">
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
              Leaderboard is empty. Be the first to refer!
            </div>
          ) : (
            leaderboard.map((user, idx) => (
              <div key={idx} className="list-item" style={{ padding: '12px 16px' }}>
                <div className="list-item-left">
                  <div className={`rank-badge rank-${user.rank}`}>
                    {user.rank}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{user.name || user.username}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      {user.referralCount} successful invites
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--color-primary)', fontWeight: '700', fontSize: '14px' }}>
                    ₹{user.totalEarned.toFixed(0)}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>total earned</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
