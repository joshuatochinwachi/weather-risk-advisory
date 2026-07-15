# Weather Risk Advisory

A real-time agronomic risk advisory web app for farmers. Search or click a location on the map, get AI-powered weather analysis, and see risk flags for frost, drought, extreme wind, and heavy rain — all in a clean, dark-mode UI.

**Live demo:** [https://weather.joshuatochinwachi.online](https://weather.joshuatochinwachi.online)

---

## Architecture

```
Browser (Next.js 14)
       │
       │  GET /api/weather?lat=..&lon=..&lang=..
       │  GET /api/quota
       │  GET /api/weather-geo           (IP-based location fallback)
       ▼
FastAPI Backend (Railway)
       │
       │  GET /v1/weather?ai=true        ← Weather-AI API
       │  GET /v1/usage
       │  GET /v1/weather-geo            (IP-based geolocation)
       ▼
  api.weather-ai.co

Browser ──(Mapbox GL JS CDN)──► api.mapbox.com
       │  Map tiles + geocoding search happen entirely client-side.
       │  No Mapbox calls go through the FastAPI backend.
```

The frontend **never** calls `api.weather-ai.co` directly. All Weather-AI requests are proxied through the FastAPI backend so the API key stays server-side only.

---

## Setup (clone → run in under 5 minutes)

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Weather-AI API key (`wai_...`) from [weather-ai.co](https://weather-ai.co)
- A Mapbox public token from [mapbox.com](https://mapbox.com) (free tier, no card required for first 50K map loads/month)

### 1. Clone

```bash
git clone https://github.com/joshuatochinwachi/weather-risk-advisory.git
cd weather-risk-advisory
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set WEATHER_AI_API_KEY=wai_your_key_here
pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
# Set NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...your_token
npm install
npm run dev
# → http://localhost:3000
```

---

## Environment variables

### Backend (`backend/.env`)
| Variable | Required | Description |
|---|---|---|
| `WEATHER_AI_API_KEY` | ✅ | Your Weather-AI Bearer token (`wai_...`) |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (defaults to localhost:3000) |

### Frontend (`frontend/.env.local`)
| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | Backend URL (defaults to `http://localhost:8000`) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | ✅ | Mapbox public token for map + geocoding (must be `NEXT_PUBLIC_` prefix) |

---

## API endpoints (backend surface)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/weather?lat=&lon=&lang=` | Risk assessment + 7-day forecast + hourly + current |
| `GET` | `/api/weather-geo` | IP-based geolocation weather fallback |
| `GET` | `/api/quota` | Remaining API quota |
| `GET` | `/health` | Health check (Railway uses this) |
| `GET` | `/docs` | Interactive API docs (Swagger) |

---

## Features

- **Interactive Mapbox map** — click or drag a pin to select any location globally
- **Geocoding search** — type a city name, autocomplete powered by Mapbox Geocoding API
- **IP-based geolocation fallback** — if browser location is denied, the app silently resolves your location via the backend's `/api/weather-geo` proxy
- **Shareable URLs** — `?lat=..&lon=..` query params so risk assessments can be linked directly
- **Language toggle** — switch the AI summary between English and Swahili (`lang=sw`) — relevant for Kenya's farmers
- **View tabs** — Current conditions, 7-Day daily forecast, Hourly strip — all from one API call
- **Recent searches** — last 5 searched locations stored in `localStorage`, one-click to re-select

---

## Design decisions

### Why `/v1/weather` with `ai=true` and NOT `/v1/insights`
`/v1/insights` requires a Pro/Scale plan and returns a 403 on Free. This app deliberately uses `/v1/weather?ai=true`, which returns the Gemini-generated summary field on all plans. This is documented in the Weather-AI API docs.

### Why one backend endpoint, not four
`/v1/current`, `/v1/daily`, `/v1/hourly`, and `/v1/forecast` are documented aliases of the same handler as `/v1/weather`. The UI derives all views (Current / Daily / Hourly tabs) from a single `/api/weather` response — fewer API calls, fewer failure points, correct by the docs.

Uses `/v1/weather` as the single data source; `/v1/current`, `/v1/daily`, `/v1/hourly`, and `/v1/forecast` are documented aliases of the same handler, so the UI derives all views from one API call rather than four redundant integrations.

### Why Mapbox and not Google Maps
Google Maps Platform requires a credit card on file even to stay within the free tier (as of March 2025). Mapbox's free tier is 50K map loads/month and 100K geocoding requests/month, no card required to sign up. The Mapbox token is URL-restricted to the production domain — that's Mapbox's intended security model for public tokens.

### Why in-memory cache instead of Redis
The Free plan allows **1,000 requests/month**. Without caching, aggressive testing could exhaust quota before the live demo is seen. An in-memory TTL cache with a 10-minute window directly protects the monthly quota with no external infrastructure.

Cache key is `lat:lon:days:units:lang` with lat/lon rounded to 2 decimal places to avoid cache misses from noise-level coordinate differences.

### Why retry on 500/503 only — never on 4xx
Retrying a 4xx (400, 401, 403, 429) wastes quota and hides real problems. Exponential backoff: 1s → 2s → 4s, max 3 attempts.

### Why CORS is locked to specific origins
Wildcarding CORS would allow any website to call your backend using a visitor's browser. Since the backend holds a real API key, this could drain quota. The backend lists only `localhost:3000` and the Vercel production URL.

---

## Running tests

```bash
cd backend
python -m pytest tests/ -v
```

Tests cover: cache hit/miss/expiry, all four risk thresholds, HTTP error code mapping (401/403/429/500/503).

---

## What I'd do with more time

- **Webhook frost alerts** — Weather-AI supports webhooks on Pro+. Register a webhook for frost events, send SMS/email to farmers the night before.
- **PWA manifest** — installable on mobile home screen; a "farmer checks weather on their phone" use case. High polish-to-effort ratio.
- **Compare view** — call `/api/weather` for 2-3 locations side by side. Zero new backend work, reuses everything.
- **Historical quota chart** — already fetch `/v1/usage`; store snapshots in localStorage and chart the trend.

---

## Security checklist

```bash
# Verify no API key in git history before pushing:
git log -p | grep wai_
# Should return nothing.
```

`.env` is in `.gitignore` at both repo root and `backend/` level.
