'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface GeocodingFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lon, lat]
}

interface Props {
  onSelect: (lat: number, lon: number, placeName: string) => void;
  disabled?: boolean;
  initialValue?: string;
}

export default function LocationSearch({ onSelect, disabled, initialValue = '' }: Props) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<GeocodingFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2 || !MAPBOX_TOKEN) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&limit=6&types=place,locality,district,region,country&language=en`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Geocoding failed');
      const data = await res.json();
      setResults(data.features ?? []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [MAPBOX_TOKEN]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (feature: GeocodingFeature) => {
    const [lon, lat] = feature.center;
    setQuery(feature.place_name);
    setOpen(false);
    setResults([]);
    onSelect(lat, lon, feature.place_name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setResults([]);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="location-search-container" ref={containerRef}>
      <div className="location-search-input-wrap">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          id="location-search-input"
          type="search"
          className="location-search-input"
          placeholder="Search for a city or place…"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          aria-label="Search location"
          aria-expanded={open}
          aria-haspopup="listbox"
          role="combobox"
          aria-autocomplete="list"
        />
        {loading && <span className="search-spinner" aria-hidden="true" />}
      </div>
      {open && results.length > 0 && (
        <ul className="search-dropdown" role="listbox" aria-label="Location suggestions">
          {results.map((f) => (
            <li
              key={f.id}
              role="option"
              className="search-result-item"
              onClick={() => handleSelect(f)}
              onKeyDown={(e) => e.key === 'Enter' && handleSelect(f)}
              tabIndex={0}
            >
              <span className="result-pin" aria-hidden="true">📍</span>
              <span className="result-name">{f.place_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
