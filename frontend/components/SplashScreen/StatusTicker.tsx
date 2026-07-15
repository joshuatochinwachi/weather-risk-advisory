'use client';

import React from 'react';
import { SplashPhase } from './useSplashPhase';

interface StatusTickerProps {
  phase: SplashPhase;
}

export function StatusTicker({ phase }: StatusTickerProps) {
  const getStatusText = () => {
    switch (phase) {
      case 'dawn':
        return 'Connecting to Weather-AI...';
      case 'gathering':
        return 'Fetching current conditions...';
      case 'rain':
        return 'Calculating risk thresholds...';
      case 'clearing':
      case 'done':
        return 'Preparing your dashboard...';
      default:
        return 'Connecting...';
    }
  };

  return (
    <div className="status-ticker" role="status" aria-live="polite">
      <span>{getStatusText()}</span>
      <span className="status-ticker-caret" aria-hidden="true" />
    </div>
  );
}
