import React, { useState, useEffect, useRef } from 'react';
import { useTelegram } from '../contexts/TelegramContext';
import { apiRequest } from '../utils/api';
import { AdsgramService } from '../utils/adsgram';
import confetti from 'canvas-confetti';
import { Sparkles, Zap, Play, Trophy } from 'lucide-react';

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

  // Ad & Double Payout Modal States
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardClaiming, setRewardClaiming] = useState(false);
  const [currentReward, setCurrentReward] = useState<{
    game: string;
    type: 'cash' | 'energy' | 'none';
    value: number;
    energyCost: number;
    playWithAd?: boolean;
    wasDoubled?: boolean;
  } | null>(null);

  // Scratch card status state
  const [scratchStatus, setScratchStatus] = useState<'idle' | 'scratching' | 'completed'>('idle');
  const [scratchPlayWithAd, setScratchPlayWithAd] = useState(false);

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
  const spinWheel = async (playWithAd: boolean) => {
    if (spinning) return;
    if (!playWithAd && energy < 150) {
      triggerHaptic('error');
      alert('Not enough energy! Spinning costs 150 energy.');
      return;
    }

    setSpinning(true);
    triggerHaptic('heavy');

    try {
      if (playWithAd) {
        await AdsgramService.showAd('block_game_spin');
      }

      const segmentIndex = Math.floor(Math.random() * wheelRewards.length);
      const chosenReward = wheelRewards[segmentIndex];

      const rotationCount = 5;
      const segmentAngle = 45;
      const targetDeg = (rotationCount * 360) + (360 - (segmentIndex * segmentAngle));

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${targetDeg}deg)`;
      }

      setTimeout(() => {
        setCurrentReward({
          game: 'spin',
          type: chosenReward.type,
          value: chosenReward.value,
          energyCost: playWithAd ? 0 : 150,
          playWithAd: playWithAd,
        });
        setShowRewardModal(true);
        setSpinning(false);
      }, 4100);

    } catch (err: any) {
      setSpinning(false);
      triggerHaptic('error');
      if (err.message !== 'User skipped the ad.') {
        alert(err.message || 'Game processing failed');
      }
    }
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

  const startScratchCard = async (playWithAd: boolean) => {
    if (!playWithAd && energy < 100) {
      triggerHaptic('error');
      alert('Not enough energy! Scratching costs 100 energy.');
      return;
    }

    triggerHaptic('medium');

    try {
      if (playWithAd) {
        await AdsgramService.showAd('block_game_scratch');
      }

      setScratchPlayWithAd(playWithAd);
      setScratchStatus('scratching');
      setTimeout(() => {
        initScratchCard();
      }, 50);
    } catch (err: any) {
      triggerHaptic('error');
      if (err.message !== 'User skipped the ad.') {
        alert(err.message || 'Failed to start scratch card.');
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'scratch') {
      setScratchStatus('idle');
    }
  }, [activeTab]);

  const handleScratchMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (scratchRevealed || spinning || scratchStatus !== 'scratching') return;
    
    if (!scratching) {
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
        setScratchStatus('completed');
        triggerHaptic('success');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        setCurrentReward({
          game: 'scratch',
          type: 'cash',
          value: scratchReward.amount,
          energyCost: scratchPlayWithAd ? 0 : 100,
          playWithAd: scratchPlayWithAd,
        });
        setShowRewardModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // COIN CATCHER GAME LOGIC
  const startCatcherGame = async (playWithAd: boolean) => {
    if (!playWithAd && energy < 100) {
      triggerHaptic('error');
      alert('Not enough energy! Coin Catcher costs 100 energy.');
      return;
    }

    triggerHaptic('medium');

    try {
      if (playWithAd) {
        await AdsgramService.showAd('block_game_catcher');
      }

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

      (catcherStateRef.current as any).playWithAd = playWithAd;

    } catch (err: any) {
      triggerHaptic('error');
      if (err.message !== 'User skipped the ad.') {
        alert(err.message || 'Failed to start catcher game.');
      }
    }
  };

  const endCatcherGame = async (finalScore: number) => {
    setCatcherPlaying(false);
    setCatcherStatus(catcherStateRef.current.lives <= 0 ? 'gameover' : 'completed');
    
    const rewardVal = Math.round(finalScore * 0.10 * 100) / 100;
    setCatcherRewardAmount(rewardVal);

    const isAdPlay = (catcherStateRef.current as any).playWithAd;

    setCurrentReward({
      game: 'catcher',
      type: 'cash',
      value: rewardVal,
      energyCost: isAdPlay ? 0 : 100,
      playWithAd: isAdPlay,
    });
    setShowRewardModal(true);
  };

  // Claims normal reward (called from Modal)
  const handleClaimNormalReward = async () => {
    if (!currentReward || rewardClaiming) return;
    setRewardClaiming(true);
    triggerHaptic('medium');

    try {
      if (currentReward.value > 0) {
        const data = await apiRequest('/api/user/game-reward', {
          method: 'POST',
          body: {
            game: currentReward.game,
            rewardType: currentReward.type,
            rewardValue: currentReward.value,
            energyCost: currentReward.energyCost,
            playWithAd: currentReward.playWithAd,
            wasDoubled: false,
          },
        });

        if (data.success) {
          setEnergy(data.energy);
          triggerHaptic('success');
          if (currentReward.type === 'cash' && currentReward.value >= 1) {
            confetti({
              particleCount: 50,
              spread: 40,
              origin: { y: 0.7 }
            });
          }
        }
      }
      setShowRewardModal(false);
      setCurrentReward(null);
    } catch (err: any) {
      alert(err.message || 'Claim failed');
    } finally {
      setRewardClaiming(false);
    }
  };

  // Plays an ad to double cash rewards
  const handleDoubleReward = async () => {
    if (!currentReward || rewardClaiming) return;
    setRewardClaiming(true);
    triggerHaptic('medium');

    try {
      // Trigger Ad (block_double_game)
      await AdsgramService.showAd('block_double_game');

      const data = await apiRequest('/api/user/game-reward', {
        method: 'POST',
        body: {
          game: currentReward.game,
          rewardType: currentReward.type,
          rewardValue: currentReward.value * 2, // Doubled!
          energyCost: currentReward.energyCost,
          playWithAd: currentReward.playWithAd,
          wasDoubled: true,
        },
      });

      if (data.success) {
        setEnergy(data.energy);
        triggerHaptic('success');
        confetti({
          particleCount: 100,
          spread: 60,
          colors: ['#22c55e', '#f59e0b', '#ffffff'],
          origin: { y: 0.7 }
        });
      }
      setShowRewardModal(false);
      setCurrentReward(null);
    } catch (err: any) {
      console.error('Double reward error:', err);
      triggerHaptic('error');
      if (err.message !== 'User skipped the ad.') {
        alert(err.message || 'Failed to double reward.');
      }
    } finally {
      setRewardClaiming(false);
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
        <span style={{ fontWeight: '700' }}>{Math.floor(energy)} / {maxEnergy}</span>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            <button
              className="btn btn-accent"
              style={{ width: '85%', margin: '0 auto' }}
              onClick={() => spinWheel(false)}
              disabled={spinning}
            >
              {spinning ? 'Spinning...' : 'Spin Now (150 energy)'}
            </button>
            <button
              className="btn btn-secondary"
              style={{ width: '85%', margin: '0 auto', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', minHeight: '40px' }}
              onClick={() => spinWheel(true)}
              disabled={spinning}
            >
              <Play size={14} />
              Spin Free with Ad
            </button>
          </div>
        </div>
      )}

      {activeTab === 'scratch' && (
        <div className="glass-card" style={{ textAlign: 'center', margin: '0' }}>
          <h3>Lucky Scratch Card</h3>
          
          {scratchStatus === 'idle' && (
            <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '48px' }}>✨</div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '240px', lineHeight: '1.5', margin: 0 }}>
                Scratch the surface to reveal a direct cash prize instantly credited to your wallet balance.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '85%', marginTop: '10px' }}>
                <button className="btn btn-accent" onClick={() => startScratchCard(false)}>
                  Scratch Card (100 energy)
                </button>
                <button className="btn btn-secondary" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', minHeight: '40px' }} onClick={() => startScratchCard(true)}>
                  <Play size={14} />
                  Scratch Free with Ad
                </button>
              </div>
            </div>
          )}

          {(scratchStatus === 'scratching' || scratchStatus === 'completed') && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                Reveal at least 50% of the surface area!
              </p>
              <div className="scratch-card-wrapper" style={{ margin: '0 auto' }}>
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
                        Scratch Completed!
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
                style={{ width: '80%', margin: '20px auto 10px auto' }}
                onClick={() => setScratchStatus('idle')}
                disabled={scratchStatus === 'scratching'}
              >
                Back to Play Options
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'catcher' && (
        <div className="glass-card" style={{ textAlign: 'center', margin: '0' }}>
          <h3>Coin Catcher Arcade</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
            Catch coins (+₹0.10) & Avoid bombs!
          </p>

          {catcherStatus === 'idle' && (
            <div style={{ padding: '30px 10px' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎮</div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '240px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
                Drag the gold basket left and right to catch falling ₹ coins. Do not catch the red bombs!
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '85%', margin: '0 auto' }}>
                <button className="btn btn-accent" onClick={() => startCatcherGame(false)}>
                  Start Playing (100 energy)
                </button>
                <button className="btn btn-secondary" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', minHeight: '40px' }} onClick={() => startCatcherGame(true)}>
                  <Play size={14} />
                  Play Free with Ad
                </button>
              </div>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '85%', margin: '0 auto' }}>
                <button className="btn btn-accent" onClick={() => startCatcherGame(false)}>
                  Play Again (100 energy)
                </button>
                <button className="btn btn-secondary" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', minHeight: '40px' }} onClick={() => startCatcherGame(true)}>
                  <Play size={14} />
                  Play Free with Ad
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Premium Reward & Double Claim Overlay Modal */}
      {showRewardModal && currentReward && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '32px 24px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '70px', height: '70px', borderRadius: '50%', background: currentReward.value > 0 ? (currentReward.type === 'cash' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)') : 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {currentReward.value > 0 ? (
                currentReward.type === 'cash' ? <Trophy size={36} style={{ color: 'var(--color-accent)' }} /> : <Zap size={36} style={{ color: 'var(--color-primary)' }} />
              ) : (
                <span style={{ fontSize: '32px' }}>😢</span>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>
                {currentReward.value > 0 ? 'Congratulations!' : 'Hard Luck!'}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                {currentReward.value > 0 
                  ? `You won a reward playing ${currentReward.game === 'spin' ? 'Lucky Spin' : currentReward.game === 'scratch' ? 'Scratch Card' : 'Coin Catcher'}.`
                  : 'Better luck next time. Spin again to win cash!'
                }
              </p>
            </div>

            {currentReward.value > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px 24px', minWidth: '150px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reward Amount</span>
                <div style={{ fontSize: '32px', fontWeight: '800', color: currentReward.type === 'cash' ? 'var(--color-accent)' : 'var(--color-primary)', marginTop: '4px' }}>
                  {currentReward.type === 'cash' ? `₹${currentReward.value.toFixed(2)}` : `${currentReward.value} Energy`}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '10px' }}>
              {currentReward.type === 'cash' && currentReward.value > 0 && (
                <button
                  className="btn btn-accent"
                  style={{ width: '100%', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', minHeight: '44px', fontWeight: '700' }}
                  disabled={rewardClaiming}
                  onClick={handleDoubleReward}
                >
                  <Sparkles size={16} />
                  {rewardClaiming ? 'Processing...' : `Double to ₹ ${(currentReward.value * 2).toFixed(2)} with Ad`}
                </button>
              )}

              <button
                className="btn btn-secondary"
                style={{ width: '100%', minHeight: '42px' }}
                disabled={rewardClaiming}
                onClick={handleClaimNormalReward}
              >
                {rewardClaiming ? 'Claiming...' : currentReward.value > 0 ? 'Claim Normal Reward' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
