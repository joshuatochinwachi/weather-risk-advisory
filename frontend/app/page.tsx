'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';

import LocationInput from '../components/LocationInput';
import RiskCard from '../components/RiskCard';
import ForecastStrip from '../components/ForecastStrip';
import TreeUploadPanel from '../components/TreeUploadPanel';
import QuotaFooter from '../components/QuotaFooter';
import LoadingSkeleton from '../components/LoadingSkeleton';

import { fetchWeather } from '../lib/api';
import type { AppState, ApiError } from '../lib/types';

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>({ status: 'idle' });

  const handleSearch = useCallback(async (lat: number, lon: number) => {
    setAppState({ status: 'loading' });
    try {
      const data = await fetchWeather(lat, lon);
      setAppState({ status: 'success', data });
    } catch (err: unknown) {
      const e = err as { httpStatus?: number; apiError?: ApiError };
      setAppState({
        status: 'error',
        httpStatus: e.httpStatus ?? 500,
        apiError: e.apiError ?? {
          error: 'network_error',
          message: 'Could not reach the server. Check your connection and try again.',
        },
      });
    }
  }, []);

  const handleRetry = () => setAppState({ status: 'idle' });

  return (
    <>
      <div className="app-wrapper">
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ---------------------------------------------------------------- */}
        <header className="site-header" role="banner">
          <Image
            src="/logo.png"
            alt="Weather Risk Advisory logo"
            width={44}
            height={44}
            className="logo"
            priority
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="header-text">
            <h1>Weather Risk Advisory</h1>
            <p>Powered by Weather-AI API</p>
          </div>
          <div className="header-badge" aria-label="Live service indicator">
            <span className="dot" aria-hidden="true" />
            Live
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Location Input — always visible                                   */}
        {/* ---------------------------------------------------------------- */}
        <main id="main-content">
          <LocationInput
            onSubmit={handleSearch}
            loading={appState.status === 'loading'}
          />

          {/* -------------------------------------------------------------- */}
          {/* Loading state                                                    */}
          {/* -------------------------------------------------------------- */}
          {appState.status === 'loading' && <LoadingSkeleton />}

          {/* -------------------------------------------------------------- */}
          {/* Error state — differentiated by error type                      */}
          {/* -------------------------------------------------------------- */}
          {appState.status === 'error' && (
            <section className="risk-section" aria-live="assertive" aria-atomic="true">
              <p className="section-label">Assessment Error</p>
              <div className="glass-card error-card">
                {appState.httpStatus === 429 ? (
                  <>
                    <div className="error-icon" aria-hidden="true">⏳</div>
                    <h2 className="error-title">API Quota Exceeded</h2>
                    <p className="error-message">
                      The weather service quota has been exhausted for this period.
                      Weather data is cached for 10 minutes to conserve quota — this error
                      means the quota was hit before a cached response was available.
                    </p>
                    {appState.apiError.retry_after && (
                      <p className="error-retry-time">
                        ⏰ Try again at: {new Date(appState.apiError.retry_after).toLocaleString()}
                      </p>
                    )}
                  </>
                ) : appState.httpStatus === 401 ? (
                  <>
                    <div className="error-icon" aria-hidden="true">🔐</div>
                    <h2 className="error-title">Service Configuration Error</h2>
                    <p className="error-message">
                      The service is not properly configured. Please contact the administrator.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="error-icon" aria-hidden="true">🌐</div>
                    <h2 className="error-title">
                      {appState.httpStatus >= 500 ? 'Weather Service Unavailable' : 'Request Failed'}
                    </h2>
                    <p className="error-message">{appState.apiError.message}</p>
                  </>
                )}
                <button
                  id="error-retry-btn"
                  type="button"
                  className="retry-btn"
                  onClick={handleRetry}
                >
                  Try again
                </button>
              </div>
            </section>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Success state                                                    */}
          {/* -------------------------------------------------------------- */}
          {appState.status === 'success' && (
            <>
              <RiskCard data={appState.data} />
              <ForecastStrip forecast={appState.data.forecast} />
            </>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Empty state — before first search                               */}
          {/* -------------------------------------------------------------- */}
          {appState.status === 'idle' && (
            <div className="glass-card empty-state" aria-label="Welcome — select a location to begin">
              <div className="empty-icon" aria-hidden="true">🌍</div>
              <h2 className="empty-title">Select a location to get started</h2>
              <p className="empty-sub">
                Pick one of the Kenyan preset locations or enter custom coordinates, then click{' '}
                <strong>Get Risk Assessment</strong> to see live weather data, agronomic risk flags,
                and an AI-generated summary.
              </p>
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Tree Analysis Panel — available regardless of weather state     */}
          {/* -------------------------------------------------------------- */}
          <TreeUploadPanel />
        </main>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Quota Footer — fixed at bottom                                      */}
      {/* ------------------------------------------------------------------ */}
      <QuotaFooter />
    </>
  );
}
