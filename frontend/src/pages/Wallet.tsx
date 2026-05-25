import React, { useState, useEffect } from 'react';
import { useTelegram } from '../contexts/TelegramContext';
import { apiRequest } from '../utils/api';
import { Send, ArrowDownLeft, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';

interface WithdrawalRecord {
  _id: string;
  amount: number;
  fee: number;
  netAmount: number;
  upiId: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: string;
}

interface WalletData {
  balance: number;
  totalEarned: number;
  level: number;
  withdrawals: WithdrawalRecord[];
}

export const Wallet: React.FC = () => {
  const { triggerHaptic } = useTelegram();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');

  const fetchWallet = async () => {
    try {
      const data = await apiRequest('/api/wallet/balance');
      if (data.success) {
        setWallet(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();

    // Auto-poll transaction updates every 8 seconds in wallet view to catch Razorpay callback transitions
    const pollInterval = setInterval(() => {
      fetchWallet();
    }, 8000);

    return () => clearInterval(pollInterval);
  }, []);

  // Calculate fees: 5% flat (min ₹5, max ₹100)
  const calculateFee = (val: number) => {
    if (!val || isNaN(val)) return 0;
    const computed = val * 0.05;
    return Math.max(5, Math.min(100, Math.round(computed * 100) / 100));
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawLoading) return;

    const amtNum = parseFloat(amount);

    if (isNaN(amtNum) || amtNum <= 0) {
      triggerHaptic('error');
      alert('Please enter a valid amount.');
      return;
    }

    if (amtNum < 100) {
      triggerHaptic('error');
      alert('Minimum withdrawal amount is ₹100.');
      return;
    }

    if (!upiId || !upiId.includes('@')) {
      triggerHaptic('error');
      alert('Please enter a valid UPI ID (e.g. name@upi).');
      return;
    }

    if (wallet && wallet.balance < amtNum) {
      triggerHaptic('error');
      alert('Insufficient wallet balance!');
      return;
    }

    setWithdrawLoading(true);
    triggerHaptic('heavy');

    try {
      const data = await apiRequest('/api/withdraw', {
        method: 'POST',
        body: { amount: amtNum, upiId },
      });

      if (data.success) {
        triggerHaptic('success');
        alert(data.message);
        
        // Reset form and refresh wallet data
        setAmount('');
        setUpiId('');
        fetchWallet();
      }
    } catch (error: any) {
      triggerHaptic('error');
      alert(error.message || 'Withdrawal request failed');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#94a3b8' }}>
        Loading wallet logs...
      </div>
    );
  }

  const amtNum = parseFloat(amount);
  const fee = calculateFee(amtNum);
  const netAmount = amtNum && !isNaN(amtNum) ? Math.max(0, amtNum - fee) : 0;

  return (
    <div style={{ padding: '0 20px 20px 20px' }}>
      <h1 className="page-title" style={{ marginTop: '20px' }}>Paisa Wallet</h1>
      <p className="page-subtitle">Withdraw your earned money directly to your UPI bank account.</p>

      {/* Balance Summary Card */}
      <div className="glass-card" style={{ margin: '0 0 20px 0', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Available Balance</span>
            <div style={{ fontSize: '32px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', margin: '4px 0' }}>
              <span style={{ color: 'var(--color-primary)' }}>₹</span>
              {wallet?.balance.toFixed(2)}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={12} style={{ color: 'var(--color-primary)' }} />
              Level {wallet?.level} multiplier active
            </span>
          </div>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '16px', color: 'var(--color-primary)' }}>
            <ArrowDownLeft size={32} />
          </div>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="glass-card" style={{ margin: '0 0 20px 0' }}>
        <h3 style={{ marginTop: '0', marginBottom: '16px' }}>UPI Cashout</h3>
        <form onSubmit={handleWithdraw}>
          <div className="form-group">
            <label className="form-label">Withdrawal Amount (Min ₹100)</label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={withdrawLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">UPI ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. username@paytm"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              disabled={withdrawLoading}
            />
          </div>

          {/* Pricing calculations */}
          {amtNum >= 100 && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Processing Fee (5%):</span>
                <span>₹{fee.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '13px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span>Net Payout Amount:</span>
                <span style={{ color: 'var(--color-primary)' }}>₹{netAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-accent" style={{ width: '100%' }} disabled={withdrawLoading}>
            <Send size={16} />
            {withdrawLoading ? 'Processing Request...' : 'Initiate Withdrawal'}
          </button>
        </form>
      </div>

      {/* Payout History */}
      <h3 style={{ margin: '20px 0 10px 0' }}>Transaction Ledger</h3>
      <div className="list-container">
        {wallet?.withdrawals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            No cashout history. Earn balance and make your first withdrawal!
          </div>
        ) : (
          wallet?.withdrawals.map((tx) => (
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
