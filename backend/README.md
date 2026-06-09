# Backend - Equidade de Genero em TI

API Django REST Framework para executar a logica do notebook sem componentes de dashboard.

## Escopo

- Leitura de arquivos CSV, Excel e JSON.
- Diagnostico local com CSVs de discentes e `docentes.xlsx` em `backend/data/`.
- Normalizacao de colunas, genero, cursos de TI e situacao academica.
- Calculo das metricas M1, M2, M3, M4 e M5 do protocolo.
- Identificacao da fase critica e recomendacoes.
- Endpoints prontos para uma interface consumir depois.

## Rodar localmente

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Para o frontend consumir esta API em outro host/porta, configure `NEXT_PUBLIC_API_URL`.
Sem essa variável, o frontend usa `http://localhost:8000/api`.

## Endpoints

- `GET /api/health/` - status da API.
- `GET /api/config/` - termos de TI, formatos aceitos e metricas implementadas.
- `GET /api/demo/` - diagnostico calculado a partir dos CSVs de discentes e do XLSX de docentes em `backend/data/`.
- `POST /api/analyze-json/` - recebe `{"records": [...]}` e retorna o diagnostico.
- `POST /api/analyze/` - recebe multipart com um ou mais campos `files`.

Exemplo JSON:

```json
{
  "records": [
    {
      "genero": "F",
      "curso": "Ciencia da Computacao",
      "ano_ingresso": 2024,
      "situacao": "Ativo",
      "nivel_ensino": "Graduacao"
    }
  ]
}
```

Resposta principal:

```json
{
  "summary": {},
  "metrics": [],
  "completion_metrics": [],
  "latest_diagnostic": {},
  "teacher_profile": {},
  "distributions": {}
}
```

Metricas:

- `M1`: mulheres ingressantes no ano/coorte dividido pelo total de ingressantes do ano/coorte.
- `M2`: `TE_F - TE_M`, usando evasao da coorte de ingresso.
- `M3`: mulheres concluintes no ano de conclusao dividido pelo total de concluintes do ano.
- `M4`: mulheres docentes ativas dividido pelo total de docentes ativos.
- `M5`: mulheres em cargos atuais de lideranca dividido pelo total de cargos atuais de lideranca.

## Testes

```bash
cd backend
python manage.py test
```
