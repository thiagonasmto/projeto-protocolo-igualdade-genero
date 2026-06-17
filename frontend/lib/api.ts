import type { MetricRow } from "@/lib/protocol";

export type DiagnosticSummary = {
  total_records: number;
  courses_count: number;
  courses: string[];
  cohort_start: number | null;
  cohort_end: number | null;
  implemented_scope: string;
};

export type DiagnosticClassification = {
  label: string;
  level: "critical" | "warning" | "attention" | "good";
};

export type CriticalPhase = {
  fase: string | null;
  gravidade: number;
  alerta: string;
  recomendacao: string;
};

export type LatestDiagnostic = {
  coorte_referencia: number | null;
  ano_conclusao_referencia?: number | null;
  M1: number | null;
  M1_classificacao: DiagnosticClassification | null;
  M2: number | null;
  TEF: number | null;
  TEM: number | null;
  M3: number | null;
  fase_critica: CriticalPhase;
};

export type CompletionMetricRow = {
  ano: number;
  concluintes_F: number;
  concluintes_M: number;
  concluintes_total: number;
  M3_perc_mulheres_concluintes: number;
};

export type GenderDistribution = {
  F?: number;
  M?: number;
  total: number;
};

export type CourseDistribution = GenderDistribution & {
  curso: string;
};

export type InstitutionDistribution = GenderDistribution & {
  nome: string;
};

export type TeacherGroup = GenderDistribution & {
  nome: string;
  perc_F: number;
};

export type TeacherHiringRow = {
  ano: number;
  F: number;
  M: number;
  total: number;
  perc_F: number;
};

export type TeacherProfile = {
  summary: {
    total_records: number;
    active_records: number;
    active_F: number;
    active_M: number;
    active_female_percent: number;
    M4_perc_mulheres_docentes: number;
    total_female_percent: number;
    leadership_records: number;
    leadership_F: number;
    leadership_M: number;
    leadership_female_percent: number;
    M5_perc_mulheres_lideranca: number;
    units_count: number;
    departments_count: number;
  };
  leadership_by_role: TeacherGroup[];
  leadership_by_unit: TeacherGroup[];
  by_unit: TeacherGroup[];
  by_department: TeacherGroup[];
  by_title: TeacherGroup[];
  by_class: TeacherGroup[];
  by_regime: TeacherGroup[];
  by_race: TeacherGroup[];
  hiring_evolution: TeacherHiringRow[];
};

export type DiagnosticResponse = {
  summary: DiagnosticSummary;
  metrics: MetricRow[];
  completion_metrics: CompletionMetricRow[];
  latest_diagnostic: LatestDiagnostic | null;
  distributions: {
    status: Record<string, number>;
    gender: Record<string, number>;
    courses: CourseDistribution[];
    institutions: InstitutionDistribution[];
  };
  teacher_profile?: TeacherProfile | null;
  files?: {
    name: string;
    detected_type?: string;
    rows?: number;
    error?: string;
  }[];
  data_source?: {
    type: string;
    directory: string;
    files_count: number;
  };
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "/_/backend/api").replace(/\/$/, "");

export async function fetchDiagnostic(includeTerms?: string[], excludeTerms?: string[]) {
  const url = new URL(`${API_BASE_URL}/demo/`, window.location.origin);
  if (includeTerms?.length) url.searchParams.set("include_terms", includeTerms.join("\n"));
  if (excludeTerms?.length) url.searchParams.set("exclude_terms", excludeTerms.join("\n"));

  const response = await fetch(url.toString(), { cache: "no-store" });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.detail ?? `Falha ao carregar diagnostico (${response.status}).`;
    throw new Error(message);
  }

  return data as DiagnosticResponse;
}
