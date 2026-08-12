# Financeiro SFL

App para controlar vendas parceladas (fiado) e empréstimos de dinheiro a
juros, e organizar as cobranças mensais. Substitui o controle no bloco de
notas: cadastro de clientes, vendas parceladas com geração automática das
parcelas, e um painel mensal para saber quem cobrar e mandar mensagem de
cobrança pronta no WhatsApp.

Feito para a loja da Flávia — uso é essencialmente pelo celular.

- **Backend**: Go (chi + pgx + Postgres), API REST.
- **Frontend**: Angular 18 (standalone components, signals), mobile-first,
  locale pt-BR.
- **Banco**: Postgres.

## Onde tudo roda em produção

| Camada   | Serviço                                                              | URL |
|----------|-----------------------------------------------------------------------|-----|
| Frontend | [Netlify](https://netlify.com) (build automático a cada `git push`)   | https://financeiro-sfl.netlify.app |
| Backend  | [Render](https://render.com) (Web Service, Docker, free tier)         | https://financeiro-sfl.onrender.com |
| Banco    | [Neon](https://neon.tech) (Postgres serverless, free tier)            | connection string em `DATABASE_URL` no Render |

Repositório: `git@github-pessoal:felipemkk/financeiro-sfl.git` (conta pessoal
do GitHub — veja "SSH com múltiplas identidades" mais abaixo se for
configurar uma máquina nova).

Depois do primeiro deploy, o uso do dia a dia é só abrir a URL do Netlify —
ninguém precisa "rodar" nada. Deploys futuros acontecem sozinhos a cada push
para `main`, tanto no Render quanto no Netlify.

Existem dois logins: um da Flávia (dona da loja) e um do Felipe (para
suporte/dev). Contas são criadas manualmente via `cmd/seed` (veja abaixo),
não existe cadastro público.

**Nota sobre o free tier do Render**: o backend "dorme" depois de ~15min sem
uso; a primeira requisição depois disso demora uns 30-50s pra responder. É a
troca aceita para manter isso 100% gratuito.

## Arquitetura

```
financeiro-sfl/
  backend/
    cmd/
      api/main.go        # entrypoint HTTP, monta rotas e middlewares
      seed/main.go        # cria/atualiza um usuário de login (uso manual)
    internal/
      auth/                # login (bcrypt + JWT), middleware de autenticação
      cliente/             # CRUD de clientes
      venda/               # criação de venda/empréstimo + geração de parcelas
      parcela/             # listagem por mês, marcar parcela como paga
      dashboard/           # totais/resumo da tela inicial
      db/
        db.go              # pool de conexão pgx
        migrations/        # SQL sequencial (0001, 0002, ...), aplicado
                            # automaticamente no boot da API
    Dockerfile             # usado pelo Render para build/deploy
  frontend/
    src/app/
      auth/                # login + guard de rota
      home/                # dashboard inicial
      clientes/            # lista + form (view/edição) de clientes
      vendas/               # form de nova venda/empréstimo
      cobranca/             # painel mensal, botão "Cobrar" (WhatsApp)
      core/                # ApiService, models, layout (bottom nav mobile)
    src/styles.scss         # design tokens (cores, tipografia) — tema único, claro
    src/index.html           # favicon, ícones, fontes
    public/                  # favicon.ico, apple-touch-icon.png, ícones
  docker-compose.yml         # Postgres local para desenvolvimento
```

### Modelo de dados

- **clientes**: id, nome, cpf, telefone, whatsapp, endereco, observacoes, ativo
- **vendas**: id, cliente_id, tipo (`produto` | `emprestimo`), descricao_produto,
  valor_total, valor_investido, num_parcelas, data_primeira_parcela, criada_em
- **parcelas**: id, venda_id, numero, valor, valor_pago, vencimento,
  status (`pendente` | `paga`), pago_em

Ao criar uma venda, o backend gera as `parcelas` automaticamente (uma por
mês a partir de `data_primeira_parcela`, valor = valor_total / num_parcelas,
com ajuste de centavos na última parcela). Status "atrasada" é calculado na
hora (pendente + vencimento no passado), não é armazenado no banco.

**Empréstimos** (`tipo = 'emprestimo'`) reaproveitam a mesma tabela `vendas`:
`valor_investido` guarda o valor emprestado, `valor_total` o valor total a
receber (emprestado + juros). O frontend permite calcular de duas formas —
por taxa de juros % ou informando direto o valor da parcela — e mostra um
resumo com valor emprestado, parcelamento, valor total, taxa de juros
(mensal e total) e lucro.

### Rotas da API

Todas as rotas abaixo de `/clientes`, `/vendas`, `/parcelas` e `/dashboard`
exigem JWT (`Authorization: Bearer <token>`), obtido em `POST /auth/login`.

- `POST /auth/login`
- `GET/POST /clientes`, `GET/PUT /clientes/{id}`
- `GET/POST /vendas`, `GET /vendas/{id}`, `PUT /vendas/{id}/investido`
- `GET /parcelas?ano=&mes=`, `PUT /parcelas/{id}/pagar`
- `GET /dashboard`

### Frontend — pontos importantes

- Angular standalone + signals, sintaxe de controle nova (`@if`/`@for`/`@let`).
- Locale pt-BR registrado em `app.config.ts` (`registerLocaleData(localePt)`
  + `LOCALE_ID: 'pt-BR'`) — necessário para o pipe `currency`/`number`
  formatar `R$ 1.234,56` corretamente em vez do padrão `en-US`.
- Tema único (claro, paleta "linho/verdejante/latão"), sem seguir o tema
  escuro do sistema — decisão explícita para manter a identidade visual
  igual ao mockup aprovado. Tokens de cor/tipografia em `styles.scss`.
- Angular Material é usado só onde faz sentido (form-field, select,
  datepicker, spinner, ícone); botões/cards/badges são CSS customizado
  (`.btn`, `.card`, `.pill`).
- Link "+ Nova cliente" no formulário de venda leva ao cadastro de cliente
  e volta para a venda com o cliente já selecionado (via `?retorno=venda`).

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

Acesse `http://localhost:4200`, faça login com o e-mail/senha criados no
passo 2.

Migrations em `backend/internal/db/migrations/` rodam automaticamente toda
vez que a API sobe (local ou produção) — não precisa rodar nada manual para
elas.

> **Portas ocupadas**: se `8080` ou `4200` já estiverem em uso na sua
> máquina, rode a API com `PORT=8081 go run ./cmd/api` e o frontend com
> `npx ng serve --port 4201` (lembre de ajustar `apiUrl` em
> `frontend/src/environments/environment.ts` para bater com a porta da API
> ao testar assim, e de **reverter esse arquivo antes de commitar** — ele
> deve sempre apontar para `http://localhost:8080`, quem aponta para a URL
> de produção é `environment.prod.ts`).

### Testes do backend

```bash
cd backend
go test ./...
```

### Fluxo de trabalho recomendado para mudanças

1. Rodar backend e frontend localmente (acima) e testar a mudança de
   verdade no navegador — não só compilar.
2. `go test ./...` no backend se mexeu em lógica (ex: geração de parcelas).
3. Conferir `git diff frontend/src/environments/environment.ts` antes de
   commitar (não pode ir apontando para porta de dev).
4. Commit + push para `main` → Render e Netlify buildam e fazem deploy
   sozinhos.
5. Validar a mudança na URL de produção (https://financeiro-sfl.netlify.app)
   antes de considerar a tarefa concluída.

## Deploy em nuvem — configuração inicial (já feita, referência para o futuro)

### 1. Banco de dados — Neon (https://neon.tech)

1. Conta gratuita, projeto Postgres (free tier permanente, sem cartão).
2. Copiar a **connection string** (algo como
   `postgresql://usuario:senha@ep-xxx.aws.neon.tech/neondb?sslmode=require`).

### 2. Backend — Render (https://render.com)

1. New → Web Service, conectando o repositório GitHub.
2. Configuração:
   - **Root Directory**: `backend`
   - **Language/Environment**: `Docker` (detecta o `Dockerfile` sozinho)
   - **Region**: Virginia (US East) — mais perto do Brasil entre as opções
   - **Instance Type**: `Free`
3. Variáveis de ambiente:
   - `DATABASE_URL` = connection string do Neon
   - `JWT_SECRET` = string aleatória longa (`openssl rand -hex 32`)
   - `FRONTEND_ORIGIN` = URL gerada pelo Netlify (dá pra ajustar depois — o
     Render redeploya sozinho ao salvar variável)
4. Criar/atualizar logins apontando para o Neon:
   ```bash
   DATABASE_URL="<connection string do neon>" go run ./cmd/seed email@exemplo.com senha
   ```
5. Anotar a URL pública gerada (`https://financeiro-sfl.onrender.com`).

### 3. Frontend — Netlify (https://netlify.com)

1. Novo projeto a partir do repositório Git, **Base directory**: `frontend/`.
2. Confirmar que `frontend/src/environments/environment.prod.ts` aponta o
   `apiUrl` para a URL do backend no Render.
3. Netlify detecta `netlify.toml` e builda sozinho (`npm run build`, saída
   em `dist/frontend/browser`).
4. Depois do deploy, conferir no Render que `FRONTEND_ORIGIN` está igual à
   URL final do Netlify (senão dá erro de CORS).

## SSH com múltiplas identidades (só ao configurar uma máquina nova)

Este projeto usa uma conta pessoal de GitHub, separada de outras contas que
possam existir na mesma máquina (ex: GitLab do trabalho). Configuração:

- Chave dedicada: `~/.ssh/id_ed25519_github_personal`
- `~/.ssh/config` com um `Host` alias (`github-pessoal`) apontando essa
  chave para `github.com`
- `git config user.name`/`user.email` setados **local** (dentro do repo, não
  global) para não vazar para outros projetos na mesma máquina

## Próximos passos (ainda não implementados)

- **Bot de WhatsApp para lembrete diário de cobrança** — mandar
  automaticamente pra Flávia, todo dia, a lista de parcelas que vencem
  naquele dia. Avaliado mas não decidido: API oficial da Meta (Cloud API,
  requer aprovação de conta) vs. serviços não-oficiais mais simples
  (CallMeBot, TextMeBot, Green-API). Nenhuma implementação foi iniciada.
- **Chatbot de WhatsApp para cadastrar vendas diretamente pelo WhatsApp** —
  fase 2 mais ambiciosa, exigiria WhatsApp Business API da Meta e um
  webhook novo no backend (`POST /webhooks/whatsapp`), plugável na mesma
  API sem redesenhar nada.
- Importação do bloco de notas atual — descartada por ora (texto livre sem
  padrão, recadastro manual é mais confiável).
