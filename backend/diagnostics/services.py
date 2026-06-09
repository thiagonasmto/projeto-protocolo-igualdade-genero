import json
import re
import unicodedata
from dataclasses import dataclass
from io import BytesIO, StringIO
from pathlib import Path
from typing import Iterable

import pandas as pd


DATA_DIR = Path(__file__).resolve().parent.parent / "data"

DEFAULT_TI_CONFIG = {
    "incluir": [
        "computac",
        "computac",
        "informatic",
        "informatic",
        "software",
        "sistemas de informac",
        "tecnologia da informac",
        "ciencia de dado",
        "data science",
        "inteligencia artificial",
        "analise e desenvolvimento",
        "analise de sistema",
        "redes de computador",
        "seguranca da informac",
        "banco de dado",
        "jogos digitais",
        "telecomunicac",
        "mecatronic",
    ],
    "excluir": [
        "eletric",
        "civil",
        "mecanic",
        "quimic",
        "ambiental",
        "producao",
        "aliment",
        "medicin",
        "direito",
        "pedagog",
        "letras",
        "histori",
        "psicolog",
        "biolog",
        "farmac",
        "odontolog",
        "veterinar",
        "nutric",
        "enferm",
        "contab",
        "administrac",
        "econom",
        "educacao fisica",
        "arquitetura",
        "jornalis",
        "publicidad",
        "sociolog",
        "filosof",
        "geograf",
        "matemat",
        "estatistic",
        "florestal",
        "agronom",
        "zootecn",
        "music",
        "artes",
        "teatro",
        "danca",
    ],
}

COLUMN_SYNONYMS = {
    "ano": ["ano", "nu_ano", "ano_referencia", "year"],
    "ano_ingresso": ["ano_ingresso", "ano_de_ingresso", "ingresso_ano", "ano_entrada", "cohort"],
    "ano_conclusao": ["ano_conclusao", "ano_de_conclusao", "conclusao_ano"],
    "genero": ["sexo", "tp_sexo", "genero", "gender"],
    "curso": ["nome_curso", "no_curso", "curso", "ds_curso", "course"],
    "nome_ies": ["nome_ies", "no_ies", "ies"],
    "instituicao": ["nome_instituicao", "instituicao", "nome_unidade_gestora", "nome_unidade"],
    "sigla_ies": ["sigla_ies", "sg_ies"],
    "uf_ies": ["uf_ies", "sg_uf_ies", "uf"],
    "turno": ["turno", "ds_turno"],
    "aprovado": ["aprovado", "st_aprovado", "st_matricula"],
    "status": [
        "status",
        "situacao",
        "situacao_vinculo",
        "ds_situacao",
        "status_aluno",
        "situacao_aluno",
        "status_discente",
    ],
    "forma_ingresso": ["forma_ingresso", "ds_forma_ingresso"],
    "nivel_ensino": ["nivel_ensino", "nivel", "ds_nivel_ensino", "tp_nivel_academico"],
    "nivel_ensino_sigla": ["sigla_nivel_ensino"],
    "matricula": ["matricula", "id_matricula", "nu_matricula", "id_aluno"],
    "cpf": ["cpf", "nu_cpf"],
    "data_ingresso": ["data_ingresso"],
    "data_desligamento": ["data_desligamento"],
    "funcao_atual": ["funcao_atual"],
    "cargo_funcao_atual": ["cargo_funcao_atual", "cargo/funcao_atual"],
    "unidade_funcao_atual": ["unidade_funcao_atual"],
}

STATUS_MAP = {
    "CONCLUIDO": "CONCLUINTE",
    "CONCLUSAO": "CONCLUINTE",
    "FORMADO": "CONCLUINTE",
    "DEFENDIDO": "CONCLUINTE",
    "GRADUADO": "CONCLUINTE",
    "EGRESSO": "CONCLUINTE",
    "CANCELADO": "EVADIDO",
    "JUBILADO": "EVADIDO",
    "DESLIGADO": "EVADIDO",
    "EVADIDO": "EVADIDO",
    "EXCLUIDO": "EVADIDO",
    "DESISTENCIA": "EVADIDO",
    "ABANDONO": "EVADIDO",
    "TRANSFERIDO": "EVADIDO",
    "TRANSF. COMPULSORIA": "EVADIDO",
    "ATIVO": "ATIVO",
    "ATIVO - FORMANDO": "ATIVO",
    "CADASTRADO": "ATIVO",
    "MATRICULADO": "ATIVO",
    "EM CURSO": "ATIVO",
    "TRANCADO": "ATIVO",
}


@dataclass(frozen=True)
class TiConfig:
    include: tuple[str, ...]
    exclude: tuple[str, ...]

    @classmethod
    def build(cls, include_terms=None, exclude_terms=None):
        include = tuple(_slug(x) for x in (include_terms or DEFAULT_TI_CONFIG["incluir"]) if str(x).strip())
        exclude = tuple(_slug(x) for x in (exclude_terms or DEFAULT_TI_CONFIG["excluir"]) if str(x).strip())
        return cls(include=include, exclude=exclude)


def analyze_records(records: list[dict], include_terms=None, exclude_terms=None) -> dict:
    if not records:
        raise ValueError("Envie ao menos um registro para analise.")
    df = pd.DataFrame(records).astype(str)
    return _analyze_dataframe(df, include_terms=include_terms, exclude_terms=exclude_terms)


def analyze_files(files: Iterable, include_terms=None, exclude_terms=None) -> dict:
    frames = []
    file_reports = []
    for uploaded in files:
        name = getattr(uploaded, "name", "arquivo")
        try:
            df = read_uploaded_file(uploaded)
            normalized = normalize_columns(df)
            detected = detect_file_type(normalized)
            normalized["tipo_arquivo"] = detected
            frames.append(normalized)
            file_reports.append({"name": name, "detected_type": detected, "rows": int(len(df))})
        except Exception as exc:
            file_reports.append({"name": name, "error": str(exc)})

    if not frames:
        raise ValueError("Nenhum arquivo valido foi processado.")

    result = _analyze_dataframe(pd.concat(frames, ignore_index=True), include_terms, exclude_terms)
    result["files"] = file_reports
    return result


def analyze_data_files(include_terms=None, exclude_terms=None) -> dict:
    csv_paths = sorted(DATA_DIR.glob("*.csv"))
    teacher_paths = sorted(DATA_DIR.glob("docentes*.xlsx"))
    if not csv_paths:
        raise ValueError(f"Nenhum arquivo CSV encontrado em {DATA_DIR}.")

    frames = []
    file_reports = []
    for path in csv_paths:
        try:
            raw = path.read_bytes()
            df = read_csv_bytes(raw)
            normalized = normalize_columns(df)
            detected = detect_file_type(normalized)
            normalized = prepare_detected_file(normalized, detected)
            normalized["tipo_arquivo"] = detected
            frames.append(normalized)
            file_reports.append({"name": path.name, "detected_type": detected, "rows": int(len(df))})
        except Exception as exc:
            file_reports.append({"name": path.name, "error": str(exc)})

    if not frames:
        raise ValueError("Nenhum arquivo CSV local valido foi processado.")

    result = _analyze_dataframe(pd.concat(frames, ignore_index=True), include_terms, exclude_terms)
    teacher_profile = None
    for path in teacher_paths:
        try:
            teacher_df = normalize_columns(pd.read_excel(path, dtype=str))
            teacher_profile = _build_teacher_profile(teacher_df)
            file_reports.append({"name": path.name, "detected_type": "DOCENTES", "rows": int(len(teacher_df))})
            break
        except Exception as exc:
            file_reports.append({"name": path.name, "error": str(exc)})

    result["files"] = file_reports
    result["teacher_profile"] = teacher_profile
    result["data_source"] = {
        "type": "local_files",
        "directory": str(DATA_DIR),
        "files_count": len(file_reports),
    }
    return result


def read_uploaded_file(uploaded) -> pd.DataFrame:
    name = getattr(uploaded, "name", "").lower()
    raw = uploaded.read()
    if hasattr(uploaded, "seek"):
        uploaded.seek(0)

    if name.endswith((".xlsx", ".xls")):
        return pd.read_excel(BytesIO(raw), dtype=str)
    if name.endswith(".json"):
        data = json.loads(raw.decode("utf-8"))
        if isinstance(data, dict) and "data" in data:
            data = data["data"]
        return pd.DataFrame(data).astype(str)
    if name.endswith(".csv") or "." not in name:
        return read_csv_bytes(raw)
    raise ValueError("Formato nao suportado. Use CSV, Excel ou JSON.")


def read_csv_bytes(raw: bytes) -> pd.DataFrame:
    encoding, sep = detect_csv_format(raw)
    return pd.read_csv(StringIO(raw.decode(encoding)), sep=sep, dtype=str, low_memory=False)


def prepare_detected_file(df: pd.DataFrame, detected_type: str) -> pd.DataFrame:
    df = df.copy()
    if detected_type == "CONCLUSAO" and "status" not in df.columns:
        df["status"] = "CONCLUIDO"
    return df


def detect_csv_format(raw: bytes) -> tuple[str, str]:
    for encoding in ("utf-8", "latin-1"):
        try:
            header = raw.decode(encoding).splitlines()[0]
        except Exception:
            continue
        counts = {sep: header.count(sep) for sep in ("|", ";", ",", "\t")}
        sep = max(counts, key=counts.get)
        return encoding, sep if counts[sep] else ","
    return "latin-1", ";"


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename = {}
    synonym_index = {
        _slug(alias): canon
        for canon, aliases in COLUMN_SYNONYMS.items()
        for alias in aliases
    }
    for col in df.columns:
        slugged = _slug(col)
        rename[col] = synonym_index.get(slugged, slugged)
    df2 = df.rename(columns=rename)
    return df2.loc[:, ~df2.columns.duplicated()]


def detect_file_type(df: pd.DataFrame) -> str:
    cols = set(df.columns)
    if "status" in cols:
        categories = set(normalize_status(df["status"]).unique())
        if categories - {"CONCLUINTE"}:
            return "COORTE"
    if "ano_conclusao" in cols and df["ano_conclusao"].notna().any():
        return "CONCLUSAO"
    return "INGRESSO"


def normalize_status(series: pd.Series) -> pd.Series:
    values = series.astype(str).map(_normalize_value)
    return values.map(STATUS_MAP).fillna("ATIVO")


def calculate_cohort_metrics(df: pd.DataFrame, cohort_column: str = "ano_ingresso") -> list[dict]:
    ingress = _student_ingress_base(df)
    completion_by_year = {item["ano"]: item for item in calculate_completion_metrics(df)}
    rows = []
    for year in sorted(ingress[cohort_column].dropna().unique()):
        subset = ingress[ingress[cohort_column] == year]
        female = subset[subset["genero"] == "F"]
        male = subset[subset["genero"] == "M"]
        n_female, n_male = len(female), len(male)
        total = n_female + n_male
        evaded_female = int((female["status_canonico"] == "EVADIDO").sum())
        evaded_male = int((male["status_canonico"] == "EVADIDO").sum())
        completion = completion_by_year.get(int(year), {})
        completed_female = int(completion.get("concluintes_F", 0))
        completed_male = int(completion.get("concluintes_M", 0))
        completed_total = completed_female + completed_male

        m1 = _percent(n_female, total)
        tef = _percent(evaded_female, n_female)
        tem = _percent(evaded_male, n_male)
        m3 = _percent(completed_female, completed_total)
        rows.append(
            {
                "coorte": int(year),
                "ingressantes_F": int(n_female),
                "ingressantes_M": int(n_male),
                "ingressantes_total": int(total),
                "evadidos_F": evaded_female,
                "evadidos_M": evaded_male,
                "concluintes_F": completed_female,
                "concluintes_M": completed_male,
                "M1_perc_mulheres_ingressantes": m1,
                "TEF": tef,
                "TEM": tem,
                "M2_gap_evasao": round(tef - tem, 1),
                "M3_perc_mulheres_concluintes": m3,
            }
        )
    return rows


def calculate_completion_metrics(df: pd.DataFrame) -> list[dict]:
    if "ano_conclusao" not in df.columns:
        return []
    completion = df[df["ano_conclusao"].notna()].copy()
    completion = completion[completion["status_canonico"] == "CONCLUINTE"] if "status_canonico" in completion.columns else completion
    rows = []
    for year in sorted(completion["ano_conclusao"].dropna().unique()):
        subset = completion[completion["ano_conclusao"] == year]
        female = int((subset["genero"] == "F").sum())
        male = int((subset["genero"] == "M").sum())
        total = female + male
        rows.append(
            {
                "ano": int(year),
                "concluintes_F": female,
                "concluintes_M": male,
                "concluintes_total": total,
                "M3_perc_mulheres_concluintes": _percent(female, total),
            }
        )
    return rows


def classify_m1(value: float) -> dict:
    if value < 20:
        return {"label": "Disparidade Critica", "level": "critical"}
    if value < 30:
        return {"label": "Disparidade Significativa", "level": "warning"}
    if value < 40:
        return {"label": "Desbalanceamento Moderado", "level": "attention"}
    if value < 50:
        return {"label": "Aproximacao da Paridade", "level": "good"}
    return {"label": "Paridade Alcancada", "level": "good"}


def identify_critical_phase(m1, m2=None, m3=None) -> dict:
    alerts = []
    if m1 is not None:
        if m1 < 20:
            alerts.append(("Ingresso", 3, f"M1={m1}% (<20%, Critica)"))
        elif m1 < 30:
            alerts.append(("Ingresso", 2, f"M1={m1}% (20-30%, Significativa)"))
    if m2 is not None:
        if m2 > 15:
            alerts.append(("Permanencia", 3, f"M2={m2} p.p. (>15, Critica)"))
        elif m2 > 5:
            alerts.append(("Permanencia", 2, f"M2={m2} p.p. (5-15, Moderada)"))
    if m1 is not None and m3 is not None and m3 < m1 - 5:
        alerts.append(("Conclusao", 2, f"M3={m3}% < M1-5 = {round(m1 - 5, 1)}%"))

    if not alerts:
        return {
            "fase": None,
            "gravidade": 0,
            "alerta": "Nenhum alerta acima do limiar do protocolo.",
            "recomendacao": "Manter monitoramento continuo.",
        }

    phase, severity, alert = sorted(alerts, key=lambda item: -item[1])[0]
    recommendations = {
        "Ingresso": (
            "Curto prazo: palestras em escolas e olimpiadas de programacao para meninas. "
            "Medio prazo: mentoria reversa e dias de imersao de alunas do ensino medio no curso. "
            "Longo prazo: inserir computacao no curriculo do ensino medio e produzir conteudo "
            "audiovisual desconstruindo estereotipos."
        ),
        "Permanencia": (
            "Curto prazo: tutoria entre pares e grupos de afinidade femininos. "
            "Medio prazo: bolsas e auxilio-creche; revisar carga horaria e praticas docentes hostis. "
            "Longo prazo: estruturar politica institucional de combate ao assedio e formar docentes "
            "em pedagogia inclusiva."
        ),
        "Conclusao": (
            "Curto prazo: identificar gargalos curriculares e oferecer disciplinas de recuperacao. "
            "Medio prazo: programas de mentoria com egressas e estagios direcionados. "
            "Longo prazo: parcerias com empresas para empregabilidade pos-curso e visibilidade "
            "de profissionais mulheres na area."
        ),
    }
    return {
        "fase": phase,
        "gravidade": severity,
        "alerta": alert,
        "recomendacao": recommendations[phase],
    }


def _analyze_dataframe(df: pd.DataFrame, include_terms=None, exclude_terms=None) -> dict:
    df = normalize_columns(df)
    required = {"genero", "curso", "ano_ingresso"}
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"Colunas obrigatorias ausentes: {', '.join(missing)}.")

    df = _prepare_cohort(df, TiConfig.build(include_terms, exclude_terms))
    if df.empty:
        raise ValueError("Nenhum registro de graduacao em TI encontrado apos normalizacao e filtros.")

    metrics = calculate_cohort_metrics(df)
    completion_metrics = calculate_completion_metrics(df)

    return {
        "summary": _build_summary(df, metrics),
        "metrics": metrics,
        "completion_metrics": completion_metrics,
        "latest_diagnostic": _build_latest_diagnostic(metrics, completion_metrics),
        "distributions": _build_distributions(df),
    }


def _prepare_cohort(df: pd.DataFrame, ti_config: TiConfig) -> pd.DataFrame:
    df = df.copy()
    df = df[df["curso"].apply(lambda value: is_it_course(value, ti_config))].copy()
    df["genero"] = df["genero"].astype(str).map(_normalize_gender)
    df["ano_ingresso"] = pd.to_numeric(df["ano_ingresso"], errors="coerce").astype("Int64")
    if "ano_conclusao" in df.columns:
        df["ano_conclusao"] = pd.to_numeric(df["ano_conclusao"], errors="coerce").astype("Int64")
    if "status" in df.columns:
        df["status_canonico"] = normalize_status(df["status"])
        if "ano_conclusao" in df.columns:
            conclusion_mask = df["ano_conclusao"].notna() & df["status"].isna()
            df.loc[conclusion_mask, "status_canonico"] = "CONCLUINTE"
    else:
        df["status_canonico"] = "CONCLUINTE" if "ano_conclusao" in df.columns else "ATIVO"
    df["curso"] = df["curso"].astype(str).str.strip().str.upper()
    if "nivel_ensino" in df.columns:
        level = df["nivel_ensino"].astype(str).map(_normalize_value)
        df = df[level.str.contains("GRADUA", na=False)]
    return df.dropna(subset=["genero", "ano_ingresso"])


def _student_ingress_base(df: pd.DataFrame) -> pd.DataFrame:
    if "tipo_arquivo" not in df.columns:
        return df
    base = df[df["tipo_arquivo"] != "CONCLUSAO"].copy()
    return base if not base.empty else df


def _build_summary(df: pd.DataFrame, metrics: list[dict]) -> dict:
    years = [item["coorte"] for item in metrics]
    return {
        "total_records": int(len(df)),
        "courses_count": int(df["curso"].nunique()),
        "courses": sorted(df["curso"].dropna().unique().tolist()),
        "cohort_start": min(years) if years else None,
        "cohort_end": max(years) if years else None,
        "implemented_scope": "M1, M2, M3, M4 e M5 do protocolo de equidade",
    }


def _build_latest_diagnostic(metrics: list[dict], completion_metrics: list[dict]) -> dict | None:
    latest = metrics[-1] if metrics else None
    latest_completion = completion_metrics[-1] if completion_metrics else None
    if not latest and not latest_completion:
        return None
    m1 = latest["M1_perc_mulheres_ingressantes"] if latest else None
    m2 = latest["M2_gap_evasao"] if latest else None
    m3 = latest_completion["M3_perc_mulheres_concluintes"] if latest_completion else None
    return {
        "coorte_referencia": latest["coorte"] if latest else None,
        "ano_conclusao_referencia": latest_completion["ano"] if latest_completion else None,
        "M1": m1,
        "M1_classificacao": classify_m1(m1) if m1 is not None else None,
        "M2": m2,
        "TEF": latest["TEF"] if latest else None,
        "TEM": latest["TEM"] if latest else None,
        "M3": m3,
        "fase_critica": identify_critical_phase(m1, m2, m3),
    }


def _build_distributions(df: pd.DataFrame) -> dict:
    status_counts = df["status_canonico"].value_counts().to_dict()
    gender_counts = df["genero"].value_counts().to_dict()
    by_course = df.groupby(["curso", "genero"]).size().unstack(fill_value=0)
    institution_column = next((column for column in ("sigla_ies", "nome_ies", "instituicao") if column in df.columns), None)
    return {
        "status": {str(key): int(value) for key, value in status_counts.items()},
        "gender": {str(key): int(value) for key, value in gender_counts.items()},
        "courses": [
            {
                "curso": str(course),
                "F": int(row.get("F", 0)),
                "M": int(row.get("M", 0)),
                "total": int(row.sum()),
            }
            for course, row in by_course.iterrows()
        ],
        "institutions": _build_grouped_gender_distribution(df, institution_column) if institution_column else [],
    }


def _build_grouped_gender_distribution(df: pd.DataFrame, column: str) -> list[dict]:
    grouped = df.groupby([column, "genero"]).size().unstack(fill_value=0)
    rows = []
    for label, row in grouped.iterrows():
        total = int(row.sum())
        rows.append(
            {
                "nome": str(label),
                "F": int(row.get("F", 0)),
                "M": int(row.get("M", 0)),
                "total": total,
            }
        )
    return sorted(rows, key=lambda item: item["nome"])


def _build_teacher_profile(df: pd.DataFrame) -> dict:
    df = df.copy()
    df["genero"] = df["genero"].astype(str).map(_normalize_gender)
    for column in ("data_ingresso", "data_desligamento"):
        if column in df.columns:
            df[column] = pd.to_datetime(df[column], errors="coerce")

    active = _active_teachers(df)
    active_total = int(len(active))
    active_female = int((active["genero"] == "F").sum())
    active_male = int((active["genero"] == "M").sum())
    total_female = int((df["genero"] == "F").sum())
    total_male = int((df["genero"] == "M").sum())
    leadership = _leadership_teachers(active)
    leadership_female = int((leadership["genero"] == "F").sum())
    leadership_male = int((leadership["genero"] == "M").sum())

    return {
        "summary": {
            "total_records": int(len(df)),
            "active_records": active_total,
            "active_F": active_female,
            "active_M": active_male,
            "active_female_percent": _percent(active_female, active_female + active_male),
            "M4_perc_mulheres_docentes": _percent(active_female, active_female + active_male),
            "total_female_percent": _percent(total_female, total_female + total_male),
            "leadership_records": int(len(leadership)),
            "leadership_F": leadership_female,
            "leadership_M": leadership_male,
            "leadership_female_percent": _percent(leadership_female, leadership_female + leadership_male),
            "M5_perc_mulheres_lideranca": _percent(leadership_female, leadership_female + leadership_male),
            "units_count": int(active["unidade_atual"].dropna().nunique()) if "unidade_atual" in active.columns else 0,
            "departments_count": int(active["departamento_atual"].dropna().nunique()) if "departamento_atual" in active.columns else 0,
        },
        "leadership_by_role": _teacher_group(leadership, "cargo_funcao_atual", limit=14),
        "leadership_by_unit": _teacher_group(leadership, "unidade_funcao_atual", limit=14),
        "by_unit": _teacher_group(active, "unidade_atual", limit=20),
        "by_department": _teacher_group(active, "departamento_atual", limit=18, min_total=8),
        "by_title": _teacher_group(active, "titulacao", limit=12),
        "by_class": _teacher_group(active, "classe_atual", limit=14),
        "by_regime": _teacher_group(active, "regime_trabalho", limit=8),
        "by_race": _teacher_group(active, "raca_cor", limit=10),
        "hiring_evolution": _teacher_hiring_evolution(df),
    }


def _active_teachers(df: pd.DataFrame) -> pd.DataFrame:
    if "data_desligamento" in df.columns:
        return df[df["data_desligamento"].isna()].copy()
    if "tipo_desligamento" in df.columns:
        status = df["tipo_desligamento"].astype(str).map(_normalize_value)
        return df[status.isin(("", "NAN", "NAO INFORMADO"))].copy()
    return df.copy()


def _leadership_teachers(df: pd.DataFrame) -> pd.DataFrame:
    masks = []
    for column in ("funcao_atual", "cargo_funcao_atual", "unidade_funcao_atual"):
        if column in df.columns:
            normalized = df[column].astype(str).map(_normalize_value)
            masks.append(~normalized.isin(("", "NAN", "NAO INFORMADO", "NAO INFORMADA", "NONE")))
    if not masks:
        return df.iloc[0:0].copy()
    mask = masks[0]
    for item in masks[1:]:
        mask = mask | item
    return df[mask].copy()


def _teacher_group(df: pd.DataFrame, column: str, limit: int, min_total: int = 1) -> list[dict]:
    if column not in df.columns:
        return []
    grouped = df.dropna(subset=[column]).groupby([column, "genero"]).size().unstack(fill_value=0)
    rows = []
    for label, row in grouped.iterrows():
        total = int(row.sum())
        if total < min_total:
            continue
        female = int(row.get("F", 0))
        male = int(row.get("M", 0))
        rows.append(
            {
                "nome": str(label),
                "F": female,
                "M": male,
                "total": total,
                "perc_F": _percent(female, female + male),
            }
        )
    return sorted(rows, key=lambda item: (item["perc_F"], -item["total"]))[:limit]


def _teacher_hiring_evolution(df: pd.DataFrame) -> list[dict]:
    if "data_ingresso" not in df.columns:
        return []
    dated = df.dropna(subset=["data_ingresso"]).copy()
    dated["ano"] = dated["data_ingresso"].dt.year
    dated = dated[dated["ano"].notna()]
    rows = []
    for year in sorted(dated["ano"].unique()):
        subset = dated[dated["ano"] == year]
        female = int((subset["genero"] == "F").sum())
        male = int((subset["genero"] == "M").sum())
        total = female + male
        if total:
            rows.append({"ano": int(year), "F": female, "M": male, "total": total, "perc_F": _percent(female, total)})
    return rows


def _percent(part: int, total: int) -> float:
    return round(part / total * 100, 1) if total else 0


def is_it_course(name, config: TiConfig) -> bool:
    normalized = _slug(name)
    for excluded in config.exclude:
        if excluded in normalized:
            return any(included in normalized for included in config.include)
    return any(included in normalized for included in config.include)


def _normalize_gender(value):
    normalized = _normalize_value(value)
    return {"F": "F", "FEMININO": "F", "M": "M", "MASCULINO": "M"}.get(normalized)


def _normalize_value(value):
    return unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii").strip().upper()


def _slug(value):
    if value is None:
        return ""
    text = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip().strip('"').replace("-", "_").replace(" ", "_")
    return re.sub(r"_+", "_", text)
