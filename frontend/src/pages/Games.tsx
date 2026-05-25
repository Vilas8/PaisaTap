import React, { useState, useEffect, useRef } from 'react';
import { useTelegram } from '../contexts/TelegramContext';
import { apiRequest } from '../utils/api';
import confetti from 'canvas-confetti';


interface WheelReward {
  text: string;
  type: 'cash' | 'energy' | 'none';
  value: number;
}

export const Games: React.FC = () => {
  const { triggerHaptic } = useTelegram();
  const [activeTab, setActiveTab] = useState<'spin' | 'scratch'>('spin');
  const [energy, setEnergy] = useState<number>(0);
  const [maxEnergy, setMaxEnergy] = useState<number>(1000);
  const [spinning, setSpinning] = useState(false);
  const [scratching, setScratching] = useState(false);
  const [scratchRevealed, setScratchRevealed] = useState(false);
  const [scratchReward, setScratchReward] = useState<{ amount: number } | null>(null);

  const wheelRef = useRef<HTMLDivElement>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement>(null);

  // Rewards layout for the spin wheel (8 segments)
  const wheelRewards: WheelReward[] = [
    { text: '₹1.00', type: 'cash', value: 1.00 },
    { text: '100 Energy', type: 'energy', value: 100 },
    { text: '₹2.00', type: 'cash', value: 2.00 },
    { text: 'Try Again', type: 'none', value: 0 },
    { text: '₹5.00', type: 'cash', value: 5.00 },
    { text: '200 Energy', type: 'energy', value: 200 },
    { text: '₹10.0', type: 'cash', value: 10.00 },
    { text: '₹50.0', type: 'cash', value: 50.00 },
  ];

  // Fetch energy levels on page load
  const fetchEnergy = async () => {
    try {
      const data = await apiRequest('/api/user/me');
      if (data.success) {
        setEnergy(data.user.energy);
        setMaxEnergy(data.user.maxEnergy);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEnergy();
  }, []);

  // SPIN THE WHEEL GAME LOGIC
  const spinWheel = async () => {
    if (spinning) return;
    if (energy < 150) {
      triggerHaptic('error');
      alert('Not enough energy! Spinning costs 150 energy.');
      return;
    }

    setSpinning(true);
    triggerHaptic('heavy');

    // Pick a random reward segment index (0 to 7)
    const segmentIndex = Math.floor(Math.random() * wheelRewards.length);
    const chosenReward = wheelRewards[segmentIndex];

    // Spin animation angles calculation
    // Each segment takes 45 degrees (360 / 8).
    // Target angle is: (multiple rotations * 360) + (segment index * 45) + offsets to center pointer
    const rotationCount = 5; // number of full spins
    const segmentAngle = 45;
    // We want the chosen segment to align with the pointer at 0 deg (top).
    // Conic gradient draws segments clockwise. Segments are indexed clockwise.
    // Pointer is at the top (270 or 90 degrees offset depending on wheel layout).
    // Let's set the target rotation angle:
    const targetDeg = (rotationCount * 360) + (360 - (segmentIndex * segmentAngle));

    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${targetDeg}deg)`;
    }

    // Wait for the transition to finish (4 seconds)
    setTimeout(async () => {
      try {
        // Send request to backend to deduct energy and grant reward
        const data = await apiRequest('/api/user/game-reward', {
          method: 'POST',
          body: {
            game: 'spin',
            rewardType: chosenReward.type,
            rewardValue: chosenReward.value,
            energyCost: 150,
          },
        });

        if (data.success) {
          setEnergy(data.energy);
          triggerHaptic('success');

          if (chosenReward.type === 'cash' && chosenReward.value >= 5) {
            confetti({
              particleCount: 100,
              spread: 60,
              colors: ['#22c55e', '#f59e0b', '#ffffff'],
            });
          }

          alert(data.message);
        }
      } catch (err: any) {
        alert(err.message || 'Game processing failed');
      } finally {
        setSpinning(false);
      }
    }, 4100);
  };

  // SCRATCH CARD GAME LOGIC
  const initScratchCard = () => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill canvas with silver scratch coating
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw some text on the coating
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Scratch to Reveal!', canvas.width / 2, canvas.height / 2);

    setScratchRevealed(false);
    setScratching(false);

    // Roll random reward value for scratch (₹0.50 to ₹10)
    const values = [0.50, 1.00, 1.50, 2.00, 3.00, 5.00, 8.00, 10.00];
    const amount = values[Math.floor(Math.random() * values.length)];
    setScratchReward({ amount });
  };

  useEffect(() => {
    if (activeTab === 'scratch') {
      initScratchCard();
    }
  }, [activeTab]);

  const handleScratchMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (scratchRevealed || spinning) return;
    
    // Ensure user has enough energy before scratching first stroke
    if (!scratching) {
      if (energy < 100) {
        triggerHaptic('error');
        alert('Not enough energy! Scratching costs 100 energy.');
        return;
      }
      setScratching(true);
    }

    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Clear circle on brush swipe
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Check transparency ratio to see if 50% is scratched
    checkScratchProgress(canvas, ctx);
  };

  const checkScratchProgress = async (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      let transparentCount = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) {
          transparentCount++;
        }
      }

      const totalPixels = pixels.length / 4;
      const transparencyRatio = transparentCount / totalPixels;

      // Scratched >= 50% triggers the win claim
      if (transparencyRatio >= 0.5 && !scratchRevealed && scratchReward) {
        setScratchRevealed(true);
        triggerHaptic('success');

        // Clear everything remaining
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Submit reward to backend
        try {
          const data = await apiRequest('/api/user/game-reward', {
            method: 'POST',
            body: {
              game: 'scratch',
              rewardType: 'cash',
              rewardValue: scratchReward.amount,
              energyCost: 100,
            },
          });

          if (data.success) {
            setEnergy(data.energy);
            if (scratchReward.amount >= 3) {
              confetti({
                particleCount: 50,
                spread: 50,
              });
            }
          }
        } catch (err: any) {
          alert(err.message || 'Scratch reward claim failed');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: '0 20px 20px 20px' }}>
      <h1 className="page-title" style={{ marginTop: '20px' }}>Mini Games</h1>
      <p className="page-subtitle">Spend energy tokens to try your luck and win instant rewards.</p>

      {/* Energy Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', marginBottom: '16px', fontSize: '13px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontWeight: '600' }}>
          ⚡ Energy Available:
        </span>
        <span style={{ fontWeight: '700' }}>{energy} / {maxEnergy}</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
        <button
          className="btn"
          style={{
            flex: 1,
            background: activeTab === 'spin' ? 'linear-gradient(135deg, var(--color-accent) 0%, #d97706 100%)' : 'transparent',
            boxShadow: activeTab === 'spin' ? '0 4px 14px rgba(245, 158, 11, 0.3)' : 'none',
            borderRadius: '10px',
            padding: '10px',
            fontSize: '14px',
          }}
          onClick={() => setActiveTab('spin')}
          disabled={spinning}
        >
          Spin Wheel
        </button>
        <button
          className="btn"
          style={{
            flex: 1,
            background: activeTab === 'scratch' ? 'linear-gradient(135deg, var(--color-accent) 0%, #d97706 100%)' : 'transparent',
            boxShadow: activeTab === 'scratch' ? '0 4px 14px rgba(245, 158, 11, 0.3)' : 'none',
            borderRadius: '10px',
            padding: '10px',
            fontSize: '14px',
          }}
          onClick={() => setActiveTab('scratch')}
          disabled={spinning}
        >
          Scratch Card
        </button>
      </div>

      {/* Game Window */}
      {activeTab === 'spin' ? (
        <div className="glass-card" style={{ textAlign: 'center', margin: '0' }}>
          <h3>Lucky Spin Wheel</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Cost: 150 energy | Top Prize: ₹50.00
          </p>

          <div className="wheel-container">
            <div className="wheel-pointer"></div>
            <div className="wheel-wrapper">
              <div className="wheel-center-pin"></div>
              <div className="wheel" ref={wheelRef}>
                {wheelRewards.map((reward, index) => {
                  const rotation = index * 45;
                  return (
                    <div
                      key={index}
                      className="wheel-segment-label"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                      }}
                    >
                      {reward.text}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            className="btn"
            style={{ width: '80%', margin: '20px auto 10px auto' }}
            onClick={spinWheel}
            disabled={spinning}
          >
            {spinning ? 'Spinning...' : 'Spin Now (150 energy)'}
          </button>
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', margin: '0' }}>
          <h3>Lucky Scratch Card</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Cost: 100 energy | Reveal cash reward!
          </p>

          <div className="scratch-card-wrapper">
            <div className="scratch-card-bg">
              {scratchReward && (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    You Won
                  </span>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-primary)' }}>
                    ₹{scratchReward.amount.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-accent)' }}>
                    Credited to Wallet!
                  </span>
                </div>
              )}
            </div>

            <canvas
              ref={scratchCanvasRef}
              className="scratch-card-canvas"
              width={280}
              height={160}
              onMouseMove={handleScratchMove}
              onTouchMove={handleScratchMove}
            ></canvas>
          </div>

          <button
            className="btn btn-secondary"
            style={{ width: '80%', margin: '10px auto' }}
            onClick={initScratchCard}
            disabled={!scratchRevealed}
          >
            Play Again (100 energy)
          </button>
        </div>
      )}
    </div>
  );
};
