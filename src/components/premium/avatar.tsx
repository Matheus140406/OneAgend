import { cn } from '@/lib/utils';

/** Avatar com iniciais (sem foto) — cor de fundo definida por quem chama (ex: cor do papel do usuário, ou o accent do nicho). */
export function PremiumAvatar({
  name,
  colorClassName = 'bg-accent text-accent-contrast',
  size = 32,
  className,
}: {
  name: string;
  colorClassName?: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-full font-semibold', colorClassName, className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}
