import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { checkPermission } from '@/lib/auth/rbac';
import { buildNicheDefaultTemplate, buildBookingLink } from '@/lib/whatsapp/niche-templates';
import { SUPPORTED_LOCALES } from '@/lib/i18n/messages';
import { checkRateLimit, createPrismaRateLimitStore, getClientIp } from '@/lib/rate-limit';

const NICHE_VALUES = [
  'BEAUTY_SALON',
  'HEALTH_CLINIC',
  'BARBERSHOP',
  'PETSHOP',
  'PERSONAL_TRAINER',
  'TATTOO_STUDIO',
  'THERAPY_CONSULTING',
  'SPORTS_COURT',
] as const;

const linkSchema = z.object({
  niche: z.enum(NICHE_VALUES).optional(),
  locale: z.enum(SUPPORTED_LOCALES as [string, ...string[]]).optional(),
  // phone_number_id da Cloud API caso o tenant tenha o proprio numero. Vazio/null limpa o override.
  whatsappPhone: z.string().trim().max(32).nullable().optional(),
  // Override do texto de divulgacao. Vazio/null volta a usar o template padrao do nicho.
  whatsappTemplate: z.string().trim().max(1000).nullable().optional(),
  // Se true (padrao quando nao ha override), regrava whatsappTemplate com o texto padrao do nicho/idioma.
  useDefaultTemplate: z.boolean().optional(),
});

const RATE_LIMIT = { limit: 20, windowMs: 10 * 60_000 };

/**
 * Salva a configuracao de mensagem de WhatsApp do tenant (nicho, idioma,
 * numero proprio opcional e template de divulgacao). Restrito a quem tem a
 * flag `canManageSettings` (OWNER sempre pode).
 */
export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(
    createPrismaRateLimitStore(prisma),
    `whatsapp-link:${getClientIp(request)}`,
    RATE_LIMIT,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
  }

  const allowed = await checkPermission(prisma, user.id, 'canManageSettings');
  if (!allowed) {
    return NextResponse.json({ error: 'Sem permissao para alterar as configuracoes de WhatsApp.' }, { status: 403 });
  }

  const parsed = linkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }, { status: 400 });
  }

  const { niche, locale, whatsappPhone, whatsappTemplate, useDefaultTemplate } = parsed.data;

  try {
    // tenantId sempre vem da sessao autenticada — nunca do corpo da requisicao,
    // para nao permitir que um usuario altere a configuracao de outro tenant.
    const currentTenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: user.tenantId },
      select: { slug: true, niche: true, locale: true },
    });

    const resolvedNiche = niche ?? currentTenant.niche;
    const resolvedLocale = (locale as (typeof SUPPORTED_LOCALES)[number] | undefined) ?? currentTenant.locale;

    const shouldUseDefault = useDefaultTemplate ?? !whatsappTemplate;
    const resolvedTemplate = shouldUseDefault
      ? buildNicheDefaultTemplate(resolvedNiche, resolvedLocale, currentTenant.slug)
      : (whatsappTemplate as string);

    const updated = await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        niche: resolvedNiche,
        locale: resolvedLocale,
        whatsappPhone: whatsappPhone === undefined ? undefined : whatsappPhone || null,
        whatsappTemplate: resolvedTemplate,
      },
      select: { niche: true, locale: true, whatsappPhone: true, whatsappTemplate: true, slug: true },
    });

    return NextResponse.json({
      niche: updated.niche,
      locale: updated.locale,
      whatsappPhone: updated.whatsappPhone,
      whatsappTemplate: updated.whatsappTemplate,
      bookingLink: buildBookingLink(updated.slug),
    });
  } catch (error) {
    console.error('Falha ao salvar configuracao de WhatsApp:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar a configuracao.' }, { status: 500 });
  }
}
