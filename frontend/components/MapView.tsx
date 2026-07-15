'use client';

import { useEffect, useRef } from 'react';

interface Props {
  lat: number;
  lon: number;
  onLocationChange: (lat: number, lon: number) => void;
  /** Height of the map container. Defaults to 340px */
  height?: number;
}

declare global {
  interface Window {
    mapboxgl: {
      Map: new (opts: Record<string, unknown>) => MapboxMapInstance;
      Marker: new (opts?: Record<string, unknown>) => MapboxMarkerInstance;
      accessToken: string;
    };
  }
}

interface MapboxMapInstance {
  on(event: string, handler: (e: unknown) => void): void;
  flyTo(opts: { center: [number, number]; zoom?: number; speed?: number }): void;
  remove(): void;
}

interface MapboxMarkerInstance {
  setLngLat(coords: [number, number]): MapboxMarkerInstance;
  addTo(map: MapboxMapInstance): MapboxMarkerInstance;
  setDraggable(draggable: boolean): MapboxMarkerInstance;
  getLngLat(): { lng: number; lat: number };
  on(event: string, handler: () => void): void;
}

const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';
const MAPBOX_CDN_CSS = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
const MAPBOX_CDN_JS = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';

let scriptLoaded = false;
let scriptLoading = false;
const scriptCallbacks: Array<() => void> = [];

function loadMapboxScript(token: string, onReady: () => void) {
  if (scriptLoaded) { onReady(); return; }
  if (scriptLoading) { scriptCallbacks.push(onReady); return; }

  scriptLoading = true;
  scriptCallbacks.push(onReady);

  // CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = MAPBOX_CDN_CSS;
  document.head.appendChild(link);

  // JS
  const script = document.createElement('script');
  script.src = MAPBOX_CDN_JS;
  script.onload = () => {
    window.mapboxgl.accessToken = token;
    scriptLoaded = true;
    scriptLoading = false;
    scriptCallbacks.forEach((cb) => cb());
    scriptCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

export default function MapView({ lat, lon, onLocationChange, height = 340 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const markerRef = useRef<MapboxMarkerInstance | null>(null);
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return;

    loadMapboxScript(MAPBOX_TOKEN, () => {
      if (!containerRef.current || mapRef.current) return;

      const map = new window.mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: [lon, lat],
        zoom: 9,
        attributionControl: true,
      });

      const marker = new window.mapboxgl.Marker({
        color: '#3b82f6',
        draggable: true,
      })
        .setLngLat([lon, lat])
        .addTo(map);

      marker.on('dragend', () => {
        const { lng, lat: newLat } = marker.getLngLat();
        onLocationChange(newLat, lng);
      });

      map.on('click', (e: unknown) => {
        const event = e as { lngLat: { lng: number; lat: number } };
        const { lng, lat: newLat } = event.lngLat;
        marker.setLngLat([lng, newLat]);
        onLocationChange(newLat, lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [MAPBOX_TOKEN]);

  // Keep marker in sync when lat/lon change externally (e.g. search result)
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLngLat([lon, lat]);
      mapRef.current.flyTo({ center: [lon, lat], zoom: 9, speed: 1.4 });
    }
  }, [lat, lon]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="map-fallback" style={{ height }}>
        <p>Map unavailable — Mapbox token not configured.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id="mapbox-map"
      className="mapbox-container"
      style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}
      aria-label="Interactive map — click to select a location, or drag the pin"
      role="application"
    />
  );
}
