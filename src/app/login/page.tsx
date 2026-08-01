'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError('E-mail ou senha invalidos.');
      return;
    }

    router.push(searchParams.get('next') ?? '/dashboard');
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-accent">
        OneAgend
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-base-100">Entrar</h1>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@negocio.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" disabled={loading} className="mt-2">
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-base-400">
        Ainda nao tem uma conta?{' '}
        <Link href="/cadastro" className="text-accent hover:underline">
          Criar minha agenda
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
