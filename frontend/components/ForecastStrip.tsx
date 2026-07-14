'use client';

import type { DailyForecast } from '../lib/types';

// Map common condition strings / WMO codes to emojis
function conditionIcon(day: DailyForecast): string {
  const cond = (day.condition ?? day.weather_description ?? '') as string;
  const lower = cond.toLowerCase();

  if (lower.includes('thunder') || lower.includes('storm')) return '⛈️';
  if (lower.includes('snow') || lower.includes('blizzard')) return '❄️';
  if (lower.includes('rain') || lower.includes('shower') || lower.includes('drizzle')) return '🌧️';
  if (lower.includes('fog') || lower.includes('mist') || lower.includes('haze')) return '🌫️';
  if (lower.includes('cloud') || lower.includes('overcast')) return '☁️';
  if (lower.includes('partly') || lower.includes('partial')) return '⛅';
  if (lower.includes('wind')) return '💨';
  if (lower.includes('clear') || lower.includes('sunny') || lower.includes('fair')) return '☀️';

  // Fallback: check precip amount
  const precip = getNum(day, ['precip_mm', 'precipitation', 'rain', 'rainfall_mm']);
  if (precip !== null && precip > 10) return '🌧️';
  if (precip !== null && precip > 0) return '🌦️';

  return '☀️';
}

function getNum(day: DailyForecast, keys: string[]): number | null {
  for (const k of keys) {
    const v = (day as Record<string, unknown>)[k];
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = parseFloat(v);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

function formatDay(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
  } catch {
    return dateStr.slice(0, 6);
  }
}

interface Props {
  forecast: DailyForecast[];
}

export default function ForecastStrip({ forecast }: Props) {
  if (!forecast || forecast.length === 0) return null;

  return (
    <section className="forecast-section" aria-labelledby="forecast-label">
      <p className="section-label" id="forecast-label">7-Day Forecast</p>
      <div className="glass-card">
        <div className="forecast-strip" role="list" aria-label="Daily weather forecast">
          {forecast.slice(0, 7).map((day, i) => {
            const tempMax = getNum(day, ['temp_max', 'max_temp', 'temperature_max', 'high']);
            const tempMin = getNum(day, ['temp_min', 'min_temp', 'temperature_min', 'low']);
            const precip = getNum(day, ['precip_mm', 'precipitation', 'rain', 'rainfall_mm']);
            const icon = conditionIcon(day);
            const dateKey = (day.date as string | undefined) ?? String(i);

            return (
              <div
                key={dateKey}
                className="forecast-day"
                role="listitem"
                aria-label={`${formatDay(day.date as string | undefined)}: ${icon}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="day-name">{formatDay(day.date as string | undefined)}</span>
                <span className="day-icon" aria-hidden="true">{icon}</span>
                <div className="day-temp">
                  <span className="temp-max">
                    {tempMax !== null ? `${Math.round(tempMax)}°` : '—'}
                  </span>
                  <span className="temp-min">
                    {tempMin !== null ? `${Math.round(tempMin)}°` : '—'}
                  </span>
                </div>
                {precip !== null && precip > 0 && (
                  <span className="precip">{precip.toFixed(0)}mm</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
