'use client';

import { useEffect, useState } from 'react';
import { fetchQuota } from '../lib/api';
import type { QuotaResponse } from '../lib/types';

export default function QuotaFooter() {
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchQuota();
        if (!cancelled) setQuota(data);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const isError = error || (quota && quota.error_status);

  if (isError || !quota) {
    // Render an empty footer rail to preserve fixed positioning
    return (
      <footer className="quota-footer" aria-label="API quota status">
        <div className="quota-inner">
          <span className="quota-label">
            {isError ? 'Quota lookup unavailable' : 'Loading quota…'}
          </span>
        </div>
      </footer>
    );
  }

  const usedPct = quota.limit > 0 ? (quota.used / quota.limit) * 100 : 0;
  const isLow = quota.remaining < quota.limit * 0.1; // < 10% remaining

  return (
    <footer className="quota-footer" id="quota-footer" aria-label="API quota status">
      <div className="quota-inner">
        <span className="quota-label">API Quota</span>

        <div className="quota-bar-wrap" title={`${quota.remaining} requests remaining`}>
          <div className="quota-bar" role="progressbar" aria-valuenow={quota.used} aria-valuemin={0} aria-valuemax={quota.limit}>
            <div
              className={`quota-bar-fill${isLow ? ' low' : ''}`}
              style={{ width: `${Math.min(100 - usedPct, 100)}%` }}
            />
          </div>
          <span className="quota-text">
            {quota.remaining.toLocaleString()} / {quota.limit.toLocaleString()} remaining
          </span>
        </div>

        {quota.resets_at && (
          <span className="quota-reset">
            Resets {new Date(quota.resets_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}

        <span
          className="quota-label"
          style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}
          title="Caching is active — repeated lookups serve from in-memory cache for 10 minutes, protecting quota"
        >
          ⚡ Cached for 10 min
        </span>
      </div>
    </footer>
  );
}
