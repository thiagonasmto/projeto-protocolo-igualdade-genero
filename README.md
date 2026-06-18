# Projeto Protocolo Igualdade

Dashboard Next.js com API Django REST para diagnostico de equidade de genero em cursos de TI.

## Deploy na Vercel

O projeto ja inclui a configuracao de deploy na raiz:

- `vercel.json` constroi o frontend em `frontend/` e publica o Django em `/_/backend/api/*`.
- `experimentalServices` declara o frontend em `/` e o backend em `/_/backend`, como exigido pela tela de deploy da Vercel para multiplos servicos.
- `backend/requirements.txt` instala as dependencias Python do backend.
- O frontend usa `/_/backend/api` por padrao em producao, entao nao precisa configurar `NEXT_PUBLIC_API_URL` quando tudo estiver no mesmo projeto Vercel.

Para publicar em producao pela CLI, rode na raiz:

```bash
npm run deploy
```

Para criar um deploy de preview:

```bash
npm run deploy:preview
```

Variaveis recomendadas no painel da Vercel:

```bash
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=uma-chave-secreta-forte
```

Opcionalmente, restrinja hosts com:

```bash
DJANGO_ALLOWED_HOSTS=seu-projeto.vercel.app,.vercel.app
```

## Rodar localmente

Backend:

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python manage.py runserver
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

Para usar o backend local em `localhost:8000`, configure no frontend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```
