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

A ideia é: banco no **Neon**, backend no **Railway**, frontend no **Vercel**.
Depois do primeiro deploy, só se usa a URL do Vercel — no celular ou no PC.

### 1. Banco de dados — Neon (https://neon.tech)

1. Crie uma conta gratuita e um projeto Postgres.
2. Copie a **connection string** (algo como
   `postgres://usuario:senha@ep-xxx.neon.tech/neondb?sslmode=require`).

### 2. Backend — Railway (https://railway.app)

1. Crie um projeto novo a partir do repositório Git (pasta `backend/`, que já
   tem um `Dockerfile`).
2. Configure as variáveis de ambiente:
   - `DATABASE_URL` = connection string do Neon
   - `JWT_SECRET` = uma string aleatória longa (ex: gerar com `openssl rand -hex 32`)
   - `FRONTEND_ORIGIN` = a URL que o Vercel vai gerar no passo 3 (ex:
     `https://cobranca-loja.vercel.app`) — dá pra ajustar depois de ter a URL.
3. Depois do deploy, rode o seed do usuário uma vez (via `railway run` ou
   conectando a connection string do Neon localmente):
   ```bash
   DATABASE_URL="<connection string do neon>" go run ./cmd/seed seu-email@exemplo.com sua-senha
   ```
4. Anote a URL pública gerada pelo Railway (ex: `https://xxx.up.railway.app`).

### 3. Frontend — Vercel (https://vercel.com)

1. Crie um projeto novo a partir do repositório Git, com **Root Directory**
   apontando para `frontend/`.
2. Antes de fazer o deploy, edite
   `frontend/src/environments/environment.prod.ts` e troque `apiUrl` pela URL
   do backend no Railway (passo anterior).
3. O Vercel detecta o `vercel.json` e faz o build automaticamente
   (`npm run build`, saída em `dist/frontend/browser`).
4. Depois do deploy, volte no Railway e confirme que `FRONTEND_ORIGIN` está
   igual à URL final do Vercel (CORS).

Depois disso, deploys futuros são automáticos a cada `git push` — tanto
Railway quanto Vercel voltam a buildar sozinhos.

## Próximos passos (fora do escopo desta primeira versão)

- Importação do bloco de notas atual — descartada por ora (texto livre,
  recadastro manual é mais confiável).
- **Chatbot de WhatsApp para cadastrar vendas diretamente pelo WhatsApp** —
  fica para uma segunda fase. Vai exigir WhatsApp Business API (Meta), conta
  aprovada e um webhook novo no backend (`POST /webhooks/whatsapp`), que já
  pode ser plugado na mesma API sem redesenhar nada.
