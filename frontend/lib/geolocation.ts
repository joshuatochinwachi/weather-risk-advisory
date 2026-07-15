// lib/geolocation.ts — browser geolocation wrapper with IP-based fallback

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface LocationResult {
  lat: number;
  lon: number;
  source: 'browser' | 'ip' | 'failed';
  city?: string | null;
  country?: string | null;
}

/**
 * Attempt browser geolocation with a 5-second timeout.
 * On success, resolves with the user's coords.
 * On denial or error, rejects so the caller can fall back.
 */
function getBrowserLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error('Geolocation API not available'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60_000 },
    );
  });
}

/**
 * Fall back to the backend's /api/weather-geo IP-based lookup.
 * Returns only lat/lon/city/country — does NOT trigger a weather fetch.
 */
async function getIpLocation(): Promise<LocationResult> {
  try {
    const res = await fetch(`${API_BASE}/api/weather-geo`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`weather-geo returned ${res.status}`);
    const data = await res.json();
    const lat = data.location?.lat ?? data.lat ?? 0;
    const lon = data.location?.lon ?? data.lon ?? 0;
    return {
      lat,
      lon,
      source: 'ip',
      city: data.location?.city ?? null,
      country: data.location?.country ?? null,
    };
  } catch {
    return { lat: -1.2921, lon: 36.8219, source: 'failed' }; // Nairobi hard-fallback
  }
}

/**
 * Resolve the user's location.
 *
 * Strategy:
 *   1. Try browser geolocation (fast if the user has already granted permission).
 *   2. On failure, call /api/weather-geo (IP-based, silent, zero user friction).
 *   3. If that also fails, fall back to Nairobi as a known-good default.
 *
 * @param onBrowserSuccess called immediately when browser geolocation succeeds,
 *   allowing the UI to update before the IP fallback could also resolve.
 */
export async function resolveUserLocation(
  onBrowserSuccess?: (r: LocationResult) => void,
): Promise<LocationResult> {
  try {
    const { lat, lon } = await getBrowserLocation();
    const result: LocationResult = { lat, lon, source: 'browser' };
    onBrowserSuccess?.(result);
    return result;
  } catch {
    // Browser denied or unavailable — fall back to IP quietly
    return getIpLocation();
  }
}
