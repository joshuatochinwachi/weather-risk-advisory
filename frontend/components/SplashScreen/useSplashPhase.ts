'use client';

import { useState, useEffect, useRef } from 'react';

export type SplashPhase = 'dawn' | 'gathering' | 'rain' | 'clearing' | 'done';

export function useSplashPhase(isDataReady: boolean): SplashPhase {
  const [phase, setPhase] = useState<SplashPhase>('dawn');
  const mountTime = useRef(Date.now());

  useEffect(() => {
    // Transition from Dawn to Gathering after 1000ms (enjoy the sunrise landscape first)
    const t1 = setTimeout(() => {
      setPhase((prev) => (prev === 'dawn' ? 'gathering' : prev));
    }, 1000);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    // When data is ready (fetch completed successfully or with an error)
    if (isDataReady && (phase === 'gathering' || phase === 'dawn')) {
      setPhase('rain');
      const elapsed = Date.now() - mountTime.current;
      // enforce min 4.2s before clearing starts, so clearing finishes right at ~5.0s
      const remaining = Math.max(0, 4200 - elapsed); 

      const t2 = setTimeout(() => {
        setPhase('clearing');
      }, Math.max(1000, remaining));

      return () => clearTimeout(t2);
    }
  }, [isDataReady, phase]);

  useEffect(() => {
    if (phase === 'clearing') {
      const t3 = setTimeout(() => {
        setPhase('done');
      }, 800); // 800ms clearing sunrise phase
      return () => clearTimeout(t3);
    }
  }, [phase]);

  // Hard timing cap - never block past 7s regardless of network state
  useEffect(() => {
    const cap = setTimeout(() => {
      setPhase('done');
    }, 7000);
    return () => clearTimeout(cap);
  }, []);

  return phase;
}
