import { Crown, Shield, User, SlidersHorizontal } from 'lucide-react';
import type { UserRole } from '@prisma/client';

export const ROLE_META: Record<UserRole, { label: string; colorClassName: string; bgClassName: string }> = {
  OWNER: { label: 'Owner', colorClassName: 'text-[#C49A2E]', bgClassName: 'bg-[#C49A2E]/12' },
  ADMIN: { label: 'Admin', colorClassName: 'text-[#5B7FC4]', bgClassName: 'bg-[#5B7FC4]/12' },
  STAFF: { label: 'Staff', colorClassName: 'text-[#2DA876]', bgClassName: 'bg-[#2DA876]/12' },
  CUSTOM: { label: 'Custom', colorClassName: 'text-[#8B5CF6]', bgClassName: 'bg-[#8B5CF6]/12' },
};

const ROLE_ICON: Record<UserRole, typeof Crown> = {
  OWNER: Crown,
  ADMIN: Shield,
  STAFF: User,
  CUSTOM: SlidersHorizontal,
};

export function RoleBadge({ role }: { role: UserRole }) {
  const meta = ROLE_META[role];
  const Icon = ROLE_ICON[role];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.colorClassName} ${meta.bgClassName}`}>
      <Icon size={9} />
      {meta.label}
    </span>
  );
}
