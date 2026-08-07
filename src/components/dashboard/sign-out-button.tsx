'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function SignOutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (iconOnly) {
    return (
      <button onClick={handleSignOut} title="Sair" className="shrink-0 text-base-500 transition-colors hover:text-base-100">
        <LogOut size={12} />
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-base-400 transition-colors hover:bg-base-800 hover:text-base-100"
    >
      <LogOut size={18} />
      Sair
    </button>
  );
}
