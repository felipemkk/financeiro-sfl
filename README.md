# Financeiro SFL

App para controlar vendas parceladas (fiado) e organizar as cobranças mensais.
Substitui o controle no bloco de notas: cadastro de clientes, vendas parceladas
com geração automática das parcelas, e um painel mensal para saber quem cobrar
e mandar mensagem de cobrança pronta no WhatsApp.

- **Backend**: Go (chi + pgx + Postgres), API REST simples.
- **Frontend**: Angular + Angular Material, mobile-first.
- **Banco**: Postgres.

## Rodando localmente

Pré-requisitos: Docker, Go (instalado em `~/.local/go`, adicione ao PATH:
`export PATH=$PATH:$HOME/.local/go/bin`), Node.js.

```bash
# 1. Subir o Postgres local
docker compose up -d

# 2. Criar a conta de login (uma vez só, ou para trocar a senha depois)
cd backend
go run ./cmd/seed seu-email@exemplo.com sua-senha

# 3. Rodar a API (porta 8080)
go run ./cmd/api

# 4. Em outro terminal, rodar o frontend (porta 4200)
cd ../frontend
npm install
npx ng serve
```

Acesse `http://localhost:4200`, faça login com o e-mail/senha criados no passo 2.

### Testes do backend

```bash
cd backend
go test ./...
```

## Deploy em nuvem (sempre online, sem precisar "rodar" nada)

A stack: banco no **Neon**, backend no **Render**, frontend no **Netlify**.
Depois do primeiro deploy, só se usa a URL do Netlify — no celular ou no PC.
Repositório: `git@github-pessoal:felipemkk/financeiro-sfl.git`.

### 1. Banco de dados — Neon (https://neon.tech)

1. Crie uma conta gratuita e um projeto Postgres (free tier permanente, sem
   cartão de crédito).
2. Copie a **connection string** (algo como
   `postgresql://usuario:senha@ep-xxx.aws.neon.tech/neondb?sslmode=require`).

### 2. Backend — Render (https://render.com)

1. New → Web Service, conectando o repositório GitHub.
2. Configure:
   - **Root Directory**: `backend`
   - **Language/Environment**: `Docker` (detecta o `Dockerfile` sozinho)
   - **Region**: Virginia (US East) — mais perto do Brasil entre as opções do Render
   - **Instance Type**: `Free`
3. Variáveis de ambiente:
   - `DATABASE_URL` = connection string do Neon
   - `JWT_SECRET` = uma string aleatória longa (ex: gerar com `openssl rand -hex 32`)
   - `FRONTEND_ORIGIN` = a URL que o Netlify vai gerar no passo 3 (dá pra
     ajustar depois de ter a URL — o Render redeploya sozinho ao salvar)
4. Depois do primeiro deploy, rode o seed do usuário uma vez, apontando pro
   Neon:
   ```bash
   DATABASE_URL="<connection string do neon>" go run ./cmd/seed seu-email@exemplo.com sua-senha
   ```
5. Anote a URL pública gerada pelo Render (ex: `https://financeiro-sfl.onrender.com`).

Nota: o free tier do Render "dorme" depois de 15min sem uso — a primeira
requisição depois disso demora uns 30-50s pra responder. É a troca aceita
pra manter isso 100% gratuito.

### 3. Frontend — Netlify (https://netlify.com)

1. Crie um projeto novo a partir do repositório Git, com **Base directory**
   apontando para `frontend/`.
2. Antes de fazer o deploy, confirme que
   `frontend/src/environments/environment.prod.ts` tem o `apiUrl` apontando
   pra URL do backend no Render (passo anterior).
3. O Netlify detecta o `netlify.toml` e faz o build automaticamente
   (`npm run build`, saída em `dist/frontend/browser`).
4. Depois do deploy, volte no Render e confirme que `FRONTEND_ORIGIN` está
   igual à URL final do Netlify (CORS).

Depois disso, deploys futuros são automáticos a cada `git push` — tanto
Render quanto Netlify voltam a buildar sozinhos.

## Próximos passos (fora do escopo desta primeira versão)

- Importação do bloco de notas atual — descartada por ora (texto livre,
  recadastro manual é mais confiável).
- **Chatbot de WhatsApp para cadastrar vendas diretamente pelo WhatsApp** —
  fica para uma segunda fase. Vai exigir WhatsApp Business API (Meta), conta
  aprovada e um webhook novo no backend (`POST /webhooks/whatsapp`), que já
  pode ser plugado na mesma API sem redesenhar nada.
