import type { Locale, NicheType, PrismaClient } from '@prisma/client';
import { buildNicheDefaultTemplate, buildBookingLink } from './niche-templates';

export interface UpdateTenantWhatsappConfigInput {
  niche?: NicheType;
  locale?: Locale;
  /** phone_number_id proprio da Cloud API. undefined = nao mexe, string vazia/null = limpa (volta a usar o numero da plataforma). */
  whatsappPhone?: string | null;
  /** undefined = nao mexe (mantem o override atual ou o padrao, conforme useDefaultTemplate). */
  whatsappTemplate?: string | null;
  /** true (ou omitido quando nao ha whatsappTemplate) = regrava com o texto padrao do nicho/idioma. */
  useDefaultTemplate?: boolean;
}

/**
 * Nucleo compartilhado entre a rota POST /api/whatsapp/link e a Server
 * Action da tela de Configuracoes — mesma logica, dois pontos de entrada.
 * tenantId sempre deve vir de uma sessao ja autenticada e autorizada; esta
 * funcao nao faz checagem de permissao (isso e responsabilidade de quem chama).
 */
export async function updateTenantWhatsappConfig(
  prisma: PrismaClient,
  tenantId: string,
  input: UpdateTenantWhatsappConfigInput,
) {
  const currentTenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { slug: true, niche: true, locale: true },
  });

  const resolvedNiche = input.niche ?? currentTenant.niche;
  const resolvedLocale = input.locale ?? currentTenant.locale;

  const shouldUseDefault = input.useDefaultTemplate ?? !input.whatsappTemplate;
  const resolvedTemplate = shouldUseDefault
    ? buildNicheDefaultTemplate(resolvedNiche, resolvedLocale, currentTenant.slug)
    : (input.whatsappTemplate as string);

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      niche: resolvedNiche,
      locale: resolvedLocale,
      whatsappPhone: input.whatsappPhone === undefined ? undefined : input.whatsappPhone || null,
      whatsappTemplate: resolvedTemplate,
    },
    select: { niche: true, locale: true, whatsappPhone: true, whatsappTemplate: true, slug: true },
  });

  return { ...updated, bookingLink: buildBookingLink(updated.slug) };
}
