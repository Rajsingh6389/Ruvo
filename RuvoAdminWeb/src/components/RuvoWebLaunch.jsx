import React, { useEffect, useState } from 'react';

export const RuvoWebLaunch = ({ onFinish, isReady = true, roleSubtitle = 'LOCAL • CONNECTED • MOVING' }) => {
  const [animationCompleted, setAnimationCompleted] = useState(false);
  const [fadeExit, setFadeExit] = useState(false);

  useEffect(() => {
    // Animation sequence runs for ~2.3 seconds
    const timer = setTimeout(() => {
      setAnimationCompleted(true);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (animationCompleted && isReady) {
      setFadeExit(true);
      const exitTimer = setTimeout(() => {
        if (onFinish) onFinish();
      }, 350);
      return () => clearTimeout(exitTimer);
    }
  }, [animationCompleted, isReady, onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#FAF7F0',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeExit ? 0 : 1,
        transition: 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: fadeExit ? 'none' : 'auto',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes ruvoDotSpawn {
          0% { transform: scale(0); opacity: 0; }
          40% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes ruvoDotMove {
          0% { transform: translate(0, 0); opacity: 1; }
          40% { transform: translate(32px, -24px); opacity: 1; }
          80% { transform: translate(44px, 6px); opacity: 0.8; }
          100% { transform: translate(48px, 12px); opacity: 0; }
        }

        @keyframes ruvoFlowPath {
          0% { stroke-dashoffset: 160; opacity: 0; }
          30% { opacity: 1; }
          80% { stroke-dashoffset: 0; opacity: 0.9; }
          100% { stroke-dashoffset: 0; opacity: 0.25; }
        }

        @keyframes ruvoEmblemReveal {
          0% { transform: scale(0.7) rotate(-10deg); opacity: 0; filter: blur(4px); }
          60% { transform: scale(1.05) rotate(1deg); opacity: 1; filter: blur(0px); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        @keyframes ruvoWordmarkReveal {
          0% { transform: translateY(14px) scale(0.95); opacity: 0; letter-spacing: 2px; }
          100% { transform: translateY(0) scale(1); opacity: 1; letter-spacing: 5px; }
        }

        @keyframes ruvoTaglineReveal {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        @keyframes ruvoHaloPulse {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>

      {/* Ambient Warm Golden Glow */}
      <div
        style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244, 180, 0, 0.16) 0%, rgba(250, 247, 240, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* SVG Path Flow & Dot Stage */}
        <div style={{ position: 'absolute', width: '120px', height: '120px', top: '-16px', left: '-20px', pointerEvents: 'none' }}>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <path
              d="M 25,60 C 35,25 75,20 85,55 C 90,75 75,95 55,85"
              stroke="#F4B400"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="160"
              strokeDashoffset="160"
              style={{
                animation: 'ruvoFlowPath 0.9s cubic-bezier(0.25, 0.1, 0.25, 1) 0.3s forwards',
              }}
            />
          </svg>

          {/* Traveling Dot & Halo */}
          <div
            style={{
              position: 'absolute',
              top: '52px',
              left: '18px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#F4B400',
              boxShadow: '0 0 12px #F4B400',
              animation: 'ruvoDotSpawn 0.3s ease-out forwards, ruvoDotMove 0.8s cubic-bezier(0.25, 0.1, 0.25, 1) 0.3s forwards',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '-4px',
                borderRadius: '50%',
                backgroundColor: 'rgba(244, 180, 0, 0.4)',
                animation: 'ruvoHaloPulse 0.6s ease-out infinite',
              }}
            />
          </div>
        </div>

        {/* Geometric RuVo 'R' Emblem Monogram */}
        <div
          style={{
            position: 'relative',
            width: '84px',
            height: '84px',
            marginBottom: '18px',
            animation: 'ruvoEmblemReveal 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 0.75s forwards',
            opacity: 0,
          }}
        >
          {/* Vertical Power Pillar */}
          <div
            style={{
              position: 'absolute',
              left: '10px',
              top: '6px',
              bottom: '6px',
              width: '16px',
              borderRadius: '8px',
              backgroundColor: '#171A1F',
            }}
          />

          {/* Top Loop (Gold Energy Arch) */}
          <div
            style={{
              position: 'absolute',
              left: '20px',
              top: '6px',
              width: '48px',
              height: '42px',
              borderTopRightRadius: '22px',
              borderBottomRightRadius: '22px',
              borderTopLeftRadius: '6px',
              borderBottomLeftRadius: '6px',
              backgroundColor: '#F4B400',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '18px',
                borderRadius: '9px',
                backgroundColor: '#FAF7F0',
                marginLeft: '-4px',
              }}
            />
          </div>

          {/* Dynamic Forward Leg */}
          <div
            style={{
              position: 'absolute',
              left: '32px',
              top: '42px',
              width: '16px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#F4B400',
              transform: 'rotate(-32deg)',
            }}
          />

          {/* Connection Apex Node */}
          <div
            style={{
              position: 'absolute',
              top: '2px',
              right: '4px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#18A957',
              border: '2.5px solid #FAF7F0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          />
        </div>

        {/* Wordmark: RUVO */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'ruvoWordmarkReveal 0.55s cubic-bezier(0.25, 1, 0.5, 1) 1.35s forwards',
            opacity: 0,
          }}
        >
          <span style={{ fontSize: '36px', fontWeight: '900', color: '#171A1F', fontFamily: 'system-ui, -apple-system, sans-serif' }}>R</span>
          <span style={{ fontSize: '36px', fontWeight: '900', color: '#171A1F', fontFamily: 'system-ui, -apple-system, sans-serif' }}>U</span>
          <span style={{ fontSize: '36px', fontWeight: '900', color: '#171A1F', fontFamily: 'system-ui, -apple-system, sans-serif' }}>V</span>
          <span style={{ fontSize: '36px', fontWeight: '900', color: '#171A1F', fontFamily: 'system-ui, -apple-system, sans-serif' }}>O</span>
        </div>

        {/* Tagline / Ecosystem Motto */}
        <div
          style={{
            marginTop: '10px',
            padding: '4px 14px',
            borderRadius: '20px',
            backgroundColor: 'rgba(23, 26, 31, 0.05)',
            animation: 'ruvoTaglineReveal 0.45s ease-out 1.65s forwards',
            opacity: 0,
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: '800',
              color: '#77736B',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            {roleSubtitle}
          </span>
        </div>
      </div>

      {/* Bottom Subtle Brand Mark */}
      <div
        style={{
          position: 'absolute',
          bottom: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          opacity: 0.5,
        }}
      >
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F4B400' }} />
        <span style={{ fontSize: '10px', fontWeight: '800', color: '#77736B', letterSpacing: '1.5px' }}>
          POWERED BY RUVO
        </span>
      </div>
    </div>
  );
};
