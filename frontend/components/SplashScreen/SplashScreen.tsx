'use client';

import React, { useEffect, useState } from 'react';
import { useSplashPhase, SplashPhase } from './useSplashPhase';
import { SkyCanvas } from './SkyCanvas';
import { CloudLayer } from './CloudLayer';
import { StatusTicker } from './StatusTicker';
import { Landscape } from './Landscape';

interface SplashScreenProps {
  isDataReady: boolean;
  lat?: number;
  lon?: number;
  onComplete: () => void;
}

export function SplashScreen({ isDataReady, lat, lon, onComplete }: SplashScreenProps) {
  const phase = useSplashPhase(isDataReady);
  const [isRendered, setIsRendered] = useState(true);
  const [fadeClass, setFadeClass] = useState('');
  const [percent, setPercent] = useState(0);

  // Set progress percentage based on the phase
  useEffect(() => {
    switch (phase) {
      case 'dawn':
        setPercent(15);
        break;
      case 'gathering':
        setPercent(45);
        break;
      case 'rain':
        setPercent(85);
        break;
      case 'clearing':
        setPercent(100);
        break;
      case 'done':
        setPercent(100);
        break;
    }
  }, [phase]);

  // Handle the fade-out exit transition
  useEffect(() => {
    if (phase === 'done') {
      setFadeClass('splash-exit');
      const timer = setTimeout(() => {
        setIsRendered(false);
        onComplete();
      }, 300); // 300ms transition time
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  if (!isRendered) return null;

  return (
    <div 
      className={`splash-container phase-${phase} ${fadeClass}`}
      style={fadeClass === 'splash-exit' ? { opacity: 0, pointerEvents: 'none' } : undefined}
    >
      {/* 2D Canvas for rain/snow particles */}
      <SkyCanvas phase={phase} lat={lat} lon={lon} />

      {/* SVG drifting clouds layer */}
      <CloudLayer />

      {/* Sun glow layer */}
      <div className="sun-glow" aria-hidden="true" />

      {/* Centered logo, typography & progress/ticker */}
      <div className="splash-content">
        <div className="splash-logo-mark" aria-hidden="true">
          ☁️
        </div>
        <h1 className="splash-wordmark">
          Weather Risk Advisory
        </h1>

        {/* Status text */}
        <StatusTicker phase={phase} />

        {/* Progress Bar & percentage */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', marginTop: '4px' }}>
          <div className="progress-bar-container" style={{ flex: 1 }}>
            <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
          </div>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.75rem', 
            color: 'var(--text-secondary)', 
            minWidth: '32px', 
            textAlign: 'right' 
          }}>
            {percent}%
          </span>
        </div>
      </div>

      {/* Nature landscape silhouette layer */}
      <Landscape />
    </div>
  );
}
