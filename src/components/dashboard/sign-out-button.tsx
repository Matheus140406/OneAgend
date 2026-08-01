'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
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
