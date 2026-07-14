'use client';

import { useState, useCallback } from 'react';
import type { PresetLocation } from '../lib/types';

const PRESETS: PresetLocation[] = [
  { name: 'Nairobi', county: 'Nairobi', lat: -1.2921, lon: 36.8219 },
  { name: 'Bomet', county: 'Bomet', lat: -0.7896, lon: 35.3407 },
  { name: 'Mombasa', county: 'Mombasa', lat: -4.0435, lon: 39.6682 },
  { name: 'Kisumu', county: 'Kisumu', lat: -0.0917, lon: 34.7679 },
  { name: 'Eldoret', county: 'Uasin Gishu', lat: 0.5143, lon: 35.2698 },
  { name: 'Nakuru', county: 'Nakuru', lat: -0.3031, lon: 36.0800 },
];

interface Props {
  onSubmit: (lat: number, lon: number) => void;
  loading: boolean;
}

export default function LocationInput({ onSubmit, loading }: Props) {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ lat?: string; lon?: string }>({});

  const selectPreset = useCallback((preset: PresetLocation) => {
    setLat(String(preset.lat));
    setLon(String(preset.lon));
    setActivePreset(preset.name);
    setErrors({});
  }, []);

  const validate = (): boolean => {
    const errs: { lat?: string; lon?: string } = {};
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (!lat.trim()) errs.lat = 'Latitude is required';
    else if (isNaN(latNum) || latNum < -90 || latNum > 90)
      errs.lat = 'Must be between -90 and 90';

    if (!lon.trim()) errs.lon = 'Longitude is required';
    else if (isNaN(lonNum) || lonNum < -180 || lonNum > 180)
      errs.lon = 'Must be between -180 and 180';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(parseFloat(lat), parseFloat(lon));
  };

  const handleLatChange = (v: string) => {
    setLat(v);
    setActivePreset(null);
    if (errors.lat) setErrors((p) => ({ ...p, lat: undefined }));
  };

  const handleLonChange = (v: string) => {
    setLon(v);
    setActivePreset(null);
    if (errors.lon) setErrors((p) => ({ ...p, lon: undefined }));
  };

  return (
    <section className="location-section" aria-labelledby="location-label">
      <p className="section-label" id="location-label">Select Location</p>
      <div className="glass-card location-card">
        {/* Preset quick-picks */}
        <div className="preset-grid" role="group" aria-label="Preset Kenyan locations">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              id={`preset-${preset.name.toLowerCase()}`}
              type="button"
              className={`preset-btn${activePreset === preset.name ? ' active' : ''}`}
              onClick={() => selectPreset(preset)}
              aria-pressed={activePreset === preset.name}
            >
              <span className="preset-name">{preset.name}</span>
              <span className="preset-county">{preset.county}</span>
            </button>
          ))}
        </div>

        {/* Manual coordinate entry */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="coord-row">
            <div className="input-group">
              <label htmlFor="lat-input">Latitude</label>
              <input
                id="lat-input"
                type="number"
                step="any"
                className="coord-input"
                placeholder="-1.2921"
                value={lat}
                onChange={(e) => handleLatChange(e.target.value)}
                aria-invalid={!!errors.lat}
                aria-describedby={errors.lat ? 'lat-error' : undefined}
                disabled={loading}
              />
              {errors.lat && (
                <span id="lat-error" role="alert" style={{ color: 'var(--risk-high)', fontSize: '0.72rem', marginTop: '4px' }}>
                  {errors.lat}
                </span>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="lon-input">Longitude</label>
              <input
                id="lon-input"
                type="number"
                step="any"
                className="coord-input"
                placeholder="36.8219"
                value={lon}
                onChange={(e) => handleLonChange(e.target.value)}
                aria-invalid={!!errors.lon}
                aria-describedby={errors.lon ? 'lon-error' : undefined}
                disabled={loading}
              />
              {errors.lon && (
                <span id="lon-error" role="alert" style={{ color: 'var(--risk-high)', fontSize: '0.72rem', marginTop: '4px' }}>
                  {errors.lon}
                </span>
              )}
            </div>
          </div>

          <button
            id="get-assessment-btn"
            type="submit"
            className="submit-btn"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Fetching assessment…
              </>
            ) : (
              '⚡ Get Risk Assessment'
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
