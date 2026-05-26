import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#0b0f19',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* 3D Coin Spinner Container */}
      <div style={{
        perspective: '1000px',
        marginBottom: '24px'
      }}>
        <div className="spinning-coin" style={{
          width: '100px',
          height: '100px',
          position: 'relative',
          transformStyle: 'preserve-3d',
          animation: 'rotate3dCoin 2s linear infinite'
        }}>
          {/* Front Face */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backfaceVisibility: 'hidden',
            background: 'radial-gradient(circle, #fbbf24 0%, #d97706 70%, #78350f 100%)',
            border: '4px solid #fef08a',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)'
          }}>
            <span style={{ fontSize: '40px', fontWeight: 'bold', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>₹</span>
          </div>
          {/* Back Face */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'radial-gradient(circle, #fbbf24 0%, #d97706 70%, #78350f 100%)',
            border: '4px solid #fef08a',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)'
          }}>
            <span style={{ fontSize: '40px', fontWeight: 'bold', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>₹</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes rotate3dCoin {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(360deg);
          }
        }
        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.6;
            text-shadow: 0 0 10px rgba(34, 197, 94, 0.4);
          }
          50% {
            opacity: 1;
            text-shadow: 0 0 20px rgba(34, 197, 94, 0.8);
          }
        }
      `}</style>

      {/* Loading Status */}
      <div style={{
        fontSize: '18px',
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: '8px',
        textAlign: 'center'
      }}>
        PaisaTap
      </div>
      <div style={{
        fontSize: '13px',
        color: '#22c55e',
        fontWeight: '600',
        letterSpacing: '0.5px',
        animation: 'pulseGlow 2s ease-in-out infinite',
        textAlign: 'center'
      }}>
        Handshaking with PaisaTap Server...
      </div>
    </div>
  );
};
