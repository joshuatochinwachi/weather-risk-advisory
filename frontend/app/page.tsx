'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import RiskCard from '../components/RiskCard';
import ForecastStrip from '../components/ForecastStrip';
import QuotaFooter from '../components/QuotaFooter';
import LoadingSkeleton from '../components/LoadingSkeleton';
import LocationSearch from '../components/LocationSearch';
import MapView from '../components/MapView';

import { fetchWeather } from '../lib/api';
import { resolveUserLocation } from '../lib/geolocation';
import type { AppState, ApiError } from '../lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type WeatherView = 'current' | 'daily' | 'hourly';

interface RecentSearch {
  lat: number;
  lon: number;
  name: string;
}

const RECENT_KEY = 'wra_recent_searches';
const MAX_RECENT = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function loadRecent(): RecentSearch[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentSearch[];
  } catch {
    return [];
  }
}

function saveRecent(searches: RecentSearch[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(searches));
  } catch {}
}

function addRecent(list: RecentSearch[], entry: RecentSearch): RecentSearch[] {
  const filtered = list.filter(
    (r) => !(Math.abs(r.lat - entry.lat) < 0.001 && Math.abs(r.lon - entry.lon) < 0.001),
  );
  return [entry, ...filtered].slice(0, MAX_RECENT);
}

function getNum(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'string' && v.trim()) {
      const n = parseFloat(v);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

function conditionEmoji(obj: Record<string, unknown>): string {
  const c = String(obj.condition ?? obj.description ?? obj.weather_description ?? '').toLowerCase();
  if (c.includes('thunder') || c.includes('storm')) return '⛈️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return '🌧️';
  if (c.includes('fog') || c.includes('mist')) return '🌫️';
  if (c.includes('cloud') || c.includes('overcast')) return '☁️';
  if (c.includes('partly')) return '⛅';
  if (c.includes('wind')) return '💨';
  return '☀️';
}

function formatHour(timeStr: string): string {
  try {
    const d = new Date(timeStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return timeStr.slice(11, 16) || timeStr;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CurrentWeatherView({ current, units }: { current: Record<string, unknown>; units: 'metric' | 'imperial' }) {
  const unitLabel = units === 'metric' ? '°C' : '°F';
  const temp = getNum(current, ['temp', 'temperature', 'temp_c', 'temp_f', 'feels_like']);
  const feelsLike = getNum(current, ['feels_like', 'feelslike_c', 'feelslike_f', 'apparent_temperature']);
  const humidity = getNum(current, ['humidity', 'relative_humidity', 'humidity_pct']);
  const wind = getNum(current, ['wind_speed', 'wind_speed_kmh', 'wind_kph', 'windspeed', 'wind_mph']);
  const precip = getNum(current, ['precip_mm', 'precipitation', 'rain', 'precip']);
  const uv = getNum(current, ['uv', 'uv_index', 'uvi']);
  const visibility = getNum(current, ['visibility', 'vis_km', 'visibility_km']);
  const emoji = conditionEmoji(current);
  const description = String(current.condition ?? current.description ?? current.weather_description ?? '');

  return (
    <section className="risk-section" aria-label="Current weather">
      <p className="section-label">Current Conditions</p>
      <div className="glass-card current-weather-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
          <span style={{ fontSize: '2.8rem', lineHeight: 1 }}>{emoji}</span>
          <div>
            <div className="current-big-temp">
              <span className="temp-num">{temp !== null ? Math.round(temp) : '—'}</span>
              <span className="temp-unit">{unitLabel}</span>
            </div>
            {description && <p className="current-condition">{description}</p>}
          </div>
        </div>
        <div className="current-weather-grid">
          {feelsLike !== null && (
            <div className="current-stat">
              <span className="current-stat-label">Feels Like</span>
              <span className="current-stat-value">{Math.round(feelsLike)}{unitLabel}</span>
            </div>
          )}
          {humidity !== null && (
            <div className="current-stat">
              <span className="current-stat-label">Humidity</span>
              <span className="current-stat-value">{Math.round(humidity)}%</span>
            </div>
          )}
          {wind !== null && (
            <div className="current-stat">
              <span className="current-stat-label">Wind</span>
              <span className="current-stat-value">{Math.round(wind)}</span>
              <span className="current-stat-sub">km/h</span>
            </div>
          )}
          {precip !== null && (
            <div className="current-stat">
              <span className="current-stat-label">Precipitation</span>
              <span className="current-stat-value">{precip.toFixed(1)}</span>
              <span className="current-stat-sub">mm</span>
            </div>
          )}
          {uv !== null && (
            <div className="current-stat">
              <span className="current-stat-label">UV Index</span>
              <span className="current-stat-value">{Math.round(uv)}</span>
            </div>
          )}
          {visibility !== null && (
            <div className="current-stat">
              <span className="current-stat-label">Visibility</span>
              <span className="current-stat-value">{Math.round(visibility)}</span>
              <span className="current-stat-sub">km</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function HourlyView({ hourly }: { hourly: Record<string, unknown>[] }) {
  if (!hourly || hourly.length === 0) {
    return (
      <section className="hourly-section" aria-label="Hourly forecast">
        <p className="section-label">Hourly Forecast</p>
        <div className="glass-card" style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          No hourly data available for this location.
        </div>
      </section>
    );
  }

  return (
    <section className="hourly-section" aria-label="Hourly forecast">
      <p className="section-label">Hourly Forecast</p>
      <div className="glass-card">
        <div className="hourly-scroll" role="list" aria-label="Hourly weather">
          {hourly.slice(0, 24).map((hour, i) => {
            const timeKey = String(hour.time ?? hour.datetime ?? hour.dt ?? i);
            const temp = getNum(hour, ['temp', 'temperature', 'temp_c', 'temp_f']);
            const precip = getNum(hour, ['precip_mm', 'precipitation', 'rain', 'precip']);
            const emoji = conditionEmoji(hour);
            return (
              <div
                key={timeKey}
                className="hourly-item"
                role="listitem"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <span className="hourly-time">{formatHour(timeKey)}</span>
                <span className="hourly-icon" aria-hidden="true">{emoji}</span>
                <span className="hourly-temp">{temp !== null ? `${Math.round(temp)}°` : '—'}</span>
                {precip !== null && precip > 0 && (
                  <span className="hourly-precip">{precip.toFixed(0)}mm</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Inner page (requires useSearchParams, so wrapped in Suspense in the export)
// ---------------------------------------------------------------------------

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Shared location state
  const [lat, setLat] = useState<number>(-1.2921);
  const [lon, setLon] = useState<number>(36.8219);
  const [locationName, setLocationName] = useState<string>('');

  // UI state
  const [appState, setAppState] = useState<AppState>({ status: 'idle' });
  const [view, setView] = useState<WeatherView>('daily');
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  const [units] = useState<'metric' | 'imperial'>('metric');
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Load recent searches from localStorage
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const doFetch = useCallback(async (
    fLat: number,
    fLon: number,
    fDays = 7,
    fLang = 'en',
  ) => {
    setAppState({ status: 'loading' });
    try {
      const data = await fetchWeather(fLat, fLon, fDays, units, fLang);
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
  }, [units]);

  // ---------------------------------------------------------------------------
  // On mount: read URL params or geolocate
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const paramLat = searchParams.get('lat');
    const paramLon = searchParams.get('lon');
    const paramDays = searchParams.get('days');

    if (paramLat && paramLon) {
      const pLat = parseFloat(paramLat);
      const pLon = parseFloat(paramLon);
      const pDays = paramDays ? parseInt(paramDays) : 7;
      if (!isNaN(pLat) && !isNaN(pLon)) {
        setLat(pLat);
        setLon(pLon);
        doFetch(pLat, pLon, pDays, lang);
        return;
      }
    }

    // No URL params — silently resolve user location.
    // Use a ref to prevent double-fetch if the browser callback fires
    // before the IP fallback promise resolves.
    let fetchStarted = false;
    setGeoLoading(true);

    resolveUserLocation((result) => {
      // Fires immediately when browser geolocation succeeds
      if (!fetchStarted) {
        fetchStarted = true;
        setLat(result.lat);
        setLon(result.lon);
        setGeoLoading(false);
        doFetch(result.lat, result.lon, 7, lang);
      }
    }).then((result) => {
      setGeoLoading(false);
      if (!fetchStarted) {
        fetchStarted = true;
        setLat(result.lat);
        setLon(result.lon);
        if (result.city) setLocationName(result.city);
        doFetch(result.lat, result.lon, 7, lang);
      }
    }).catch(() => setGeoLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ---------------------------------------------------------------------------
  // When user picks a location from map/search
  // ---------------------------------------------------------------------------
  const handleLocationSelect = useCallback((newLat: number, newLon: number, name = '') => {
    setLat(newLat);
    setLon(newLon);
    if (name) setLocationName(name);

    // Update URL so the result is shareable
    const params = new URLSearchParams({ lat: newLat.toFixed(4), lon: newLon.toFixed(4) });
    router.replace(`?${params.toString()}`, { scroll: false });

    // Save to recent searches
    if (name) {
      const entry: RecentSearch = { lat: newLat, lon: newLon, name };
      const updated = addRecent(recent, entry);
      setRecent(updated);
      saveRecent(updated);
    }

    doFetch(newLat, newLon, 7, lang);
  }, [recent, lang, router, doFetch]);

  // ---------------------------------------------------------------------------
  // Language toggle — re-fetch immediately with new lang
  // ---------------------------------------------------------------------------
  const handleLangToggle = useCallback((newLang: 'en' | 'sw') => {
    if (newLang === lang) return;
    setLang(newLang);
    if (appState.status !== 'idle') {
      doFetch(lat, lon, 7, newLang);
    }
  }, [lang, lat, lon, appState.status, doFetch]);

  const handleRetry = () => setAppState({ status: 'idle' });

  const isLoading = appState.status === 'loading';
  const successData = appState.status === 'success' ? appState.data : null;

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

          {/* Language toggle — switches AI summary language */}
          <div
            className="lang-toggle"
            role="group"
            aria-label="AI summary language"
            style={{ marginLeft: 'auto' }}
            title="Switch the AI weather summary language"
          >
            <button
              id="lang-en-btn"
              type="button"
              className={`lang-btn${lang === 'en' ? ' active' : ''}`}
              onClick={() => handleLangToggle('en')}
              aria-pressed={lang === 'en'}
              title="AI summary in English"
            >
              English
            </button>
            <button
              id="lang-sw-btn"
              type="button"
              className={`lang-btn${lang === 'sw' ? ' active' : ''}`}
              onClick={() => handleLangToggle('sw')}
              aria-pressed={lang === 'sw'}
              title="AI summary in Swahili"
            >
              Swahili
            </button>
          </div>

          <div className="header-badge" aria-label="Live service indicator">
            <span className="dot" aria-hidden="true" />
            Live
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Location Input — map + search                                     */}
        {/* ---------------------------------------------------------------- */}
        <main id="main-content">
          <section className="location-section" aria-labelledby="location-label">
            <p className="section-label" id="location-label">Select Location</p>
            <div className="glass-card location-card">

              {/* Search row: geocoding input + GPS button side by side */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <LocationSearch
                    onSelect={handleLocationSelect}
                    disabled={isLoading}
                    initialValue={locationName}
                  />
                </div>
                <button
                  id="use-my-location-btn"
                  type="button"
                  className="gps-btn"
                  disabled={isLoading || geoLoading}
                  title="Use my current GPS location"
                  aria-label="Use my current GPS location"
                  onClick={() => {
                    if (!navigator?.geolocation) {
                      alert('Your browser does not support GPS location.');
                      return;
                    }
                    setGeoLoading(true);
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setGeoLoading(false);
                        handleLocationSelect(
                          pos.coords.latitude,
                          pos.coords.longitude,
                          'My Location',
                        );
                      },
                      () => {
                        setGeoLoading(false);
                        alert(
                          'Location access denied.\n\nTo fix this: click the lock icon in your browser address bar → Site settings → Location → Allow.',
                        );
                      },
                      { enableHighAccuracy: true, timeout: 8000 },
                    );
                  }}
                >
                  {geoLoading ? (
                    <span className="gps-spinner" aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true">📍</span>
                  )}
                </button>
              </div>

              {/* Recent searches */}
              {recent.length > 0 && (
                <div className="recent-searches" role="group" aria-label="Recent locations">
                  <span className="recent-label">Recent</span>
                  {recent.map((r) => (
                    <button
                      key={`${r.lat},${r.lon}`}
                      type="button"
                      className="recent-tag"
                      onClick={() => handleLocationSelect(r.lat, r.lon, r.name)}
                      aria-label={`Search ${r.name} again`}
                    >
                      📍 {r.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Geo-resolve loading indicator */}
              {geoLoading && (
                <div className="geo-loading-banner" role="status" aria-live="polite">
                  <span className="geo-loading-spinner" aria-hidden="true" />
                  Detecting your location…
                </div>
              )}

              {/* Mapbox interactive map */}
              <div className="map-section">
                <MapView
                  lat={lat}
                  lon={lon}
                  onLocationChange={(newLat, newLon) => handleLocationSelect(newLat, newLon)}
                  height={300}
                />
                <p className="map-hint">
                  Click on the map or drag the pin to select a location
                </p>
              </div>
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Loading state                                                    */}
          {/* -------------------------------------------------------------- */}
          {isLoading && <LoadingSkeleton />}

          {/* -------------------------------------------------------------- */}
          {/* Error state                                                      */}
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
          {successData && (
            <>
              <RiskCard data={successData} />

              {/* View tab switcher */}
              <div className="view-tabs" role="tablist" aria-label="Weather view">
                {(['daily', 'current', 'hourly'] as WeatherView[]).map((v) => (
                  <button
                    key={v}
                    id={`tab-${v}`}
                    role="tab"
                    type="button"
                    className={`view-tab${view === v ? ' active' : ''}`}
                    aria-selected={view === v}
                    onClick={() => setView(v)}
                  >
                    {v === 'daily' ? '📅 Daily' : v === 'current' ? '🌡️ Current' : '⏱️ Hourly'}
                  </button>
                ))}
              </div>

              {/* Tab panels */}
              {view === 'daily' && (
                <ForecastStrip forecast={successData.forecast} />
              )}
              {view === 'current' && successData.current && (
                <CurrentWeatherView
                  current={successData.current as Record<string, unknown>}
                  units={units}
                />
              )}
              {view === 'current' && !successData.current && (
                <div className="glass-card" style={{ padding: 24, color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 32 }}>
                  Current conditions data not available in this response.
                </div>
              )}
              {view === 'hourly' && (
                <HourlyView hourly={(successData.hourly ?? []) as Record<string, unknown>[]} />
              )}
            </>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Idle state (before first fetch, not geolocating)                */}
          {/* -------------------------------------------------------------- */}
          {appState.status === 'idle' && !geoLoading && (
            <div className="glass-card empty-state" aria-label="Welcome — search or click the map to begin">
              <div className="empty-icon" aria-hidden="true">🌍</div>
              <h2 className="empty-title">Search a location or click the map</h2>
              <p className="empty-sub">
                Type a city name in the search box or click anywhere on the map to get
                live weather data, agronomic risk flags, and an AI-generated summary.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Quota Footer — fixed at bottom */}
      <QuotaFooter />
    </>
  );
}

// ---------------------------------------------------------------------------
// Export — wraps in Suspense because useSearchParams requires it in Next.js
// ---------------------------------------------------------------------------
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  );
}
