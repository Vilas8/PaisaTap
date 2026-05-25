import React, { useState, useEffect } from 'react';
import { useTelegram } from '../contexts/TelegramContext';
import { apiRequest } from '../utils/api';
import { PlusCircle, ShieldAlert, Check, X, RefreshCw, DollarSign } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalTasks: number;
  totalBalanceHeld: number;
  totalEarnedOverall: number;
  totalPaidOut: number;
  pendingWithdrawalsCount: number;
  processingWithdrawalsCount: number;
  pendingTaskCompletions: number;
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

export const Admin: React.FC = () => {
  const { triggerHaptic } = useTelegram();
  const [password, setPassword] = useState(localStorage.getItem('admin_pwd') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states for creating new task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskReward, setTaskReward] = useState('');
  const [taskType, setTaskType] = useState<'daily' | 'social' | 'quiz' | 'gig'>('social');
  const [taskLink, setTaskLink] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'instant' | 'manual' | 'code'>('instant');
  const [verificationCode, setVerificationCode] = useState('');

  // Form states for manual balance adjustment
  const [adjustId, setAdjustId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'set'>('add');

  const fetchAdminData = async () => {
    if (!password) return;
    setLoading(true);
    try {
      const data = await apiRequest('/api/admin/stats', {
        headers: { 'x-admin-password': password }
      });
      if (data.success) {
        setStats(data.stats);
        setPendingWithdrawals(data.pendingWithdrawals);
        setPendingTasks(data.pendingTasks);
        setIsAuthenticated(true);
        localStorage.setItem('admin_pwd', password);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to authenticate as admin. Invalid password.');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (password) {
      fetchAdminData();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminData();
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
        headers: { 'x-admin-password': password },
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
    if (!adjustId || !adjustAmount) {
      alert('Please enter Telegram ID and Amount');
      return;
    }

    try {
      const data = await apiRequest('/api/admin/adjust-balance', {
        method: 'POST',
        headers: { 'x-admin-password': password },
        body: {
          telegramId: adjustId,
          amount: parseFloat(adjustAmount),
          type: adjustType,
        },
      });

      if (data.success) {
        alert(`Successfully adjusted balance! New balance: ₹${data.balance}`);
        setAdjustId('');
        setAdjustAmount('');
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to adjust balance');
    }
  };

  const handleWithdrawAction = async (id: string, action: 'approve' | 'reject') => {
    triggerHaptic('medium');
    const endpoint = `/api/admin/withdraw/${action}`;
    try {
      const data = await apiRequest(endpoint, {
        method: 'POST',
        headers: { 'x-admin-password': password },
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
        headers: { 'x-admin-password': password },
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

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px' }}>
        <div className="glass-card" style={{ marginTop: '40px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '50%', color: 'var(--color-danger)', marginBottom: '16px' }}>
            <ShieldAlert size={36} />
          </div>
          <h2>Admin Gatekeeper</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
            This panel is password-protected. Enter the MVP Admin Password to gain administrative privileges.
          </p>
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 20px 20px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
        <h1 className="page-title" style={{ margin: '0' }}>Admin Dashboard</h1>
        <button className="btn btn-secondary" style={{ padding: '10px' }} onClick={fetchAdminData}>
          <RefreshCw size={16} />
        </button>
      </div>
      <p className="page-subtitle">Configure tasks, process UPI payout transactions, and adjust customer profiles.</p>

      {/* Platform Statistics */}
      <h3 style={{ margin: '20px 0 10px 0' }}>Platform Metrics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <div className="glass-card" style={{ margin: '0', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Total Registered Users</div>
          <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px' }}>{stats?.totalUsers}</div>
        </div>
        <div className="glass-card" style={{ margin: '0', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Earning Tasks Seeded</div>
          <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px' }}>{stats?.totalTasks}</div>
        </div>
        <div className="glass-card" style={{ margin: '0', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Active Balance Held</div>
          <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px', color: 'var(--color-accent)' }}>₹{stats?.totalBalanceHeld.toFixed(2)}</div>
        </div>
        <div className="glass-card" style={{ margin: '0', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Aggregate Paid Out (Net)</div>
          <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px', color: 'var(--color-primary)' }}>₹{stats?.totalPaidOut.toFixed(2)}</div>
        </div>
      </div>

      {/* Payout Processing Queue */}
      <h3 style={{ margin: '24px 0 10px 0' }}>UPI Withdrawal Queue ({pendingWithdrawals.length})</h3>
      <div className="list-container">
        {pendingWithdrawals.length === 0 ? (
          <div className="glass-card" style={{ margin: '0', padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            No pending withdrawals waiting.
          </div>
        ) : (
          pendingWithdrawals.map((tx) => (
            <div key={tx._id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', margin: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>User ID: {tx.telegramId}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>UPI: {tx.upiId}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--color-primary)', fontWeight: '800' }}>₹{tx.amount}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Net: ₹{tx.netAmount} (Fee: ₹{tx.fee})</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => handleWithdrawAction(tx._id, 'reject')}>
                  <X size={14} style={{ marginRight: '4px' }} /> Reject & Refund
                </button>
                <button className="btn" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => handleWithdrawAction(tx._id, 'approve')}>
                  <Check size={14} style={{ marginRight: '4px' }} /> Approve Payout
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Manual Task Verification Queue */}
      <h3 style={{ margin: '24px 0 10px 0' }}>Task Proof Approvals ({pendingTasks.length})</h3>
      <div className="list-container">
        {pendingTasks.length === 0 ? (
          <div className="glass-card" style={{ margin: '0', padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            No task completions waiting review.
          </div>
        ) : (
          pendingTasks.map((t) => (
            <div key={t._id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', margin: '0' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700' }}>User ID: {t.telegramId}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-accent)', fontWeight: '600', marginTop: '2px' }}>
                  Task: {t.taskId?.title || 'Unknown Task'} (+₹{t.taskId?.rewardAmount || 0})
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace', marginTop: '8px', border: '1px solid var(--card-border)', overflowWrap: 'anywhere' }}>
                  Proof submitted: {t.proof}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => handleTaskReview(t._id, 'rejected')}>
                  <X size={14} style={{ marginRight: '4px' }} /> Reject Proof
                </button>
                <button className="btn" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => handleTaskReview(t._id, 'approved')}>
                  <Check size={14} style={{ marginRight: '4px' }} /> Approve & Pay
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Seed a New Earning Task */}
      <div className="glass-card" style={{ margin: '24px 0 0 0' }}>
        <h3 style={{ marginTop: '0', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PlusCircle size={20} style={{ color: 'var(--color-primary)' }} />
          Create Earning Task
        </h3>
        <form onSubmit={handleCreateTask}>
          <div className="form-group">
            <label className="form-label">Task Title</label>
            <input type="text" className="form-input" placeholder="e.g. Subscribe to YouTube" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Task Description</label>
            <textarea className="form-input" placeholder="What does the user need to do?" rows={3} style={{ resize: 'none' }} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Reward Amount (₹)</label>
            <input type="number" className="form-input" placeholder="e.g. 15" value={taskReward} onChange={(e) => setTaskReward(e.target.value)} />
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

      {/* Adjust User Balances */}
      <div className="glass-card" style={{ margin: '20px 0 0 0' }}>
        <h3 style={{ marginTop: '0', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <DollarSign size={20} style={{ color: 'var(--color-accent)' }} />
          Adjust User Balance
        </h3>
        <form onSubmit={handleAdjustBalance}>
          <div className="form-group">
            <label className="form-label">Telegram User ID</label>
            <input type="text" className="form-input" placeholder="e.g. 84523901" value={adjustId} onChange={(e) => setAdjustId(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input type="number" className="form-input" placeholder="e.g. 50" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Adjustment Type</label>
            <select className="form-input" value={adjustType} onChange={(e) => setAdjustType(e.target.value as any)}>
              <option value="add">Add Cash</option>
              <option value="subtract">Deduct Cash</option>
              <option value="set">Overwrite Balance</option>
            </select>
          </div>
          <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: '10px' }}>
            Apply Balance Adjustment
          </button>
        </form>
      </div>
    </div>
  );
};
