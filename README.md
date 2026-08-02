# OneAgend

SaaS multi-tenant de agendamento online para negócios de hora marcada
(barbearia, clínica, personal trainer, estúdio, consultório — o tipo é
texto livre escolhido pelo dono no cadastro).

## Stack

- Next.js 14 (App Router) + TypeScript
- Prisma ORM + PostgreSQL (Supabase)
- Supabase Auth (multi-tenant: cada `User` pertence a um `Tenant`)
- Tailwind CSS + componentes no estilo shadcn/ui
- WhatsApp Cloud API para lembretes (função isolada, fácil de trocar de provedor)
- Vercel Cron para disparo dos lembretes 24h/1h antes
- Mercado Pago (Assinaturas/Preapproval) para cobrança recorrente dos planos Solo / Studio / Rede

## Setup local

```bash
npm install
cp .env.example .env.local   # preencha com suas credenciais Supabase/Mercado Pago/WhatsApp
npx prisma migrate dev       # cria o schema no Postgres (DATABASE_URL)
npm run dev
```

No Supabase, desative a confirmação por e-mail em Authentication → Settings
para o fluxo de cadastro (`/cadastro`) funcionar sem etapa extra, ou ajuste
o fluxo para aguardar a confirmação.

### Login com Google

O botão "Continuar com Google" (em `/login` e `/cadastro`) usa o provider
OAuth do Supabase Auth. O código do app só chama
`supabase.auth.signInWithOAuth({ provider: 'google' })` — a configuração das
credenciais do Google fica no painel, não no repositório:

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   em "Authorized redirect URIs" do OAuth Client, adicione
   `https://<seu-projeto>.supabase.co/auth/v1/callback`.
2. No painel do Supabase, em Authentication → Providers → Google, ative o
   provider e cole o **Client ID** e o **Client Secret** do Google (o Client
   Secret nunca deve ir para o `.env` do OneAgend — só existe nesse painel).
3. Em Authentication → URL Configuration, adicione
   `http://localhost:3000/auth/callback` (e a URL de produção equivalente)
   em "Redirect URLs".

Quem entra pela primeira vez via Google ainda não tem um `Tenant`/negócio
cadastrado: o callback (`src/app/auth/callback/route.ts`) detecta isso e
manda para `/cadastro/completar`, que só pede os dados do negócio (o
cadastro no Supabase Auth já existe).

## Testes

A regra de negócio crítica (validação de conflito de horário) fica em
`src/lib/booking/validateAppointment.ts` e tem cobertura de teste dedicada:

```bash
npm test
```

Cobre os três casos de conflito (fora do expediente, dentro de uma folga,
sobreposição com outro agendamento) e o caminho feliz.

## Estrutura principal

- `prisma/schema.prisma` — schema multi-tenant completo.
- `src/lib/booking/validateAppointment.ts` — checagem transacional das 3 regras
  de conflito antes de criar um `Appointment`.
- `src/lib/booking/availability.ts` — cálculo dos horários livres reais para o
  passo 2 do agendamento público.
- `src/app/agendar/[slug]` — página pública de agendamento em 3 passos, sem
  login, mobile-first.
- `src/app/api/cron/reminders` — endpoint disparado pelo Vercel Cron
  (`vercel.json`) que envia lembretes de WhatsApp 24h/1h antes.
- `src/app/dashboard` — painel autenticado (hoje, agenda semanal, clientes,
  profissionais, serviços, cobrança).
- `src/lib/billing/mercadopago.ts` — integração isolada com a API de Assinaturas
  (Preapproval) do Mercado Pago, incluindo validação HMAC do webhook.
- `src/lib/whatsapp/client.ts` — integração isolada com a WhatsApp Cloud API.

## Deploy

1. Configure um projeto Supabase (Postgres + Auth) e rode as migrations.
2. Configure as variáveis de ambiente na Vercel (ver `.env.example`).
3. O `vercel.json` já registra o cron de lembretes a cada 15 minutos
   (requer plano Vercel com cron mais frequente que diário; em planos
   gratuitos ajuste a expressão para uma frequência suportada).
4. Configure o webhook do Mercado Pago (Suas integrações → Webhooks) apontando
   para `/api/billing/webhook`, assinando o evento "Assinaturas" (subscription
   preapproval). Copie a chave secreta gerada para `MERCADOPAGO_WEBHOOK_SECRET`
   — ela é usada para validar o header `x-signature` de cada notificação.
