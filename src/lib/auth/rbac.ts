import type { PrismaClient, UserRole } from '@prisma/client';

/**
 * Controle de acesso baseado em papel + flags granulares.
 *
 * - OWNER faz bypass de qualquer checagem (dono da conta).
 * - ADMIN/STAFF/CUSTOM dependem da flag booleana correspondente no User.
 *   Isso permite, por exemplo, dar a um ADMIN acesso a financeiro sem dar
 *   acesso a configuracoes, ou montar um papel 100% sob medida (CUSTOM).
 */

export type Permission =
  | 'canViewFinancial'
  | 'canManageScheduleAll'
  | 'canManageClients'
  | 'canManageSettings'
  | 'canTriggerBroadcast';

export interface PermissionSubject {
  role: UserRole;
  canViewFinancial: boolean;
  canManageScheduleAll: boolean;
  canManageClients: boolean;
  canManageSettings: boolean;
  canTriggerBroadcast: boolean;
}

const PERMISSION_SELECT = {
  role: true,
  canViewFinancial: true,
  canManageScheduleAll: true,
  canManageClients: true,
  canManageSettings: true,
  canTriggerBroadcast: true,
} as const;

/** Avalia a permissao a partir de um objeto ja carregado (sem ir ao banco). */
export function hasPermission(subject: PermissionSubject, permission: Permission): boolean {
  if (subject.role === 'OWNER') return true;
  return Boolean(subject[permission]);
}

/**
 * Busca o usuario pelo id (id do Supabase Auth, igual a User.id) e avalia a
 * permissao. Retorna false para usuario inexistente em vez de lancar —
 * quem chama decide como reagir (404/403), evitando vazar se o id existe.
 */
export async function checkPermission(
  prisma: PrismaClient,
  userId: string,
  permission: Permission,
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PERMISSION_SELECT });
  if (!user) return false;
  return hasPermission(user, permission);
}

export class ForbiddenError extends Error {
  constructor(message = 'Sem permissao para executar essa acao.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/** Mesma checagem, mas lanca ForbiddenError — util em Server Actions/rotas que ja tratam excecoes. */
export async function assertPermission(
  prisma: PrismaClient,
  userId: string,
  permission: Permission,
): Promise<void> {
  const allowed = await checkPermission(prisma, userId, permission);
  if (!allowed) throw new ForbiddenError();
}
