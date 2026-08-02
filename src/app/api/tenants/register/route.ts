import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isValidSlug } from '@/lib/slug';

const registerSchema = z.object({
  tenantName: z.string().min(2).max(120),
  slug: z.string().refine(isValidSlug, 'Slug invalido. Use letras minusculas, numeros e hifens.'),
  businessType: z.string().min(2).max(80),
  ownerName: z.string().min(2).max(120),
  plan: z.enum(['BASICO', 'ELITE', 'PLATINA']).default('BASICO'),
});

/**
 * Cria o Tenant + o User dono (OWNER) para o usuario Supabase autenticado.
 * Chamado logo apos o supabase.auth.signUp() no fluxo de cadastro.
 */
export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
  }

  const existingUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (existingUser) {
    return NextResponse.json({ error: 'Este usuario ja possui um negocio cadastrado.' }, { status: 409 });
  }

  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }, { status: 400 });
  }

  const { tenantName, slug, businessType, ownerName, plan } = parsed.data;

  const slugTaken = await prisma.tenant.findUnique({ where: { slug } });
  if (slugTaken) {
    return NextResponse.json({ error: 'Esse endereco ja esta em uso. Escolha outro.' }, { status: 409 });
  }

  const tenant = await prisma.$transaction(async (tx) => {
    const createdTenant = await tx.tenant.create({
      data: {
        name: tenantName,
        slug,
        businessType,
        plan,
        subscription: {
          create: { plan, status: 'TRIALING' },
        },
      },
    });

    await tx.user.create({
      data: {
        id: user.id,
        tenantId: createdTenant.id,
        email: user.email!,
        name: ownerName,
        role: 'OWNER',
      },
    });

    return createdTenant;
  });

  return NextResponse.json({ tenant: { id: tenant.id, slug: tenant.slug } }, { status: 201 });
}
