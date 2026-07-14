// lib/types.ts — TypeScript interfaces mirroring backend Pydantic models

export type RiskLevel = 'low' | 'medium' | 'high';
export type RiskFlagType = 'frost' | 'drought' | 'extreme_wind' | 'heavy_rain';
export type Severity = 'low' | 'medium' | 'high';

export interface LocationInfo {
  lat: number;
  lon: number;
  city?: string | null;
  country?: string | null;
}

export interface RiskFlag {
  type: RiskFlagType;
  severity: Severity;
  detail: string;
}

export interface DailyForecast {
  date?: string;
  temp_min?: number | null;
  temp_max?: number | null;
  precip_mm?: number | null;
  wind_speed_kmh?: number | null;
  condition?: string | null;
  icon?: string | null;
  // Common alternative field names from Weather-AI
  [key: string]: unknown;
}

export interface RiskAssessmentResponse {
  location: LocationInfo;
  risk_level: RiskLevel;
  flags: RiskFlag[];
  ai_summary: string | null;
  forecast: DailyForecast[];
  cached: boolean;
  fetched_at: string;
}

export interface QuotaResponse {
  used: number;
  limit: number;
  remaining: number;
  resets_at: string | null;
  error_status?: boolean | null;
}

export interface TreeAnalysisResult {
  total_tree_count: number | null;
  canopy_coverage_pct: number | null;
  health_status: string | null;
  overlay_image_url: string | null;
  raw: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  message: string;
  retry_after?: string | null;
  code?: number;
}

export type AppState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: RiskAssessmentResponse }
  | { status: 'error'; apiError: ApiError; httpStatus: number };

export interface PresetLocation {
  name: string;
  county: string;
  lat: number;
  lon: number;
}
