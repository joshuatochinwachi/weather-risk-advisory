// lib/api.ts — typed fetch wrapper for all backend calls
// The frontend NEVER calls api.weather-ai.co directly.
// Everything routes through our FastAPI backend so the API key stays server-side.

import type { ApiError, QuotaResponse, RiskAssessmentResponse } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    // FastAPI wraps our error dicts in { detail: ... }
    const detail = body?.detail ?? body;
    const apiError: ApiError = {
      error: detail?.error ?? 'unknown_error',
      message: detail?.message ?? detail?.detail ?? String(body),
      retry_after: detail?.retry_after ?? null,
      code: res.status,
    };
    throw { httpStatus: res.status, apiError };
  }

  return body as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchWeather(
  lat: number,
  lon: number,
  days = 7,
  units: 'metric' | 'imperial' = 'metric',
  lang = 'en'
): Promise<RiskAssessmentResponse> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    days: String(days),
    units,
    lang,
  });
  const res = await fetch(`${API_BASE}/api/weather?${params.toString()}`, {
    cache: 'no-store',
  });
  return handleResponse<RiskAssessmentResponse>(res);
}

export async function fetchQuota(): Promise<QuotaResponse> {
  const res = await fetch(`${API_BASE}/api/quota`, { cache: 'no-store' });
  return handleResponse<QuotaResponse>(res);
}
