'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatPriceFromCents } from '@/lib/utils';
import { PLAN_DETAILS, PLAN_ORDER } from '@/lib/plans';
import { slugify } from '@/lib/slug';
import type { Plan } from '@prisma/client';

/**
 * Segunda etapa do cadastro para quem entrou via login social (Google): a
 * conta no Supabase Auth já existe, falta só criar o Tenant/negócio.
 */
export default function CompletarCadastroPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [ownerName, setOwnerName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [businessType, setBusinessType] = useState('');
  const [plan, setPlan] = useState<Plan>('SOLO');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveSlug = useMemo(() => (slugEdited ? slug : slugify(tenantName)), [slug, slugEdited, tenantName]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login');
        return;
      }
      const metadata = data.user.user_metadata as { full_name?: string; name?: string } | null;
      setOwnerName(metadata?.full_name ?? metadata?.name ?? '');
      setCheckingSession(false);
    });
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/tenants/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantName, slug: effectiveSlug, businessType, ownerName, plan }),
    });

    setLoading(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Não foi possível concluir o cadastro.');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-base-500">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          OneAgend
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold text-base-100">Falta pouco</h1>
        <p className="mt-1 text-sm text-base-400">Agora conte pra gente sobre o seu negócio.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ownerName">Seu nome</Label>
            <Input id="ownerName" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenantName">Nome do negócio</Label>
            <Input
              id="tenantName"
              required
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Ex: Barbearia do João"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">Endereço da agenda pública</Label>
            <div className="flex items-center gap-1 rounded-xl border border-base-700 bg-base-900 pl-4 focus-within:border-accent">
              <span className="text-sm text-base-500">oneagend.com/agendar/</span>
              <input
                id="slug"
                required
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(slugify(e.target.value));
                }}
                className="h-12 flex-1 rounded-xl bg-transparent pr-4 text-base text-base-100 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="businessType">Tipo de negócio</Label>
            <Input
              id="businessType"
              required
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="Ex: barbearia, clínica, personal trainer, estúdio..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Plano</Label>
            <div className="grid grid-cols-3 gap-2">
              {PLAN_ORDER.map((planKey) => (
                <button
                  type="button"
                  key={planKey}
                  onClick={() => setPlan(planKey)}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors',
                    plan === planKey
                      ? 'border-accent bg-accent/10'
                      : 'border-base-700 bg-base-900 hover:border-base-600',
                  )}
                >
                  <span className="font-display text-sm font-semibold text-base-100">
                    {PLAN_DETAILS[planKey].label}
                  </span>
                  <span className="text-xs text-base-400">{PLAN_DETAILS[planKey].description}</span>
                  <span className="text-xs font-medium text-accent">
                    {formatPriceFromCents(PLAN_DETAILS[planKey].priceCents)}/mês
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" size="lg" disabled={loading} className="mt-2">
            {loading ? 'Criando...' : 'Criar minha agenda'}
          </Button>
        </form>
      </div>
    </main>
  );
}
