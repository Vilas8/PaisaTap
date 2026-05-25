import React, { useState, useEffect } from 'react';
import { useTelegram } from '../contexts/TelegramContext';
import { apiRequest } from '../utils/api';
import { CheckCircle, Clock, Link, ArrowUpRight, PlayCircle, ShieldCheck } from 'lucide-react';

interface TaskData {
  _id: string;
  title: string;
  description: string;
  rewardAmount: number;
  type: 'daily' | 'social' | 'quiz' | 'gig';
  link?: string;
  verificationMethod: 'instant' | 'manual' | 'code';
  status: 'not_started' | 'pending' | 'approved' | 'rejected';
}

export const Tasks: React.FC = () => {
  const { triggerHaptic } = useTelegram();
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [proofInput, setProofInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchTasks = async () => {
    try {
      const data = await apiRequest('/api/tasks/available');
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (e) {
      console.error('Error fetching tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleTaskClick = (task: TaskData) => {
    if (task.status === 'approved' || task.status === 'pending') return;
    
    triggerHaptic('light');

    // Open link if it exists
    if (task.link) {
      window.open(task.link, '_blank');
    }

    setSelectedTask(task);
    setProofInput('');
  };

  const handleVerify = async () => {
    if (!selectedTask || verifying) return;
    setVerifying(true);
    triggerHaptic('medium');

    try {
      const data = await apiRequest(`/api/tasks/complete/${selectedTask._id}`, {
        method: 'POST',
        body: { proof: proofInput },
      });

      if (data.success) {
        triggerHaptic('success');
        
        // Update task status in list
        setTasks((prev) =>
          prev.map((t) =>
            t._id === selectedTask._id ? { ...t, status: data.status } : t
          )
        );

        setSelectedTask(null);
        alert(data.message);
      }
    } catch (error: any) {
      triggerHaptic('error');
      alert(error.message || 'Verification failed!');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#94a3b8' }}>
        Loading tasks list...
      </div>
    );
  }

  return (
    <div style={{ padding: '0 20px 20px 20px' }}>
      <h1 className="page-title" style={{ marginTop: '20px' }}>Earning Tasks</h1>
      <p className="page-subtitle">Complete sponsored tasks to earn direct wallet balance.</p>

      {/* Task categories */}
      <div className="list-container">
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
            No earning tasks available right now. Check back soon!
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task._id}
              className={`list-item`}
              style={{
                cursor: task.status === 'approved' || task.status === 'pending' ? 'default' : 'pointer',
                opacity: task.status === 'approved' ? 0.7 : 1,
              }}
              onClick={() => handleTaskClick(task)}
            >
              <div className="list-item-left">
                <div className={`icon-box ${task.type === 'quiz' || task.type === 'gig' ? 'accent' : ''}`}>
                  {task.status === 'approved' ? (
                    <CheckCircle style={{ color: 'var(--color-primary)' }} />
                  ) : task.status === 'pending' ? (
                    <Clock style={{ color: 'var(--color-accent)' }} />
                  ) : task.link ? (
                    <Link size={20} />
                  ) : (
                    <PlayCircle size={20} />
                  )}
                </div>
                <div>
                  <div className="list-item-title">{task.title}</div>
                  <div className="list-item-desc">
                    {task.description.length > 50
                      ? `${task.description.substring(0, 50)}...`
                      : task.description}
                  </div>
                  {task.status !== 'approved' && task.status !== 'pending' && (
                    <span style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: '600', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '2px', marginTop: '4px' }}>
                      Verify: {task.verificationMethod}
                      {task.link && <ArrowUpRight size={10} />}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="list-item-reward">
                  +₹{task.rewardAmount.toFixed(2)}
                </div>
                {task.status === 'approved' && (
                  <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '600' }}>Done</span>
                )}
                {task.status === 'pending' && (
                  <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: '600' }}>Pending</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Verification Modal */}
      {selectedTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">{selectedTask.title}</h3>
            <p className="modal-text">{selectedTask.description}</p>

            {selectedTask.link && (
              <a
                href={selectedTask.link}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ width: '100%', marginBottom: '16px', textDecoration: 'none' }}
                onClick={() => triggerHaptic('light')}
              >
                Go to Link
                <ArrowUpRight size={16} />
              </a>
            )}

            {/* Instruction for verification code */}
            {selectedTask.verificationMethod === 'code' && (
              <div className="form-group">
                <label className="form-label">Enter Secret Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. GEMINI"
                  value={proofInput}
                  onChange={(e) => setProofInput(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
                  Provide the secret code word to get instantly credited.
                </span>
              </div>
            )}

            {/* Instruction for manual upload verification */}
            {selectedTask.verificationMethod === 'manual' && (
              <div className="form-group">
                <label className="form-label">Paste Verification Proof</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Paste tweet URL or completion proof screenshot link"
                  value={proofInput}
                  onChange={(e) => setProofInput(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
                  Paste the proof link or description of your action.
                </span>
              </div>
            )}

            {selectedTask.verificationMethod === 'instant' && (
              <p style={{ fontSize: '13px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
                <ShieldCheck size={16} />
                This task qualifies for instant verification!
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setSelectedTask(null)}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={handleVerify}
                disabled={verifying}
              >
                {verifying ? 'Verifying...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
