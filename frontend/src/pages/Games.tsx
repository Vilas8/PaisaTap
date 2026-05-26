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
  const [activeTab, setActiveTab] = useState<'spin' | 'scratch' | 'catcher'>('spin');
  const [energy, setEnergy] = useState<number>(0);
  const [maxEnergy, setMaxEnergy] = useState<number>(1000);
  const [spinning, setSpinning] = useState(false);
  const [scratching, setScratching] = useState(false);
  const [scratchRevealed, setScratchRevealed] = useState(false);
  const [scratchReward, setScratchReward] = useState<{ amount: number } | null>(null);

  // Coin Catcher States
  const [catcherPlaying, setCatcherPlaying] = useState(false);
  const [catcherScore, setCatcherScore] = useState(0);
  const [catcherLives, setCatcherLives] = useState(3);
  const [catcherTimeLeft, setCatcherTimeLeft] = useState(30);
  const [catcherStatus, setCatcherStatus] = useState<'idle' | 'playing' | 'gameover' | 'completed'>('idle');
  const [catcherRewardAmount, setCatcherRewardAmount] = useState(0);

  const wheelRef = useRef<HTMLDivElement>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement>(null);
  const catcherCanvasRef = useRef<HTMLCanvasElement>(null);

  const catcherStateRef = useRef({
    basketX: 115,
    basketWidth: 70,
    basketHeight: 18,
    items: [] as any[],
    score: 0,
    lives: 3,
    timeLeft: 30,
    playing: false,
    lastSpawnTime: 0
  });

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

    const segmentIndex = Math.floor(Math.random() * wheelRewards.length);
    const chosenReward = wheelRewards[segmentIndex];

    const rotationCount = 5;
    const segmentAngle = 45;
    const targetDeg = (rotationCount * 360) + (360 - (segmentIndex * segmentAngle));

    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${targetDeg}deg)`;
    }

    setTimeout(async () => {
      try {
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

    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Scratch to Reveal!', canvas.width / 2, canvas.height / 2);

    setScratchRevealed(false);
    setScratching(false);

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

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

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

      if (transparencyRatio >= 0.5 && !scratchRevealed && scratchReward) {
        setScratchRevealed(true);
        triggerHaptic('success');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

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

  // COIN CATCHER GAME LOGIC
  const startCatcherGame = async () => {
    if (energy < 100) {
      triggerHaptic('error');
      alert('Not enough energy! Coin Catcher costs 100 energy.');
      return;
    }

    triggerHaptic('medium');
    setCatcherScore(0);
    setCatcherLives(3);
    setCatcherTimeLeft(30);
    setCatcherStatus('playing');
    setCatcherPlaying(true);

    catcherStateRef.current = {
      basketX: 115,
      basketWidth: 70,
      basketHeight: 18,
      items: [],
      score: 0,
      lives: 3,
      timeLeft: 30,
      playing: true,
      lastSpawnTime: Date.now()
    };
  };

  const endCatcherGame = async (finalScore: number) => {
    setCatcherPlaying(false);
    setCatcherStatus(catcherStateRef.current.lives <= 0 ? 'gameover' : 'completed');
    
    const rewardVal = Math.round(finalScore * 0.10 * 100) / 100;
    setCatcherRewardAmount(rewardVal);

    try {
      const data = await apiRequest('/api/user/game-reward', {
        method: 'POST',
        body: {
          game: 'catcher',
          rewardType: 'cash',
          rewardValue: rewardVal,
          energyCost: 100
        }
      });
      if (data.success) {
        setEnergy(data.energy);
        if (rewardVal > 0) {
          confetti({
            particleCount: 60,
            spread: 50,
            origin: { y: 0.7 }
          });
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit game reward');
    }
  };

  const handleBasketMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!catcherPlaying) return;

    const canvas = catcherCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const relativeX = clientX - rect.left;
    const newX = relativeX - catcherStateRef.current.basketWidth / 2;

    catcherStateRef.current.basketX = Math.max(
      0,
      Math.min(canvas.width - catcherStateRef.current.basketWidth, newX)
    );
  };

  useEffect(() => {
    if (!catcherPlaying) return;

    const canvas = catcherCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = Date.now();
    let secondTimer = 0;

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;

      secondTimer += deltaTime;
      if (secondTimer >= 1) {
        secondTimer = 0;
        catcherStateRef.current.timeLeft -= 1;
        setCatcherTimeLeft(catcherStateRef.current.timeLeft);

        if (catcherStateRef.current.timeLeft <= 0) {
          catcherStateRef.current.playing = false;
        }
      }

      if (!catcherStateRef.current.playing || catcherStateRef.current.lives <= 0) {
        cancelAnimationFrame(animationFrameId);
        endCatcherGame(catcherStateRef.current.score);
        return;
      }

      if (now - catcherStateRef.current.lastSpawnTime > 800) {
        const type = Math.random() < 0.75 ? 'coin' : 'bomb';
        catcherStateRef.current.items.push({
          id: Math.random(),
          x: Math.random() * (canvas.width - 24) + 12,
          y: -10,
          type,
          speed: Math.random() * 80 + 120,
          radius: 10
        });
        catcherStateRef.current.lastSpawnTime = now;
      }

      const basketY = canvas.height - 35;
      catcherStateRef.current.items = catcherStateRef.current.items.filter(item => {
        item.y += item.speed * deltaTime;

        const hitX = item.x >= catcherStateRef.current.basketX && item.x <= catcherStateRef.current.basketX + catcherStateRef.current.basketWidth;
        const hitY = item.y + item.radius >= basketY && item.y - item.radius <= basketY + catcherStateRef.current.basketHeight;

        if (hitX && hitY) {
          if (item.type === 'coin') {
            catcherStateRef.current.score += 1;
            setCatcherScore(catcherStateRef.current.score);
            triggerHaptic('light');
          } else {
            catcherStateRef.current.lives -= 1;
            setCatcherLives(catcherStateRef.current.lives);
            triggerHaptic('heavy');
          }
          return false;
        }

        return item.y < canvas.height;
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(
        catcherStateRef.current.basketX,
        basketY,
        catcherStateRef.current.basketWidth,
        catcherStateRef.current.basketHeight,
        8
      );
      ctx.fill();
      
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.roundRect(
        catcherStateRef.current.basketX + 4,
        basketY + 3,
        catcherStateRef.current.basketWidth - 8,
        catcherStateRef.current.basketHeight - 6,
        6
      );
      ctx.fill();

      catcherStateRef.current.items.forEach(item => {
        if (item.type === 'coin') {
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(item.x, item.y, item.radius - 3, 0, Math.PI * 2);
          ctx.fillStyle = '#047857';
          ctx.fill();

          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 9px Outfit';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('₹', item.x, item.y);
        } else {
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.strokeStyle = '#7f1d1d';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(item.x, item.y - item.radius);
          ctx.quadraticCurveTo(item.x + 5, item.y - item.radius - 5, item.x + 8, item.y - item.radius - 2);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(item.x + 8, item.y - item.radius - 2, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [catcherPlaying]);

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
      <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '4px', marginBottom: '20px', gap: '4px' }}>
        <button
          className="btn"
          style={{
            flex: 1,
            background: activeTab === 'spin' ? 'linear-gradient(135deg, var(--color-accent) 0%, #d97706 100%)' : 'transparent',
            boxShadow: activeTab === 'spin' ? '0 4px 14px rgba(245, 158, 11, 0.3)' : 'none',
            borderRadius: '10px',
            padding: '10px 4px',
            fontSize: '13px',
          }}
          onClick={() => setActiveTab('spin')}
          disabled={spinning || catcherPlaying}
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
            padding: '10px 4px',
            fontSize: '13px',
          }}
          onClick={() => setActiveTab('scratch')}
          disabled={spinning || catcherPlaying}
        >
          Scratch Card
        </button>
        <button
          className="btn"
          style={{
            flex: 1,
            background: activeTab === 'catcher' ? 'linear-gradient(135deg, var(--color-accent) 0%, #d97706 100%)' : 'transparent',
            boxShadow: activeTab === 'catcher' ? '0 4px 14px rgba(245, 158, 11, 0.3)' : 'none',
            borderRadius: '10px',
            padding: '10px 4px',
            fontSize: '13px',
          }}
          onClick={() => setActiveTab('catcher')}
          disabled={spinning || catcherPlaying}
        >
          Coin Catcher
        </button>
      </div>

      {/* Game Window */}
      {activeTab === 'spin' && (
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
      )}

      {activeTab === 'scratch' && (
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

      {activeTab === 'catcher' && (
        <div className="glass-card" style={{ textAlign: 'center', margin: '0' }}>
          <h3>Coin Catcher Arcade</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
            Cost: 100 energy | Catch coins (+₹0.10) & Avoid bombs!
          </p>

          {catcherStatus === 'idle' && (
            <div style={{ padding: '30px 10px' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎮</div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '240px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
                Drag the gold basket left and right to catch falling ₹ coins. Do not catch the red bombs!
              </p>
              <button className="btn" style={{ width: '80%', margin: '0 auto' }} onClick={startCatcherGame}>
                Start Playing (100 energy)
              </button>
            </div>
          )}

          {catcherStatus === 'playing' && (
            <div>
              {/* Game Stats Overlay */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px 10px 10px', fontSize: '13px', fontWeight: '700' }}>
                <span style={{ color: 'var(--color-accent)' }}>Coins: {catcherScore} (₹{(catcherScore * 0.10).toFixed(2)})</span>
                <span style={{ color: 'var(--color-danger)' }}>Lives: {'❤️'.repeat(catcherLives)}</span>
                <span style={{ color: '#fff' }}>Time: {catcherTimeLeft}s</span>
              </div>

              {/* Game Canvas */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <canvas
                  ref={catcherCanvasRef}
                  width={300}
                  height={350}
                  style={{
                    borderRadius: '12px',
                    border: '2px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    cursor: 'none',
                    touchAction: 'none'
                  }}
                  onMouseMove={handleBasketMove}
                  onTouchMove={handleBasketMove}
                />
              </div>
            </div>
          )}

          {(catcherStatus === 'gameover' || catcherStatus === 'completed') && (
            <div style={{ padding: '30px 10px' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>
                {catcherStatus === 'gameover' ? '💥' : '🏆'}
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0' }}>
                {catcherStatus === 'gameover' ? 'Game Over!' : 'Time Up!'}
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
                You caught {catcherScore} coins.
              </p>
              
              <div className="glass-card" style={{ margin: '0 auto 20px auto', background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)', padding: '12px', width: '80%' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Cash Earned</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-primary)' }}>
                  +₹{catcherRewardAmount.toFixed(2)}
                </div>
              </div>

              <button className="btn" style={{ width: '80%', margin: '0 auto' }} onClick={startCatcherGame}>
                Play Again (100 energy)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
