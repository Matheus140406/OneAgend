const STATUS_META = {
  active: { color: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Ativo' },
  inactive: { color: 'text-base-500', dot: 'bg-base-500', label: 'Inativo' },
  pending: { color: 'text-amber-400', dot: 'bg-amber-400', label: 'Pendente' },
} as const;

export function StatusDot({ status }: { status: keyof typeof STATUS_META }) {
  const meta = STATUS_META[status];
  return (
    <span className={`flex items-center gap-1.5 text-xs ${meta.color}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
