const BASE = "/api";

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string | null;
  employee_count_estimate: number | null;
  revenue_estimate_usd: number | null;
  headquarters_country: string | null;
  headquarters_city: string | null;
  detected_current_crm: string | null;
  current_score: number | null;
  current_confidence: string | null;
  current_buying_stage: string | null;
  first_detected_at: string;
  last_updated_at: string;
}

export interface Signal {
  id: string;
  signal_type: string;
  signal_description: string;
  source_url: string | null;
  source_name: string | null;
  detected_at: string;
  signal_weight: number | null;
}

export interface OutreachMessage {
  id: string;
  message_type: string;
  message_content: string;
  generated_at: string;
  is_current: boolean;
}

export interface CompanyDetail extends Company {
  signals: Signal[];
  outreach_messages: OutreachMessage[];
  intent_scores: Array<{
    raw_score: number;
    decayed_score: number;
    confidence_level: string;
    buying_stage: string;
    score_date: string;
    is_current: boolean;
  }>;
}

export interface HeatmapCell {
  industry: string;
  geography: string;
  avg_intent_score: number;
  company_count: number;
  high_intent_count: number;
  trend_date: string;
}

export interface TimelinePoint {
  date: string;
  global_avg_score: number;
  total_companies: number;
  high_intent_companies: number;
}

export interface AnalyzeSignal {
  signal_type: string;
  signal_description: string;
  source_url: string | null;
  source_name: string | null;
  signal_weight: number | null;
}

export interface AnalyzeResult {
  company_name: string;
  company_domain: string;
  industry: string | null;
  employee_count_estimate: number | null;
  headquarters_country: string | null;
  detected_current_crm: string | null;
  raw_score: number;
  validated_score: number;
  buying_stage: string;
  confidence_level: string;
  intent_summary: string | null;
  pain_points: string[];
  outreach_message: string | null;
  signals: AnalyzeSignal[];
  saved_company_id: string | null;
}

export interface Stats {
  total_companies_tracked: number;
  average_intent_score: number;
  buying_stage_distribution: Record<string, number>;
  last_batch_run: {
    id: string | null;
    status: string | null;
    completed_at: string | null;
    companies_scored: number;
  };
}

export interface BatchStatus {
  run_id: string;
  status: string;
  progress_pct: number;
  companies_discovered: number;
  companies_scored: number;
  message: string;
}

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  getCompanies: (params?: { skip?: number; limit?: number; min_score?: number; buying_stage?: string }) =>
    get<Company[]>("/companies", params as Record<string, string | number>),

  getCompany: (id: string) => get<CompanyDetail>(`/companies/${id}`),

  refreshCompany: (id: string) => post<{ message: string }>(`/companies/${id}/refresh`),

  getHeatmap: (days = 30) => get<HeatmapCell[]>("/market-trends/heatmap", { days }),

  getTimeline: (days = 90) => get<TimelinePoint[]>("/market-trends/timeline", { days }),

  getStats: () => get<Stats>("/stats"),

  analyzeUrl: (url: string) => post<AnalyzeResult>("/companies/analyze", { url }),

  startResearch: (company_name: string, company_url: string) =>
    post<{ job_id: string; status: string }>("/research/start", { company_name, company_url }),

  getResearchStatus: (job_id: string) =>
    get<{ job_id: string; status: string; progress_pct: number; message: string; company_name: string; company_domain: string; error: string | null }>(`/research/${job_id}/status`),

  getResearchReport: (job_id: string) => get<Record<string, unknown>>(`/research/${job_id}/report`),

  triggerBatch: () => post<{ message: string; status: string }>("/analysis/run"),

  getBatchStatus: () => get<BatchStatus>("/analysis/status"),

  getBatchHistory: () => get<unknown[]>("/analysis/history"),
};
