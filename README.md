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
- Asaas para cobrança recorrente dos planos Solo / Studio / Rede

## Setup local

```bash
npm install
cp .env.example .env.local   # preencha com suas credenciais Supabase/Asaas/WhatsApp
npx prisma migrate dev       # cria o schema no Postgres (DATABASE_URL)
npm run dev
```

No Supabase, desative a confirmação por e-mail em Authentication → Settings
para o fluxo de cadastro (`/cadastro`) funcionar sem etapa extra, ou ajuste
o fluxo para aguardar a confirmação.

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
- `src/lib/billing/asaas.ts` — integração isolada com a API do Asaas.
- `src/lib/whatsapp/client.ts` — integração isolada com a WhatsApp Cloud API.

## Deploy

1. Configure um projeto Supabase (Postgres + Auth) e rode as migrations.
2. Configure as variáveis de ambiente na Vercel (ver `.env.example`).
3. O `vercel.json` já registra o cron de lembretes a cada 15 minutos
   (requer plano Vercel com cron mais frequente que diário; em planos
   gratuitos ajuste a expressão para uma frequência suportada).
4. Configure o webhook do Asaas apontando para `/api/billing/webhook`, com o
   token em `ASAAS_WEBHOOK_TOKEN` batendo com o cabeçalho `asaas-access-token`.
