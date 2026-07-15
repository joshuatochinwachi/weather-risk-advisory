'use client';

import { useState, useEffect, useRef } from 'react';

export type SplashPhase = 'dawn' | 'gathering' | 'rain' | 'clearing' | 'done';

export function useSplashPhase(isDataReady: boolean): SplashPhase {
  const [phase, setPhase] = useState<SplashPhase>('dawn');
  const mountTime = useRef(Date.now());

  useEffect(() => {
    // Transition from Dawn to Gathering after 500ms
    const t1 = setTimeout(() => {
      setPhase((prev) => (prev === 'dawn' ? 'gathering' : prev));
    }, 500);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    // When data is ready (fetch completed successfully or with an error)
    if (isDataReady && (phase === 'gathering' || phase === 'dawn')) {
      setPhase('rain');
      const elapsed = Date.now() - mountTime.current;
      const remaining = Math.max(0, 1200 - elapsed); // enforce min 1.2s total duration

      const t2 = setTimeout(() => {
        setPhase('clearing');
      }, Math.max(400, remaining));

      return () => clearTimeout(t2);
    }
  }, [isDataReady, phase]);

  useEffect(() => {
    if (phase === 'clearing') {
      const t3 = setTimeout(() => {
        setPhase('done');
      }, 500);
      return () => clearTimeout(t3);
    }
  }, [phase]);

  // Hard timing cap - never block past 4s regardless of network state
  useEffect(() => {
    const cap = setTimeout(() => {
      setPhase('done');
    }, 4000);
    return () => clearTimeout(cap);
  }, []);

  return phase;
}
