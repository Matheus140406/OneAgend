'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import type { Permission } from '@/lib/auth/rbac';

const EDITABLE_ROLES = ['ADMIN', 'STAFF', 'CUSTOM'] as const;
const PERMISSION_FIELDS: Permission[] = [
  'canViewFinancial',
  'canManageScheduleAll',
  'canManageClients',
  'canManageSettings',
  'canTriggerBroadcast',
];

// Somente o dono gerencia a equipe: se um ADMIN pudesse editar papel/permissao
// de outros (inclusive as suas proprias), um ADMIN comprometido poderia se
// promover a OWNER — por isso essa checagem e sempre por role, nunca por flag.
async function requireOwner() {
  const user = await requireCurrentUser();
  if (user.role !== 'OWNER') {
    redirect('/dashboard/equipe?error=Apenas o dono da conta pode gerenciar a equipe.');
  }
  return user;
}

function readPermissions(formData: FormData): Record<Permission, boolean> {
  return Object.fromEntries(PERMISSION_FIELDS.map((field) => [field, formData.get(field) === 'on'])) as Record<
    Permission,
    boolean
  >;
}

export async function inviteTeamMember(formData: FormData) {
  const user = await requireOwner();

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? '');

  if (name.length < 2 || !email.includes('@') || !(EDITABLE_ROLES as readonly string[]).includes(role)) {
    redirect('/dashboard/equipe?error=Preencha nome, e-mail e papel válidos.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect('/dashboard/equipe?error=Já existe uma pessoa com esse e-mail.');
  }

  const supabaseAdmin = createSupabaseServiceRoleClient();
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

  if (error || !data.user) {
    console.error('Falha ao convidar membro da equipe:', error);
    redirect('/dashboard/equipe?error=Não foi possível enviar o convite. Verifique o e-mail e tente novamente.');
  }

  try {
    await prisma.user.create({
      data: {
        id: data.user.id,
        tenantId: user.tenantId,
        email,
        name,
        role: role as (typeof EDITABLE_ROLES)[number],
        ...readPermissions(formData),
      },
    });
  } catch (dbError) {
    // A conta no Supabase Auth ja foi criada; se o registro local falhar,
    // pelo menos avisamos — remover a conta do Auth automaticamente aqui
    // seria mais uma chamada de rede que pode falhar por sua vez.
    console.error('Convite enviado mas falhou ao criar o registro local:', dbError);
    redirect('/dashboard/equipe?error=Convite enviado, mas houve um erro ao salvar. Contate o suporte.');
  }

  revalidatePath('/dashboard/equipe');
  redirect('/dashboard/equipe?success=Convite enviado por e-mail.');
}

export async function updateTeamMember(formData: FormData) {
  const user = await requireOwner();
  const memberId = String(formData.get('memberId'));
  const role = String(formData.get('role') ?? '');

  if (!(EDITABLE_ROLES as readonly string[]).includes(role)) {
    redirect('/dashboard/equipe?error=Papel inválido.');
  }

  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member || member.tenantId !== user.tenantId || member.role === 'OWNER') {
    redirect('/dashboard/equipe?error=Membro não encontrado.');
  }

  await prisma.user.update({
    where: { id: memberId },
    data: { role: role as (typeof EDITABLE_ROLES)[number], ...readPermissions(formData) },
  });

  revalidatePath('/dashboard/equipe');
  redirect('/dashboard/equipe?success=Permissões atualizadas.');
}

export async function removeTeamMember(formData: FormData) {
  const user = await requireOwner();
  const memberId = String(formData.get('memberId'));

  if (memberId === user.id) {
    redirect('/dashboard/equipe?error=Você não pode remover a si mesmo.');
  }

  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member || member.tenantId !== user.tenantId || member.role === 'OWNER') {
    redirect('/dashboard/equipe?error=Membro não encontrado.');
  }

  // So remove o acesso ao painel deste tenant (apaga a linha local). A conta
  // no Supabase Auth continua existindo — remove-la e uma acao mais
  // destrutiva e irreversivel, melhor deixar para uma limpeza manual.
  await prisma.user.delete({ where: { id: memberId } });

  revalidatePath('/dashboard/equipe');
  redirect('/dashboard/equipe?success=Acesso removido.');
}
