import React, { useState, useEffect } from 'react';
import { useTelegram } from '../contexts/TelegramContext';
import { apiRequest } from '../utils/api';
import { 
  PlusCircle, 
  ShieldAlert, 
  Check, 
  X, 
  RefreshCw, 
  DollarSign, 
  Search, 
  Ban, 
  Users as UsersIcon, 
  BarChart3, 
  Settings, 
  ClipboardList, 
  Wallet
} from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';

interface Stats {
  totalUsers: number;
  totalTasks: number;
  totalBalanceHeld: number;
  totalEarnedOverall: number;
  totalPaidOut: number;
  pendingWithdrawalsCount: number;
  processingWithdrawalsCount: number;
  pendingTaskCompletions: number;
  totalAdsWatched: number;
  adBreakdown: {
    energy_refill: number;
    task_reward: number;
    double_game: number;
    free_game_spin: number;
    free_game_scratch: number;
    free_game_catcher: number;
  };
  registrations: Array<{ _id: string; count: number }>;
  adDailyStats: Array<{ _id: string; count: number }>;
}

interface PendingWithdrawal {
  _id: string;
  telegramId: string;
  amount: number;
  netAmount: number;
  fee: number;
  upiId: string;
  status: string;
  createdAt: string;
}

interface PendingTask {
  _id: string;
  telegramId: string;
  taskId: {
    _id: string;
    title: string;
    rewardAmount: number;
  } | null;
  proof: string;
  completedAt: string;
}

interface UserRecord {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  balance: number;
  totalEarned: number;
  streak: number;
  level: number;
  energy: number;
  maxEnergy: number;
  referralCount: number;
  isBanned: boolean;
  createdAt: string;
}

export const Admin: React.FC = () => {
  const { triggerHaptic } = useTelegram();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'withdrawals' | 'tasks' | 'seeder'>('overview');

  // User search/directory states
  const [userSearch, setUserSearch] = useState('');
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [managingUser, setManagingUser] = useState<UserRecord | null>(null);
  const [banLoading, setBanLoading] = useState(false);

  // Form states for creating new task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskReward, setTaskReward] = useState('');
  const [taskType, setTaskType] = useState<'daily' | 'social' | 'quiz' | 'gig'>('social');
  const [taskLink, setTaskLink] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'instant' | 'manual' | 'code'>('instant');
  const [verificationCode, setVerificationCode] = useState('');

  // Form states for manual balance adjustment
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'set'>('add');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/admin/stats');
      if (data.success) {
        setStats(data.stats);
        setPendingWithdrawals(data.pendingWithdrawals);
        setPendingTasks(data.pendingTasks);
        setIsAuthorized(true);
      }
    } catch (e) {
      console.error(e);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (searchVal = '', pageNum = 1) => {
    setUsersLoading(true);
    try {
      const data = await apiRequest(`/api/admin/users?search=${encodeURIComponent(searchVal)}&page=${pageNum}`);
      if (data.success) {
        setUsersList(data.users);
        setCurrentPage(data.pagination.currentPage);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) {
      console.error('Error fetching admin users:', e);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers(userSearch, 1);
    }
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(userSearch, 1);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDesc || !taskReward) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const data = await apiRequest('/api/admin/tasks', {
        method: 'POST',
        body: {
          title: taskTitle,
          description: taskDesc,
          rewardAmount: parseFloat(taskReward),
          type: taskType,
          link: taskLink || undefined,
          verificationMethod,
          verificationCode: verificationMethod === 'code' ? verificationCode : undefined,
        },
      });

      if (data.success) {
        alert('Task created successfully!');
        setTaskTitle('');
        setTaskDesc('');
        setTaskReward('');
        setTaskLink('');
        setVerificationCode('');
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingUser || !adjustAmount) {
      alert('Please enter an amount');
      return;
    }

    try {
      const data = await apiRequest('/api/admin/adjust-balance', {
        method: 'POST',
        body: {
          telegramId: managingUser.telegramId,
          amount: parseFloat(adjustAmount),
          type: adjustType,
        },
      });

      if (data.success) {
        alert(`Successfully adjusted balance! New balance: ₹${data.balance}`);
        setAdjustAmount('');
        
        // Update user record in directory
        setUsersList((prev) =>
          prev.map((u) => (u.telegramId === managingUser.telegramId ? { ...u, balance: data.balance } : u))
        );
        setManagingUser({ ...managingUser, balance: data.balance });
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to adjust balance');
    }
  };

  const handleToggleBan = async (userToToggle: UserRecord) => {
    if (banLoading) return;
    setBanLoading(true);
    triggerHaptic('medium');

    try {
      const data = await apiRequest('/api/admin/users/ban', {
        method: 'POST',
        body: {
          telegramId: userToToggle.telegramId,
          isBanned: !userToToggle.isBanned
        }
      });

      if (data.success) {
        alert(data.message);
        // Update user state in list
        setUsersList((prev) =>
          prev.map((u) => (u.telegramId === userToToggle.telegramId ? data.user : u))
        );
        if (managingUser && managingUser.telegramId === userToToggle.telegramId) {
          setManagingUser(data.user);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle suspension');
    } finally {
      setBanLoading(false);
    }
  };

  const handleWithdrawAction = async (id: string, action: 'approve' | 'reject') => {
    triggerHaptic('medium');
    const endpoint = `/api/admin/withdraw/${action}`;
    try {
      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: { withdrawalId: id },
      });

      if (data.success) {
        alert(`Withdrawal request successfully ${action}d.`);
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to process request');
    }
  };

  const handleTaskReview = async (id: string, reviewStatus: 'approved' | 'rejected') => {
    triggerHaptic('medium');
    try {
      const data = await apiRequest('/api/admin/task-completion/review', {
        method: 'POST',
        body: { completionId: id, status: reviewStatus },
      });

      if (data.success) {
        alert(`Task completion record marked ${reviewStatus}.`);
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    }
  };

  const renderProgressBar = (label: string, count: number, total: number, color: string) => {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
          <span>{label}</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>{count} views ({percent}%)</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.5s ease-in-out' }} />
        </div>
      </div>
    );
  };

  const renderGrowthChart = () => {
    if (!stats || !stats.registrations || stats.registrations.length === 0) {
      return (
        <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
          No recent registration logs.
        </div>
      );
    }

    const maxVal = Math.max(...stats.registrations.map(r => r.count), 1);

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px', padding: '15px 0 5px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {stats.registrations.map((day) => {
          const pctHeight = (day.count / maxVal) * 100;
          const labelDate = day._id.substring(5); // format: MM-DD
          return (
            <div key={day._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: '600' }}>{day.count}</span>
              <div style={{ width: '16px', height: `${Math.max(pctHeight, 4)}%`, background: 'linear-gradient(to top, var(--color-primary), #10b981)', borderRadius: '4px 4px 0 0', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)' }} />
              <span style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>{labelDate}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (isAuthorized === null || (loading && isAuthorized !== false)) {
    return <LoadingScreen />;
  }

  if (isAuthorized === false) {
    return (
      <div style={{ padding: '20px' }}>
        <div className="glass-card" style={{ marginTop: '40px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '50%', color: 'var(--color-danger)', marginBottom: '16px' }}>
            <ShieldAlert size={36} />
          </div>
          <h2>403 - Access Denied</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
            You do not have administrative privileges. Only registered administrators can access this panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 20px 20px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
        <h1 className="page-title" style={{ margin: '0' }}>Admin Panel</h1>
        <button className="btn btn-secondary" style={{ padding: '10px' }} onClick={fetchAdminData}>
          <RefreshCw size={16} />
        </button>
      </div>
      <p className="page-subtitle">Track growth metrics, audit user balances, process UPI payouts, and review tasks.</p>

      {/* Glassmorphic Tabs Navigation */}
      <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '4px', marginBottom: '20px', gap: '4px', overflowX: 'auto' }}>
        <button 
          className="btn" 
          style={{ flex: 1, padding: '10px 6px', fontSize: '12px', borderRadius: '10px', background: activeTab === 'overview' ? 'linear-gradient(135deg, var(--color-primary) 0%, #047857 100%)' : 'transparent', boxShadow: activeTab === 'overview' ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none' }}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={14} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
          Overview
        </button>
        <button 
          className="btn" 
          style={{ flex: 1, padding: '10px 6px', fontSize: '12px', borderRadius: '10px', background: activeTab === 'users' ? 'linear-gradient(135deg, var(--color-primary) 0%, #047857 100%)' : 'transparent', boxShadow: activeTab === 'users' ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none' }}
          onClick={() => setActiveTab('users')}
        >
          <UsersIcon size={14} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
          Users
        </button>
        <button 
          className="btn" 
          style={{ flex: 1, padding: '10px 6px', fontSize: '12px', borderRadius: '10px', background: activeTab === 'withdrawals' ? 'linear-gradient(135deg, var(--color-primary) 0%, #047857 100%)' : 'transparent', boxShadow: activeTab === 'withdrawals' ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none' }}
          onClick={() => setActiveTab('withdrawals')}
        >
          <Wallet size={14} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
          Payouts ({pendingWithdrawals.length})
        </button>
        <button 
          className="btn" 
          style={{ flex: 1, padding: '10px 6px', fontSize: '12px', borderRadius: '10px', background: activeTab === 'tasks' ? 'linear-gradient(135deg, var(--color-primary) 0%, #047857 100%)' : 'transparent', boxShadow: activeTab === 'tasks' ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none' }}
          onClick={() => setActiveTab('tasks')}
        >
          <ClipboardList size={14} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
          Reviews ({pendingTasks.length})
        </button>
        <button 
          className="btn" 
          style={{ flex: 1, padding: '10px 6px', fontSize: '12px', borderRadius: '10px', background: activeTab === 'seeder' ? 'linear-gradient(135deg, var(--color-primary) 0%, #047857 100%)' : 'transparent', boxShadow: activeTab === 'seeder' ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none' }}
          onClick={() => setActiveTab('seeder')}
        >
          <Settings size={14} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
          Seeder
        </button>
      </div>

      {/* OVERVIEW PANEL */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div className="glass-card" style={{ margin: '0', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Registered Users</div>
              <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '4px' }}>{stats?.totalUsers}</div>
            </div>
            <div className="glass-card" style={{ margin: '0', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Ad Impressions (Watches)</div>
              <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '4px', color: '#10b981' }}>{stats?.totalAdsWatched}</div>
            </div>
            <div className="glass-card" style={{ margin: '0', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Active Balances Held</div>
              <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '4px', color: 'var(--color-accent)' }}>₹{stats?.totalBalanceHeld.toFixed(2)}</div>
            </div>
            <div className="glass-card" style={{ margin: '0', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Aggregate Paid Out</div>
              <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '4px', color: 'var(--color-primary)' }}>₹{stats?.totalPaidOut.toFixed(2)}</div>
            </div>
          </div>

          {/* User Signups Growth Graph */}
          <div className="glass-card" style={{ margin: '0', padding: '16px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '700' }}>User Growth (Last 7 Days)</h3>
            {renderGrowthChart()}
          </div>

          {/* Ad analytics progress breakdown */}
          <div className="glass-card" style={{ margin: '0', padding: '16px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>Ad Impressions Breakdown</h3>
            {stats && (
              <div>
                {renderProgressBar('Energy Refills (Refuel Cards)', stats.adBreakdown.energy_refill, stats.totalAdsWatched, '#fbbf24')}
                {renderProgressBar('Tasks Watch-to-Earn (₹0.50 Tasks)', stats.adBreakdown.task_reward, stats.totalAdsWatched, '#10b981')}
                {renderProgressBar('Payout Doubling (Winnings Multiply)', stats.adBreakdown.double_game, stats.totalAdsWatched, '#8b5cf6')}
                {renderProgressBar('Free Game: Spin Wheel Plays', stats.adBreakdown.free_game_spin, stats.totalAdsWatched, '#3b82f6')}
                {renderProgressBar('Free Game: Scratch Card Plays', stats.adBreakdown.free_game_scratch, stats.totalAdsWatched, '#ec4899')}
                {renderProgressBar('Free Game: Coin Catcher Plays', stats.adBreakdown.free_game_catcher, stats.totalAdsWatched, '#06b6d4')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* USER DIRECTORY PANEL */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search Telegram ID or Username..." 
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ paddingLeft: '36px', height: '42px', margin: '0' }}
              />
            </div>
            <button type="submit" className="btn btn-accent" style={{ padding: '0 16px' }}>
              Search
            </button>
          </form>

          {/* User List Table */}
          <div className="list-container" style={{ gap: '8px' }}>
            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-secondary)' }}>Loading directory...</div>
            ) : usersList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>No users found matching query.</div>
            ) : (
              usersList.map((u) => (
                <div key={u.telegramId} className="list-item" style={{ margin: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: u.isBanned ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)', border: u.isBanned ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid var(--card-border)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700' }}>{u.firstName || 'User'}</span>
                      {u.isBanned && <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Banned</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      ID: {u.telegramId} {u.username && `| @${u.username}`}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Lvl {u.level} | Ref: {u.referralCount} | Join: {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-accent)' }}>₹{u.balance.toFixed(2)}</div>
                    <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '6px 12px', minHeight: 'auto' }} onClick={() => setManagingUser(u)}>
                      Manage
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === 1 || usersLoading}
                onClick={() => fetchUsers(userSearch, currentPage - 1)}
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Page {currentPage} of {totalPages}</span>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === totalPages || usersLoading}
                onClick={() => fetchUsers(userSearch, currentPage + 1)}
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* PAYOUT QUEUE PANEL */}
      {activeTab === 'withdrawals' && (
        <div className="list-container">
          {pendingWithdrawals.length === 0 ? (
            <div className="glass-card" style={{ margin: '0', padding: '30px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
              No pending UPI withdrawals.
            </div>
          ) : (
            pendingWithdrawals.map((tx) => (
              <div key={tx._id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', margin: '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700' }}>User ID: {tx.telegramId}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>UPI Address: <span style={{ fontFamily: 'monospace', color: '#fff' }}>{tx.upiId}</span></div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Requested: {new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--color-primary)', fontSize: '18px', fontWeight: '800' }}>₹{tx.amount}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Net: ₹{tx.netAmount} (Fee: ₹{tx.fee})</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={() => handleWithdrawAction(tx._id, 'reject')}>
                    <X size={14} /> Reject & Refund
                  </button>
                  <button className="btn" style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={() => handleWithdrawAction(tx._id, 'approve')}>
                    <Check size={14} /> Approve Payout
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PROOFS VERIFICATION PANEL */}
      {activeTab === 'tasks' && (
        <div className="list-container">
          {pendingTasks.length === 0 ? (
            <div className="glass-card" style={{ margin: '0', padding: '30px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
              No pending task completion reviews.
            </div>
          ) : (
            pendingTasks.map((t) => (
              <div key={t._id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', margin: '0' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>User ID: {t.telegramId}</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-accent)', fontWeight: '600', marginTop: '2px' }}>
                    Task: {t.taskId?.title || 'Unknown Task'} (+₹{t.taskId?.rewardAmount || 0})
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace', marginTop: '8px', border: '1px solid var(--card-border)', overflowWrap: 'anywhere' }}>
                    Proof submitted: {t.proof}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={() => handleTaskReview(t._id, 'rejected')}>
                    <X size={14} /> Reject Proof
                  </button>
                  <button className="btn" style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={() => handleTaskReview(t._id, 'approved')}>
                    <Check size={14} /> Approve & Credit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SEEDER PANEL */}
      {activeTab === 'seeder' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Seed a New Earning Task */}
          <div className="glass-card" style={{ margin: '0' }}>
            <h3 style={{ marginTop: '0', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={20} style={{ color: 'var(--color-primary)' }} />
              Create Earning Task
            </h3>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input type="text" className="form-input" placeholder="e.g. Subscribe to Telegram channel" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Task Description</label>
                <textarea className="form-input" placeholder="Instruction text for the user" rows={3} style={{ resize: 'none' }} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Reward Amount (₹)</label>
                <input type="number" className="form-input" placeholder="e.g. 5" value={taskReward} onChange={(e) => setTaskReward(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Task Category</label>
                  <select className="form-input" value={taskType} onChange={(e) => setTaskType(e.target.value as any)}>
                    <option value="daily">Daily watch</option>
                    <option value="social">Social link</option>
                    <option value="quiz">Quiz task</option>
                    <option value="gig">Gig marketplace</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Verification Method</label>
                  <select className="form-input" value={verificationMethod} onChange={(e) => setVerificationMethod(e.target.value as any)}>
                    <option value="instant">Instant verify</option>
                    <option value="manual">Manual review</option>
                    <option value="code">Secret code</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">External Task Link (Optional)</label>
                <input type="text" className="form-input" placeholder="e.g. https://t.me/..." value={taskLink} onChange={(e) => setTaskLink(e.target.value)} />
              </div>

              {verificationMethod === 'code' && (
                <div className="form-group">
                  <label className="form-label">Secret Verification Code</label>
                  <input type="text" className="form-input" placeholder="e.g. SECRETWORD" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} />
                </div>
              )}

              <button type="submit" className="btn" style={{ width: '100%', marginTop: '10px' }}>
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* USER MANAGEMENT MODAL OPTIONS OVERLAY */}
      {managingUser && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ maxWidth: '380px', width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: '0' }}>Manage User</h3>
              <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setManagingUser(null)}>
                &times;
              </button>
            </div>

            {/* Profile Overview */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)', marginBottom: '16px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>{managingUser.firstName} {managingUser.lastName}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                ID: {managingUser.telegramId} {managingUser.username && `| @${managingUser.username}`}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px', fontSize: '12px' }}>
                <div>Level: <strong>{managingUser.level}</strong></div>
                <div>Streak: <strong>{managingUser.streak} days</strong></div>
                <div>Referrals: <strong>{managingUser.referralCount}</strong></div>
                <div>Status: <strong style={{ color: managingUser.isBanned ? '#ef4444' : '#10b981' }}>{managingUser.isBanned ? 'Suspended' : 'Active'}</strong></div>
              </div>
            </div>

            {/* Account Suspension Control */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>Administrative Status</h4>
              <button 
                className={`btn ${managingUser.isBanned ? 'btn-secondary' : 'btn-secondary'}`}
                style={{ width: '100%', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', minHeight: '40px', border: managingUser.isBanned ? '1px solid #10b981' : '1px solid #ef4444', color: managingUser.isBanned ? '#10b981' : '#ef4444' }}
                disabled={banLoading}
                onClick={() => handleToggleBan(managingUser)}
              >
                <Ban size={14} />
                {banLoading ? 'Processing...' : managingUser.isBanned ? 'Reinstate Account (Unban)' : 'Suspend Account (Ban User)'}
              </button>
            </div>

            {/* Adjust User Balances */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <DollarSign size={16} style={{ color: 'var(--color-accent)' }} />
                Adjust Balance (Current: ₹{managingUser.balance.toFixed(2)})
              </h4>
              <form onSubmit={handleAdjustBalance}>
                <div className="form-group">
                  <label className="form-label">Adjustment Amount (₹)</label>
                  <input type="number" className="form-input" placeholder="e.g. 50" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Adjustment Mode</label>
                  <select className="form-input" value={adjustType} onChange={(e) => setAdjustType(e.target.value as any)}>
                    <option value="add">Add Cash</option>
                    <option value="subtract">Deduct Cash</option>
                    <option value="set">Overwrite Balance</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: '6px', minHeight: '40px' }}>
                  Apply Balance Adjustment
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
