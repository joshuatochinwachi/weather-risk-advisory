'use client';

export default function LoadingSkeleton() {
  return (
    <>
      {/* Risk card skeleton */}
      <section className="risk-section" aria-busy="true" aria-label="Loading risk assessment">
        <p className="section-label">Risk Assessment</p>
        <div className="skeleton skeleton-card" />
      </section>

      {/* Forecast strip skeleton */}
      <section className="forecast-section" aria-busy="true" aria-label="Loading forecast">
        <p className="section-label">7-Day Forecast</p>
        <div className="skeleton-strip">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-day" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </section>
    </>
  );
}
