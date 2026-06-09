"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, GroupedBarChart, HorizontalBarChart, LineChart } from "@/components/charts";
import {
  fetchDiagnostic,
  type CourseDistribution,
  type DiagnosticResponse,
  type InstitutionDistribution,
  type TeacherGroup,
} from "@/lib/api";
import { COLORS, DEFAULT_TI_CONFIG, type MetricRow } from "@/lib/protocol";

type TabProps = {
  tabs: { label: string; content: React.ReactNode }[];
};

export default function DashboardPage() {
  const [includeText, setIncludeText] = useState(DEFAULT_TI_CONFIG.incluir.join("\n"));
  const [excludeText, setExcludeText] = useState(DEFAULT_TI_CONFIG.excluir.join("\n"));
  const [activeInclude, setActiveInclude] = useState(DEFAULT_TI_CONFIG.incluir);
  const [activeExclude, setActiveExclude] = useState(DEFAULT_TI_CONFIG.excluir);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    fetchDiagnostic(activeInclude, activeExclude)
      .then((data) => {
        if (!alive) return;
        setDiagnostic(data);
      })
      .catch((err: Error) => {
        if (!alive) return;
        setError(err.message);
        setDiagnostic(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [activeExclude, activeInclude]);

  function applyTerms() {
    const include = splitLines(includeText);
    const exclude = splitLines(excludeText);
    setActiveInclude(include);
    setActiveExclude(exclude);
    setMessage(`${include.length} termos de inclusao e ${exclude.length} exclusoes aplicados aos CSVs de discentes.`);
  }

  return (
    <main className="dashboard">
      <Hero diagnostic={diagnostic} loading={loading} />

      {loading ? <Notice color={COLORS.m}>Carregando discentes e docentes a partir do backend...</Notice> : null}
      {error ? <Notice color={COLORS.vermelho}>{error}</Notice> : null}

      {diagnostic ? (
        <>
          <DataSourceBanner diagnostic={diagnostic} />
          <ExecutiveOverview diagnostic={diagnostic} />
          <StudentEquitySection diagnostic={diagnostic} />
          <FacultyEquitySection diagnostic={diagnostic} />
        </>
      ) : null}

      <ConfigSection
        includeText={includeText}
        excludeText={excludeText}
        loading={loading}
        message={message}
        onIncludeChange={setIncludeText}
        onExcludeChange={setExcludeText}
        onApply={applyTerms}
      />
    </main>
  );
}

function Hero({ diagnostic, loading }: { diagnostic: DiagnosticResponse | null; loading: boolean }) {
  const latest = diagnostic?.latest_diagnostic;
  const teacherPercent = diagnostic?.teacher_profile?.summary.M4_perc_mulheres_docentes;
  return (
    <header className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Observatorio de equidade em tecnologia</p>
        <h1>Mapa vivo da presenca feminina em TI</h1>
        <p>
          Leitura integrada de ingresso, permanencia, conclusao e corpo docente para localizar onde a igualdade de genero precisa de acao institucional.
        </p>
      </div>
      <div className="hero-metrics" aria-label="Resumo do diagnostico">
        <HeroMetric label="Mulheres ingressantes" value={latest?.M1 === null || latest?.M1 === undefined ? (loading ? "..." : "-") : `${latest.M1}%`} />
        <HeroMetric label="Mulheres concluintes" value={latest?.M3 === null || latest?.M3 === undefined ? "-" : `${latest.M3}%`} />
        <HeroMetric label="M4 docentes mulheres" value={teacherPercent === undefined ? "-" : `${teacherPercent}%`} />
      </div>
    </header>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DataSourceBanner({ diagnostic }: { diagnostic: DiagnosticResponse }) {
  const validFiles = diagnostic.files?.filter((file) => !file.error) ?? [];
  const erroredFiles = diagnostic.files?.filter((file) => file.error) ?? [];
  const rows = validFiles.reduce((sum, file) => sum + (file.rows ?? 0), 0);

  return (
    <section className="source-panel">
      <div>
        <strong>Fonte de dados</strong>
        <span>{` ${validFiles.length} arquivos locais - ${rows.toLocaleString("pt-BR")} linhas lidas`}</span>
      </div>
      <div className="file-list">
        {validFiles.map((file) => (
          <span key={file.name}>{file.name}</span>
        ))}
      </div>
      {erroredFiles.length ? <div className="source-error">{erroredFiles.length} arquivo(s) com erro de leitura.</div> : null}
    </section>
  );
}

function ExecutiveOverview({ diagnostic }: { diagnostic: DiagnosticResponse }) {
  const latest = diagnostic.latest_diagnostic;
  const teacher = diagnostic.teacher_profile;
  if (!latest) return null;

  const phase = latest.fase_critica;
  const pipeline = [
    { label: "Ingresso", value: latest.M1 ?? 0, color: colorForLevel(latest.M1_classificacao?.level) },
    { label: "Conclusao", value: latest.M3 ?? 0, color: latest.M3 === null ? "#8a92a6" : COLORS.roxo },
    { label: "Docencia ativa", value: teacher?.summary.M4_perc_mulheres_docentes ?? 0, color: COLORS.verde },
    { label: "Lideranca", value: teacher?.summary.M5_perc_mulheres_lideranca ?? 0, color: COLORS.m },
  ];
  const latestM1 = latest.M1 ?? 0;
  const parityGap = round1(50 - latestM1);

  return (
    <section className="executive-grid">
      <div className="insight-panel">
        <div className="panel-kicker">Sinal principal</div>
        <h2>{phase.fase ? `Gargalo em ${phase.fase}` : "Monitoramento sem alerta critico"}</h2>
        <p>{phase.alerta}</p>
        <div className="recommendation">{phase.recomendacao}</div>
      </div>

      <div className="parity-card">
        <div className="panel-kicker">Distancia da paridade</div>
        <strong>{parityGap > 0 ? `${parityGap} p.p.` : "0 p.p."}</strong>
        <span>{parityGap > 0 ? "abaixo de 50% no ingresso mais recente" : "ingresso em paridade ou acima"}</span>
        <div className="parity-track">
          <i style={{ width: `${Math.min(100, latestM1 * 2)}%` }} />
        </div>
      </div>

      <div className="pipeline-panel">
        <div className="panel-kicker">Pipeline de representatividade</div>
        {pipeline.map((item) => (
          <div className="pipeline-row" key={item.label}>
            <span>{item.label}</span>
            <div><i style={{ width: `${Math.min(100, item.value * 2)}%`, background: item.color }} /></div>
            <strong>{item.value ? `${item.value}%` : "-"}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function StudentEquitySection({ diagnostic }: { diagnostic: DiagnosticResponse }) {
  const rows = useMemo(() => buildM1Rows(diagnostic.metrics), [diagnostic.metrics]);
  if (!rows.length || !diagnostic.latest_diagnostic) {
    return <Notice color={COLORS.amarelo}>Sem dados discentes apos os filtros de cursos de TI.</Notice>;
  }

  const latest = diagnostic.latest_diagnostic;
  const courseRows = toPercentRows(diagnostic.distributions.courses, "curso").slice(0, 18);
  const institutionRows = toPercentRows(diagnostic.distributions.institutions ?? [], "nome").filter((item) => item.total >= 30).slice(0, 18);
  const totalIngressants = diagnostic.metrics.reduce((sum, item) => sum + item.ingressantes_total, 0);

  return (
    <section className="section-block">
      <SectionHeader
        label="Discentes"
        title="Onde a jornada estudantil perde diversidade"
        copy="Os CSVs de discentes mostram a composicao por coorte, curso, unidade e situacao academica."
      />
      <div className="metric-grid">
        <MetricCard accent={colorForLevel(latest.M1_classificacao?.level)} label="M1 - mulheres ingressantes" value={latest.M1 === null ? "-" : `${latest.M1}%`} note={latest.M1_classificacao?.label} />
        <MetricCard label="M2 - gap de evasao" value={latest.M2 === null ? "-" : `${latest.M2 > 0 ? "+" : ""}${latest.M2.toFixed(1)} p.p.`} note={latest.TEF === null ? undefined : `TE_F ${latest.TEF}% | TE_M ${latest.TEM}%`} />
        <MetricCard label="M3 - mulheres concluintes" value={latest.M3 === null ? "-" : `${latest.M3}%`} note={latest.ano_conclusao_referencia ? `Ano ${latest.ano_conclusao_referencia}` : undefined} />
        <MetricCard label="Registros TI filtrados" value={diagnostic.summary.total_records.toLocaleString("pt-BR")} note={`${totalIngressants.toLocaleString("pt-BR")} ingressantes nas coortes`} />
      </div>

      <Tabs
        tabs={[
          {
            label: "Evolucao",
            content: (
              <div className="chart-grid">
                <LineChart
                  title="M1 - % de mulheres ingressantes em TI"
                  data={rows.map((item) => ({ x: item.ano, y: item.perc_f }))}
                  color={COLORS.f}
                  yMax={Math.max(55, ...rows.map((item) => item.perc_f + 10))}
                  reference={30}
                  referenceLabel="Alerta 30%"
                  xLabel="Ano"
                  yLabel="%"
                />
                <GroupedBarChart
                  title="Ingressantes por genero"
                  data={rows.map((item) => ({ x: item.ano, a: item.mulheres, b: item.homens }))}
                  aName="Mulheres"
                  bName="Homens"
                />
                <BarChart
                  title="M2 - diferenca de evasao feminina e masculina"
                  data={diagnostic.metrics.map((item) => ({
                    x: item.coorte,
                    y: item.M2_gap_evasao,
                    label: `${item.M2_gap_evasao}`,
                    color: Math.abs(item.M2_gap_evasao) <= 5 ? COLORS.verde : Math.abs(item.M2_gap_evasao) <= 15 ? COLORS.amarelo : COLORS.vermelho,
                  }))}
                  yLabel="p.p."
                  referenceLines={[
                    { value: 5, label: "+5 p.p.", color: COLORS.amarelo },
                    { value: -5, label: "-5 p.p.", color: COLORS.amarelo },
                  ]}
                />
              </div>
            ),
          },
          {
            label: "Cursos e unidades",
            content: (
              <div className="chart-grid">
                <HorizontalBarChart
                  title="Cursos com menor proporcao feminina"
                  data={courseRows.map((item) => ({ y: item.label, x: item.perc, label: `${item.perc}% (${item.total})` }))}
                  color={COLORS.f}
                  reference={30}
                  referenceLabel="30%"
                />
                <HorizontalBarChart
                  title="Unidades/instituicoes com menor proporcao feminina"
                  data={institutionRows.map((item) => ({ y: item.label, x: item.perc, label: `${item.perc}% (${item.total})` }))}
                  color={COLORS.verde}
                  reference={30}
                />
              </div>
            ),
          },
          { label: "Tabela", content: <MetricsTable rows={diagnostic.metrics} /> },
        ]}
      />
    </section>
  );
}

function FacultyEquitySection({ diagnostic }: { diagnostic: DiagnosticResponse }) {
  const teacher = diagnostic.teacher_profile;
  if (!teacher) {
    return <Notice color={COLORS.amarelo}>Nenhum arquivo docentes.xlsx processado pelo backend.</Notice>;
  }

  const hiring = buildHiringBands(teacher.hiring_evolution.filter((item) => item.ano >= 1990));
  const unitRows = teacher.by_unit.slice(0, 14);
  const departmentRows = teacher.by_department.slice(0, 14);

  return (
    <section className="section-block faculty">
      <SectionHeader
        label="Docentes"
        title="Representatividade tambem precisa aparecer na sala e na carreira"
        copy="O XLSX de docentes permite observar composicao ativa, unidade de lotacao, carreira, titulacao e marcadores de diversidade."
      />
      <div className="metric-grid">
        <MetricCard accent={COLORS.f} label="M4 - mulheres docentes" value={`${teacher.summary.M4_perc_mulheres_docentes}%`} note={`${teacher.summary.active_F} de ${teacher.summary.active_records} docentes ativos`} />
        <MetricCard accent={COLORS.m} label="M5 - mulheres em lideranca" value={`${teacher.summary.M5_perc_mulheres_lideranca}%`} note={`${teacher.summary.leadership_F} de ${teacher.summary.leadership_records} cargos atuais`} />
        <MetricCard label="Unidades com docentes ativos" value={String(teacher.summary.units_count)} />
        <MetricCard label="Departamentos ativos" value={String(teacher.summary.departments_count)} />
      </div>

      <Tabs
        tabs={[
          {
            label: "Mapa docente",
            content: (
              <div className="chart-grid">
                <HorizontalBarChart
                  title="Unidades com menor presenca feminina docente"
                  data={unitRows.map((item) => ({ y: item.nome, x: item.perc_F, label: `${item.perc_F}% (${item.total})` }))}
                  color={COLORS.f}
                  reference={50}
                  referenceLabel="Paridade"
                />
                <HorizontalBarChart
                  title="Departamentos criticos por representatividade"
                  data={departmentRows.map((item) => ({ y: item.nome, x: item.perc_F, label: `${item.perc_F}% (${item.total})` }))}
                  color={COLORS.roxo}
                  reference={50}
                />
              </div>
            ),
          },
          {
            label: "Carreira",
            content: (
              <div className="chart-grid">
                <GroupedBarChart
                  title="Docentes ativos por titulacao"
                  data={teacher.by_title.map((item) => ({ x: compactLabel(item.nome), a: item.F ?? 0, b: item.M ?? 0 }))}
                  aName="Mulheres"
                  bName="Homens"
                />
                <GroupedBarChart
                  title="Docentes ativos por classe"
                  data={teacher.by_class.map((item) => ({ x: compactLabel(item.nome), a: item.F ?? 0, b: item.M ?? 0 }))}
                  aName="Mulheres"
                  bName="Homens"
                />
              </div>
            ),
          },
          {
            label: "Interseccionalidade",
            content: (
              <div className="chart-grid">
                <HorizontalBarChart
                  title="Docentes mulheres por raca/cor declarada"
                  data={teacher.by_race.map((item) => ({ y: item.nome, x: item.perc_F, label: `${item.perc_F}% (${item.total})` }))}
                  color={COLORS.verde}
                  reference={50}
                />
                <LineChart
                  title="Ingressos docentes - % mulheres por ciclo de 5 anos"
                  data={hiring.map((item) => ({ x: item.label, y: item.perc_F }))}
                  color={COLORS.f}
                  yMax={70}
                  reference={50}
                  referenceLabel="Paridade"
                  xLabel="Ano"
                  yLabel="%"
                />
              </div>
            ),
          },
          { label: "Resumo docente", content: <TeacherTable rows={[...teacher.by_unit, ...teacher.by_title, ...teacher.by_race].slice(0, 24)} /> },
        ]}
      />
    </section>
  );
}

function ConfigSection({
  includeText,
  excludeText,
  loading,
  message,
  onIncludeChange,
  onExcludeChange,
  onApply,
}: {
  includeText: string;
  excludeText: string;
  loading: boolean;
  message: string;
  onIncludeChange: (value: string) => void;
  onExcludeChange: (value: string) => void;
  onApply: () => void;
}) {
  return (
    <section className="section-block config-block">
      <SectionHeader
        label="Modelo de classificacao"
        title="Termos que definem o recorte de cursos de TI"
        copy="Ajuste o dicionario de inclusao e exclusao quando a instituicao tiver nomes de curso especificos."
      />
      <div className="config-row">
        <div className="field">
          <label htmlFor="include">Termos incluir</label>
          <textarea id="include" value={includeText} onChange={(event) => onIncludeChange(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="exclude">Termos excluir</label>
          <textarea id="exclude" value={excludeText} onChange={(event) => onExcludeChange(event.target.value)} />
        </div>
      </div>
      <button className="primary-button" type="button" onClick={onApply} disabled={loading}>
        Recalcular diagnostico
      </button>
      {message ? <p className="config-message">{message}</p> : null}
    </section>
  );
}

function SectionHeader({ label, title, copy }: { label: string; title: string; copy: string }) {
  return (
    <div className="section-header">
      <span>{label}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

function Notice({ color, children }: { color: string; children: React.ReactNode }) {
  return <div className="alert-box" style={{ "--accent": color } as React.CSSProperties}>{children}</div>;
}

function MetricCard({ label, value, suffix, note, accent, small = false }: { label: string; value: string; suffix?: string; note?: string; accent?: string; small?: boolean }) {
  return (
    <div className={`metric-card ${accent ? "accent" : ""}`} style={accent ? ({ "--accent": accent } as React.CSSProperties) : undefined}>
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${small ? "small" : ""}`} style={accent ? { color: accent } : undefined}>
        {value} {suffix ? <span className="metric-note">{suffix}</span> : null}
      </div>
      {note ? <div className="metric-note">{note}</div> : null}
    </div>
  );
}

function Tabs({ tabs }: TabProps) {
  const [active, setActive] = useState(0);
  return (
    <div className="tabs">
      <div className="tab-list" role="tablist">
        {tabs.map((tab, index) => (
          <button key={tab.label} className={`tab-button ${index === active ? "active" : ""}`} type="button" role="tab" aria-selected={index === active} onClick={() => setActive(index)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs[active]?.content}</div>
    </div>
  );
}

function MetricsTable({ rows }: { rows: MetricRow[] }) {
  const columns: (keyof MetricRow)[] = [
    "coorte",
    "ingressantes_F",
    "ingressantes_M",
    "ingressantes_total",
    "evadidos_F",
    "evadidos_M",
    "concluintes_F",
    "concluintes_M",
    "M1_perc_mulheres_ingressantes",
    "TEF",
    "TEM",
    "M2_gap_evasao",
    "M3_perc_mulheres_concluintes",
  ];
  return (
    <table className="data-table">
      <thead>
        <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.coorte}>
            {columns.map((column) => <td key={column}>{row[column]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TeacherTable({ rows }: { rows: TeacherGroup[] }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>grupo</th>
          <th>mulheres</th>
          <th>homens</th>
          <th>total</th>
          <th>% mulheres</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.nome}>
            <td>{row.nome}</td>
            <td>{row.F ?? 0}</td>
            <td>{row.M ?? 0}</td>
            <td>{row.total}</td>
            <td>{row.perc_F}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function buildM1Rows(metrics: MetricRow[]) {
  return metrics.map((row) => ({
    ano: row.coorte,
    total: row.ingressantes_total,
    mulheres: row.ingressantes_F,
    homens: row.ingressantes_M,
    perc_f: row.M1_perc_mulheres_ingressantes,
  }));
}

function toPercentRows<T extends CourseDistribution | InstitutionDistribution>(rows: T[], labelKey: T extends CourseDistribution ? "curso" : "nome") {
  return rows
    .map((row) => {
      const total = row.total || 0;
      const women = row.F ?? 0;
      return {
        label: String(row[labelKey as keyof T]),
        perc: total ? round1((women / total) * 100) : 0,
        total,
      };
    })
    .sort((a, b) => a.perc - b.perc);
}

function compactLabel(value: string) {
  return value.replace("Classe ", "").replace(" - ", " ").slice(0, 18);
}

function buildHiringBands(rows: { ano: number; F: number; M: number }[]) {
  const bands = new Map<number, { F: number; M: number }>();
  for (const row of rows) {
    const start = Math.floor(row.ano / 5) * 5;
    const current = bands.get(start) ?? { F: 0, M: 0 };
    current.F += row.F;
    current.M += row.M;
    bands.set(start, current);
  }
  return [...bands.entries()].sort(([a], [b]) => a - b).map(([start, values]) => {
    const total = values.F + values.M;
    return {
      label: `${start}-${String(start + 4).slice(2)}`,
      perc_F: total ? round1((values.F / total) * 100) : 0,
    };
  });
}

function colorForLevel(level?: string) {
  if (level === "critical") return COLORS.vermelho;
  if (level === "warning" || level === "attention") return COLORS.amarelo;
  return COLORS.verde;
}

function splitLines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}
