export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/[0.06] bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-base-500">
      {children}
    </kbd>
  );
}
