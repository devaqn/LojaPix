# 🍇 LojaPix

**Storefront de delivery construído à mão — catálogo, carrinho e checkout Pix de
verdade — pra ser o kit de referência por trás das suas lojas, não mais um template
gerado por prompt.**

Se você já gerou várias lojas parecidas (sushi, burger, pizza) via Lovable/IA, esse
projeto é o oposto: a mesma ideia de "storefront + checkout Pix", só que escrita à
mão, com testes de verdade e arquitetura pensada pra ser reaproveitada — troque o
catálogo de produtos e você tem uma loja nova, sem depender de gerar tudo de novo.

## Índice

- [O que é](#-o-que-é)
- [Como funciona](#-como-funciona)
- [Stack técnica](#-stack-técnica)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Como rodar localmente](#-como-rodar-localmente)
- [HTTP — endpoints](#-http--endpoints)
- [Segurança e privacidade](#-segurança-e-privacidade)
- [Testes e CI](#-testes-e-ci)
- [Decisões de arquitetura (trade-offs)](#-decisões-de-arquitetura-trade-offs)
- [Roadmap](#-roadmap)

## 🛍️ O que é

Uma lojinha de delivery completa:

- **Cliente**: navega o cardápio, monta o carrinho, escolhe entrega ou retirada,
  finaliza o pedido e paga por Pix — QR Code + "copia e cola", com a página
  atualizando sozinha assim que o pagamento cai.
- **Admin**: painel simples pra gerenciar categorias/produtos (pausar, criar,
  excluir) e acompanhar pedidos (confirmar pagamento no modo demo, avançar status
  até "concluído").

Vem com um catálogo de demonstração já semeado ("Açaí da Serra") só pra você ver a
loja funcionando de cara — troque pelos seus produtos e é sua loja.

## ⚙️ Como funciona

```mermaid
sequenceDiagram
    participant C as Cliente
    participant W as Storefront (Vite/React)
    participant A as API (Fastify)
    participant P as Provider de pagamento

    C->>W: monta carrinho, finaliza pedido
    W->>A: POST /public/orders
    A->>A: calcula total, cria Order + OrderItems
    A->>P: createPixPayment(valor)
    P-->>A: QR code + copia-e-cola
    A-->>W: pedido + dados do Pix
    W-->>C: mostra QR Code, aguarda pagamento
    Note over C,P: no modo "stub", a confirmação é manual (painel);<br/>no modo "mercadopago", chega por webhook
    P->>A: webhook (pagamento aprovado)
    A->>A: marca Order como PAID
    W->>A: polling GET /public/orders/:id
    A-->>W: status atualizado
```

## 📦 Stack técnica

| Camada | Tecnologias |
|---|---|
| API | Node.js 20+ · TypeScript · Fastify 5 · Zod · Prisma 6 · PostgreSQL 16 |
| Auth (admin) | JWT RS256 (`@fastify/jwt`) + refresh token rotativo |
| Pagamento | Pix — EMV/BR Code gerado offline (`stub`) ou Mercado Pago (`mercadopago`) |
| Storefront | Vite · React 18 · TypeScript · Tailwind CSS · React Router |
| Testes | Vitest |
| CI | GitHub Actions (lint + typecheck + test + build) |

## 📁 Estrutura do projeto

```
LojaPix/
├── packages/
│   ├── api/
│   │   ├── prisma/schema.prisma       # Category, Product, Order, OrderItem, Payment, AdminUser
│   │   ├── prisma/seed.ts             # catálogo demo "Açaí da Serra" + admin de teste
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/              # login/refresh do admin (sem cadastro público)
│   │   │   │   ├── catalog/           # categorias e produtos — leitura pública, escrita admin
│   │   │   │   ├── orders/            # criação pública de pedido + gestão admin
│   │   │   │   └── payments/
│   │   │   │       ├── pix-emv.ts           # EMV/BR Code + CRC16 — puro, testado
│   │   │   │       ├── payment-provider.ts  # interface comum
│   │   │   │       ├── stub.provider.ts     # Pix estático offline, zero conta
│   │   │   │       └── mercadopago.provider.ts
│   │   │   └── app.ts / server.ts
│   │   └── tests/
│   └── web/
│       ├── src/
│       │   ├── components/ui/         # Button, Card, Badge, Input — estilo shadcn, sem a lib
│       │   ├── lib/cart.tsx           # carrinho (contexto + localStorage)
│       │   ├── lib/auth.tsx           # sessão do admin (refresh automático)
│       │   └── pages/                 # Storefront, Checkout, OrderStatus, Admin*
├── docker-compose.yml                 # Postgres 16
└── .github/workflows/ci.yml
```

## ⚡ Como rodar localmente

```bash
docker compose up -d
npm install
npm run keys:generate   # cole a saída no packages/api/.env (copie de .env.example)
npm run db:migrate
npm run db:seed
npm run dev              # api :4500, web :4600
```

- Loja: **http://localhost:4600**
- Painel admin: **http://localhost:4600/admin/login** — `admin@lojapix.demo` / `admin123`
- No modo `PAYMENT_PROVIDER=stub` (padrão), confirme o pagamento manualmente no
  painel de pedidos (botão "Confirmar pagamento (stub)") — é o mesmo QR Code Pix de
  verdade, só que ninguém avisa a API quando você paga de fato.

## 🔌 HTTP — endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/public/catalog` | — | Categorias com produtos disponíveis |
| POST | `/public/orders` | — | Cria pedido + cobrança Pix |
| GET | `/public/orders/:id` | — | Status do pedido (pra polling) |
| POST | `/admin/auth/login` | — | Login do admin |
| POST | `/admin/auth/refresh` | — | Renova access token |
| GET/POST/PATCH/DELETE | `/admin/categories`, `/admin/products` | JWT | CRUD do catálogo |
| GET | `/admin/orders` | JWT | Lista pedidos (filtro por status) |
| PATCH | `/admin/orders/:id/status` | JWT | Avança/cancela pedido |
| POST | `/admin/payments/:orderId/confirm-stub` | JWT | Confirma pagamento manualmente (modo stub) |
| POST | `/webhooks/mercadopago` | — | Recebe notificação do Mercado Pago |

## 🔐 Segurança e privacidade

- Senha do admin com `bcrypt`; refresh token **rotativo**, armazenado como hash
  SHA-256 (nunca em texto puro), revogável.
- `adminUserId` sempre resolvido do JWT — nunca de parâmetro de rota ou corpo.
- Preço sempre em **centavos** (inteiro) — nunca `float`, pra não acumular erro de
  arredondamento em dinheiro de verdade.
- **Checkout do cliente é convidado** (sem conta): o pedido é identificado por um
  UUID imprevisível, que funciona como uma "capability URL" — quem tem o link do
  pedido vê o status dele. É a mesma lógica de uma página de confirmação de compra
  comum; não expõe listagem nem permite adivinhar outros pedidos.
- **Webhook do Mercado Pago nunca é confiado diretamente**: ao receber
  `type=payment&data.id=X`, a API busca o pagamento de volta na API do Mercado Pago
  usando o próprio access token antes de aprovar qualquer coisa — o valor que vem no
  webhook em si nunca é usado pra decidir status (mesmo princípio do client da
  Pluggy no GranaZap).

## 🧪 Testes e CI

```bash
npm test
```

30 testes cobrindo: EMV/CRC16 do Pix (contra vetor de teste publicado), guarda de
configuração (`PAYMENT_PROVIDER=mercadopago` sem token derruba a inicialização),
catálogo (filtra categoria vazia, bloqueia produto em categoria inexistente),
pedidos (endereço obrigatório na entrega, produto inexistente/indisponível, cálculo
de total), pagamentos (criação, confirmação manual, webhook — aprova/rejeita/ignora
pagamento desconhecido).

CI (`.github/workflows/ci.yml`) roda lint + typecheck + test + build nos dois
pacotes, com Postgres como serviço.

## 🧭 Decisões de arquitetura (trade-offs)

- **Provider de pagamento plugável (`stub` \| `mercadopago`)**: o modo `stub` gera
  um Pix "copia e cola" **de verdade** (BR Code/EMV válido, escaneável por qualquer
  banco, com o valor exato do pedido) inteiramente offline — dá pra testar a loja
  inteira sem nenhuma conta em gateway de pagamento. A diferença é que ninguém avisa
  a API quando o cliente paga de fato, por isso a confirmação nesse modo é manual
  (painel). Trocar pra Mercado Pago é só mudar `PAYMENT_PROVIDER=mercadopago` e
  configurar o `MERCADOPAGO_ACCESS_TOKEN` — o resto do sistema não muda, porque tudo
  depende apenas da interface `PaymentProvider`.
- **Integração com Mercado Pago via `fetch` puro, sem SDK**: mesmo raciocínio do
  client da Pluggy no GranaZap — o contrato HTTP fica visível e auditável no próprio
  código, sem depender do comportamento interno de uma versão de SDK. Usa a API
  clássica de pagamentos (`POST /v1/payments`), que é a mais estável e documentada;
  se a Mercado Pago aposentar essa rota em favor da Orders API, só
  `mercadopago.provider.ts` precisa mudar.
- **Checkout sem cadastro de cliente**: pra um storefront pequeno, exigir conta pra
  comprar é fricção pura. O trade-off (pedido rastreável só por quem tem o link) é
  aceitável pro tamanho do produto — está documentado, não escondido.
- **CVE residual aceito em `react-router-dom`**: as duas versões estáveis mais
  recentes (6.x e 7.x) caem cada uma em um advisory diferente — um é sobre hidratação
  de SSR (não se aplica: este é um SPA puro, sem servidor de renderização) e o outro
  é sobre "RSC Mode" com Server Actions (não se aplica: não usamos data routers nem
  nenhum recurso de servidor do React Router, só `<BrowserRouter>`/`<Routes>`
  clássico). Ficamos na versão mais nova (7.18.2) por ser a mais atualizada nas
  partes que *são* usadas aqui.
- **Sem Docker/Postgres neste ambiente de desenvolvimento**: os testes usam Prisma
  mockado (não tocam banco de verdade); a verificação ao vivo neste ambiente cobriu
  o que não depende de Postgres — build, boot dos dois servidores, CORS, roteamento
  client-side e o caminho de erro gracioso do storefront quando a API não responde.
  Rodar `docker compose up -d` localmente habilita o fluxo completo.

## 🗺️ Roadmap

- Upload de imagem de produto (hoje é só URL)
- Histórico de pedidos por telefone (sem precisar guardar o link de cada um)
- Validação de assinatura HMAC do webhook do Mercado Pago (`x-signature`)
- Suporte a múltiplas lojas no mesmo painel (hoje é uma loja por instância)
- Recibo por e-mail/WhatsApp quando o pedido é confirmado

## 📄 Licença

Projeto pessoal — todos os direitos reservados.
