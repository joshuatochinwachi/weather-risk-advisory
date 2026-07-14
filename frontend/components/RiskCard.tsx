'use client';

import type { RiskAssessmentResponse, RiskFlag, RiskFlagType } from '../lib/types';

const FLAG_META: Record<RiskFlagType, { icon: string; label: string }> = {
  frost: { icon: '🌨️', label: 'Frost' },
  drought: { icon: '🌵', label: 'Drought' },
  extreme_wind: { icon: '💨', label: 'Extreme Wind' },
  heavy_rain: { icon: '🌧️', label: 'Heavy Rain' },
};

const RISK_EMOJI: Record<string, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🔴',
};

const RISK_LABEL: Record<string, string> = {
  low: 'LOW RISK',
  medium: 'MEDIUM RISK',
  high: 'HIGH RISK',
};

interface Props {
  data: RiskAssessmentResponse;
}

function FlagChip({ flag }: { flag: RiskFlag }) {
  const meta = FLAG_META[flag.type];
  return (
    <span
      className={`flag-chip ${flag.type}`}
      title={flag.detail}
      role="status"
      aria-label={`${meta.label} — ${flag.severity} severity`}
    >
      <span className="flag-icon" aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}

export default function RiskCard({ data }: Props) {
  const { location, risk_level, flags, ai_summary, cached, fetched_at } = data;
  const cityDisplay = location.city
    ? `${location.city}${location.country ? `, ${location.country}` : ''}`
    : null;

  return (
    <section className="risk-section" aria-labelledby="risk-section-label">
      <p className="section-label" id="risk-section-label">Risk Assessment</p>
      <div className={`glass-card risk-card risk-${risk_level}`} role="region" aria-label={`Risk level: ${risk_level}`}>
        
        {/* Header row */}
        <div className="risk-header">
          <div className={`risk-indicator ${risk_level}`} aria-hidden="true">
            {RISK_EMOJI[risk_level]}
          </div>

          <div className="risk-title-block">
            <p className="risk-level-label">Overall Risk</p>
            <p className={`risk-level-value ${risk_level}`}>{RISK_LABEL[risk_level]}</p>
          </div>

          <div className="risk-location">
            {cityDisplay && <p className="city-name">{cityDisplay}</p>}
            <p className="coords">{data.location.lat.toFixed(4)}, {data.location.lon.toFixed(4)}</p>
          </div>
        </div>

        {/* Risk flags */}
        {flags.length > 0 ? (
          <>
            <div className="flags-row" role="list" aria-label="Active risk flags">
              {flags.map((flag) => (
                <FlagChip key={flag.type} flag={flag} />
              ))}
            </div>
            <div>
              {flags.map((flag) => (
                <p key={`detail-${flag.type}`} className="flag-detail">
                  <strong style={{ color: 'var(--text-primary)' }}>{FLAG_META[flag.type].label}:</strong>{' '}
                  {flag.detail}
                </p>
              ))}
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '8px' }}>
            ✅ No active risk flags for this location and forecast period.
          </p>
        )}

        {/* AI Summary */}
        {ai_summary && (
          <div className="ai-summary-section">
            <div className="ai-summary-label">
              <span>AI Analysis</span>
              <span className="ai-badge">Gemini</span>
            </div>
            <p className="ai-summary-text">{ai_summary}</p>
          </div>
        )}

        {/* Cache + fetch metadata */}
        <p className="cached-badge">
          {cached ? '⚡ Served from cache' : '🔄 Live data'}
          {' · '}
          {new Date(fetched_at).toLocaleTimeString()}
        </p>
      </div>
    </section>
  );
}
