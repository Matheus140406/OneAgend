import { describe, it, expect } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { hasPermission, checkPermission, assertPermission, ForbiddenError, type PermissionSubject } from '../rbac';

function subject(overrides: Partial<PermissionSubject> = {}): PermissionSubject {
  return {
    role: 'STAFF',
    canViewFinancial: false,
    canManageScheduleAll: false,
    canManageClients: true,
    canManageSettings: false,
    canTriggerBroadcast: false,
    ...overrides,
  };
}

describe('hasPermission', () => {
  it('OWNER faz bypass de qualquer permissao, mesmo com todas as flags false', () => {
    expect(hasPermission(subject({ role: 'OWNER', canManageSettings: false }), 'canManageSettings')).toBe(true);
  });

  it('STAFF sem a flag correspondente e negado', () => {
    expect(hasPermission(subject({ role: 'STAFF', canViewFinancial: false }), 'canViewFinancial')).toBe(false);
  });

  it('ADMIN com a flag ligada e permitido', () => {
    expect(hasPermission(subject({ role: 'ADMIN', canTriggerBroadcast: true }), 'canTriggerBroadcast')).toBe(true);
  });

  it('CUSTOM depende inteiramente das flags individuais', () => {
    const custom = subject({ role: 'CUSTOM', canManageSettings: true, canViewFinancial: false });
    expect(hasPermission(custom, 'canManageSettings')).toBe(true);
    expect(hasPermission(custom, 'canViewFinancial')).toBe(false);
  });
});

function fakePrisma(user: PermissionSubject | null): PrismaClient {
  return {
    user: {
      findUnique: async () => user,
    },
  } as unknown as PrismaClient;
}

describe('checkPermission', () => {
  it('retorna false para usuario inexistente', async () => {
    const result = await checkPermission(fakePrisma(null), 'user_1', 'canManageSettings');
    expect(result).toBe(false);
  });

  it('consulta o usuario e avalia a flag', async () => {
    const prisma = fakePrisma(subject({ role: 'STAFF', canManageClients: true }));
    expect(await checkPermission(prisma, 'user_1', 'canManageClients')).toBe(true);
  });
});

describe('assertPermission', () => {
  it('nao lanca quando permitido', async () => {
    const prisma = fakePrisma(subject({ role: 'OWNER' }));
    await expect(assertPermission(prisma, 'user_1', 'canManageSettings')).resolves.toBeUndefined();
  });

  it('lanca ForbiddenError quando negado', async () => {
    const prisma = fakePrisma(subject({ role: 'STAFF', canManageSettings: false }));
    await expect(assertPermission(prisma, 'user_1', 'canManageSettings')).rejects.toBeInstanceOf(ForbiddenError);
  });
});
