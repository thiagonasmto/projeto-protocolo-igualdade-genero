export type Gender = "F" | "M";
export type Status = "ATIVO" | "EVADIDO" | "CONCLUINTE";

export type StudentRecord = {
  id: string;
  genero: Gender;
  curso: string;
  ano_ingresso: number;
  ano_conclusao?: number;
  status_canonico: Status;
  nivel_ensino: "GRADUAÇÃO";
  sigla_ies?: string;
};

export type M1Row = {
  ano: number;
  total: number;
  mulheres: number;
  homens: number;
  perc_f: number;
};

export type MetricRow = {
  coorte: number;
  ingressantes_F: number;
  ingressantes_M: number;
  ingressantes_total: number;
  evadidos_F: number;
  evadidos_M: number;
  concluintes_F: number;
  concluintes_M: number;
  M1_perc_mulheres_ingressantes: number;
  TEF: number;
  TEM: number;
  M2_gap_evasao: number;
  M3_perc_mulheres_concluintes: number;
};

export const COLORS = {
  f: "#E91E63",
  m: "#1976D2",
  verde: "#4CAF50",
  amarelo: "#FF9800",
  vermelho: "#F44336",
  roxo: "#9C27B0",
};

export const DEFAULT_TI_CONFIG = {
  incluir: [
    "computac",
    "computação",
    "informatic",
    "informátic",
    "software",
    "sistemas de informac",
    "sistemas de informação",
    "tecnologia da informac",
    "tecnologia da informação",
    "ciencia de dado",
    "ciência de dado",
    "data science",
    "inteligencia artificial",
    "inteligência artificial",
    "analise e desenvolvimento",
    "análise e desenvolvimento",
    "analise de sistema",
    "análise de sistema",
    "redes de computador",
    "seguranca da informac",
    "segurança da informação",
    "banco de dado",
    "jogos digitais",
    "telecomunicac",
    "telecomunicação",
    "mecatronic",
    "mecatrônica",
  ],
  excluir: [
    "eletric",
    "elétric",
    "civil",
    "mecanic",
    "mecânic",
    "quimic",
    "químic",
    "ambiental",
    "producao",
    "produção",
    "aliment",
    "medicin",
    "direito",
    "pedagog",
    "letras",
    "histori",
    "história",
    "psicolog",
    "biolog",
    "farmac",
    "fármac",
    "odontolog",
    "veterinar",
    "nutric",
    "nutriç",
    "enferm",
    "contab",
    "contáb",
    "administrac",
    "administração",
    "econom",
    "educacao fisica",
    "educação física",
    "arquitetura",
    "jornalis",
    "publicidad",
    "sociolog",
    "filosof",
    "geograf",
    "matemat",
    "matemát",
    "estatistic",
    "estatístic",
    "florestal",
    "agronom",
    "zootecn",
    "music",
    "músic",
    "artes",
    "teatro",
    "dança",
    "danca",
  ],
};

export function buildDemoRecords(): StudentRecord[] {
  const rows: StudentRecord[] = [];
  const courses = [
    "CIÊNCIA DA COMPUTAÇÃO",
    "SISTEMAS DE INFORMAÇÃO",
    "ENGENHARIA DE SOFTWARE",
    "ANÁLISE E DESENVOLVIMENTO DE SISTEMAS",
    "REDES DE COMPUTADORES",
  ];
  const institutions = ["UFRN", "IFRN", "UFERSA", "UFPB", "IFPB"];

  for (let year = 2019; year <= 2025; year += 1) {
    const femaleCount = 26 + (year - 2019) * 4;
    const maleCount = 118 - (year - 2019) * 7;

    for (let index = 0; index < femaleCount; index += 1) {
      rows.push({
        id: `F-${year}-${index}`,
        genero: "F",
        curso: courses[index % courses.length],
        ano_ingresso: year,
        status_canonico: demoStatus(index, year, true),
        nivel_ensino: "GRADUAÇÃO",
        sigla_ies: institutions[index % institutions.length],
      });
    }

    for (let index = 0; index < maleCount; index += 1) {
      rows.push({
        id: `M-${year}-${index}`,
        genero: "M",
        curso: courses[(index + 1) % courses.length],
        ano_ingresso: year,
        status_canonico: demoStatus(index, year, false),
        nivel_ensino: "GRADUAÇÃO",
        sigla_ies: institutions[index % institutions.length],
      });
    }
  }

  return rows;
}

export function isTiCourse(name: string, includeTerms: string[], excludeTerms: string[]) {
  const normalized = slug(name);
  for (const excluded of excludeTerms.map(slug)) {
    if (excluded && normalized.includes(excluded)) {
      return includeTerms.map(slug).some((term) => term && normalized.includes(term));
    }
  }
  return includeTerms.map(slug).some((term) => term && normalized.includes(term));
}

export function filterTiRecords(records: StudentRecord[], includeTerms: string[], excludeTerms: string[]) {
  return records.filter((record) => isTiCourse(record.curso, includeTerms, excludeTerms));
}

export function calculateM1(records: StudentRecord[]): M1Row[] {
  const years = uniqueSorted(records.map((record) => record.ano_ingresso));
  return years.map((ano) => {
    const subset = records.filter((record) => record.ano_ingresso === ano);
    const mulheres = subset.filter((record) => record.genero === "F").length;
    const total = subset.length;
    return {
      ano,
      total,
      mulheres,
      homens: total - mulheres,
      perc_f: total ? round1((mulheres / total) * 100) : 0,
    };
  });
}

export function calculateCohortMetrics(records: StudentRecord[]): MetricRow[] {
  const years = uniqueSorted(records.map((record) => record.ano_ingresso));
  return years.map((coorte) => {
    const subset = records.filter((record) => record.ano_ingresso === coorte);
    const female = subset.filter((record) => record.genero === "F");
    const male = subset.filter((record) => record.genero === "M");
    const evF = female.filter((record) => record.status_canonico === "EVADIDO").length;
    const evM = male.filter((record) => record.status_canonico === "EVADIDO").length;
    const concludedInYear = records.filter((record) => record.ano_conclusao === coorte && record.status_canonico === "CONCLUINTE");
    const ccF = concludedInYear.filter((record) => record.genero === "F").length;
    const ccM = concludedInYear.filter((record) => record.genero === "M").length;
    const tef = female.length ? round1((evF / female.length) * 100) : 0;
    const tem = male.length ? round1((evM / male.length) * 100) : 0;
    const concludedTotal = ccF + ccM;

    return {
      coorte,
      ingressantes_F: female.length,
      ingressantes_M: male.length,
      ingressantes_total: female.length + male.length,
      evadidos_F: evF,
      evadidos_M: evM,
      concluintes_F: ccF,
      concluintes_M: ccM,
      M1_perc_mulheres_ingressantes: female.length + male.length ? round1((female.length / (female.length + male.length)) * 100) : 0,
      TEF: tef,
      TEM: tem,
      M2_gap_evasao: round1(tef - tem),
      M3_perc_mulheres_concluintes: concludedTotal ? round1((ccF / concludedTotal) * 100) : 0,
    };
  });
}

export function classifyM1(value: number) {
  if (value < 20) return { label: "Disparidade Crítica", color: COLORS.vermelho };
  if (value < 30) return { label: "Disparidade Significativa", color: COLORS.amarelo };
  if (value < 40) return { label: "Desbalanceamento Moderado", color: COLORS.amarelo };
  if (value < 50) return { label: "Aproximação da Paridade", color: COLORS.verde };
  return { label: "Paridade Alcançada", color: COLORS.verde };
}

export function identifyCriticalPhase(m1: number | null, m2?: number | null, m3?: number | null) {
  const alerts: { fase: string; gravidade: number; alerta: string }[] = [];

  if (m1 !== null) {
    if (m1 < 20) alerts.push({ fase: "Ingresso", gravidade: 3, alerta: `M1=${m1}% (<20%, Crítica)` });
    else if (m1 < 30) alerts.push({ fase: "Ingresso", gravidade: 2, alerta: `M1=${m1}% (20-30%, Significativa)` });
  }

  if (m2 !== undefined && m2 !== null) {
    if (m2 > 15) alerts.push({ fase: "Permanência", gravidade: 3, alerta: `M2=${m2} p.p. (>15, Crítica)` });
    else if (m2 > 5) alerts.push({ fase: "Permanência", gravidade: 2, alerta: `M2=${m2} p.p. (5-15, Moderada)` });
  }

  if (m1 !== null && m3 !== undefined && m3 !== null && m3 < m1 - 5) {
    alerts.push({ fase: "Conclusão", gravidade: 2, alerta: `M3=${m3}% < M1−5 = ${round1(m1 - 5)}% (perda no pipeline)` });
  }

  if (!alerts.length) {
    return {
      fase: "—",
      gravidade: 0,
      alerta: "Nenhum alerta acima do limiar do protocolo.",
      recomendacao: "Manter monitoramento contínuo.",
    };
  }

  const winner = [...alerts].sort((a, b) => b.gravidade - a.gravidade)[0];
  const recommendations: Record<string, string> = {
    Ingresso:
      "Curto prazo: palestras em escolas e olimpíadas de programação para meninas. Médio prazo: mentoria reversa e dias de imersão de alunas do ensino médio no curso. Longo prazo: inserir computação no currículo do ensino médio e produzir conteúdo audiovisual desconstruindo estereótipos.",
    Permanência:
      "Curto prazo: tutoria entre pares e grupos de afinidade femininos. Médio prazo: bolsas e auxílio-creche; revisar carga horária e práticas docentes hostis. Longo prazo: estruturar política institucional de combate ao assédio e formar docentes em pedagogia inclusiva.",
    Conclusão:
      "Curto prazo: identificar gargalos curriculares e oferecer disciplinas de recuperação. Médio prazo: programas de mentoria com egressas e estágios direcionados. Longo prazo: parcerias com empresas para empregabilidade pós-curso e visibilidade de profissionais mulheres na área.",
  };

  return { ...winner, recomendacao: recommendations[winner.fase] };
}

export function byCourse(records: StudentRecord[]) {
  return uniqueSortedStrings(records.map((record) => record.curso))
    .map((curso) => {
      const subset = records.filter((record) => record.curso === curso);
      const women = subset.filter((record) => record.genero === "F").length;
      return { curso, perc: subset.length ? round1((women / subset.length) * 100) : 0, total: subset.length };
    })
    .sort((a, b) => a.perc - b.perc);
}

export function byInstitution(records: StudentRecord[]) {
  return uniqueSortedStrings(records.map((record) => record.sigla_ies ?? ""))
    .map((ies) => {
      const subset = records.filter((record) => record.sigla_ies === ies);
      const women = subset.filter((record) => record.genero === "F").length;
      return { ies, perc: subset.length ? round1((women / subset.length) * 100) : 0, total: subset.length };
    })
    .filter((item) => item.ies && item.total >= 30)
    .sort((a, b) => a.perc - b.perc);
}

function demoStatus(index: number, year: number, female: boolean): Status {
  if (year >= 2024) return "ATIVO";
  const evasionMod = female ? 4 : 5;
  const completionMod = female ? 7 : 6;
  if (index % evasionMod === 0) return "EVADIDO";
  if (index % completionMod === 0) return "CONCLUINTE";
  return "ATIVO";
}

function uniqueSorted(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function uniqueSortedStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, "_")
    .replace(/_+/g, "_");
}
