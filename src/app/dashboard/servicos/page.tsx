import Link from 'next/link';
import { ExternalLink, Globe, Plus } from 'lucide-react';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatPriceFromCents } from '@/lib/utils';
import { buildBookingLink } from '@/lib/whatsapp/niche-templates';
import { NICHE_META } from '@/lib/niche-labels';
import { createService, updateService, toggleServiceActive } from './actions';

export const dynamic = 'force-dynamic';

const UNCATEGORIZED = 'Outros';

export default async function ServicesPage({ searchParams }: { searchParams: { error?: string; category?: string } }) {
  const user = await requireCurrentUser();
  const isOwner = user.role === 'OWNER';

  const [services, tenant] = await Promise.all([
    prisma.service.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'asc' } }),
    prisma.tenant.findUniqueOrThrow({ where: { id: user.tenantId }, select: { slug: true, niche: true } }),
  ]);

  const niche = NICHE_META[tenant.niche];
  const categories = Array.from(new Set(services.map((s) => s.category?.trim() || UNCATEGORIZED))).sort();
  const activeCategory = searchParams.category && categories.includes(searchParams.category) ? searchParams.category : categories[0];
  const visibleServices = services.filter((s) => (s.category?.trim() || UNCATEGORIZED) === activeCategory);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-base-100">Serviços</h1>
          <p className="mt-0.5 text-xs text-base-500">{services.length} serviços cadastrados · aparecem na agenda pública</p>
        </div>
      </div>

      {searchParams.error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</p>
      )}

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {categories.map((category) => (
            <Link
              key={category}
              href={`/dashboard/servicos?category=${encodeURIComponent(category)}`}
              className={cn(
                'whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                activeCategory === category ? 'bg-accent text-accent-contrast' : 'border border-white/[0.06] bg-base-850 text-base-500',
              )}
            >
              {category}
            </Link>
          ))}
        </div>
      )}

      <Card>
        <div className="hidden grid-cols-[1fr_110px_100px_80px] bg-white/[0.01] px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-base-500 sm:grid">
          <span>Serviço</span>
          <span>Preço</span>
          <span>Duração</span>
          <span className="text-right">Ações</span>
        </div>

        {visibleServices.length === 0 && <p className="p-6 text-center text-sm text-base-500">Nenhum serviço nesta categoria ainda.</p>}

        <div className="divide-y divide-white/[0.06]">
          {visibleServices.map((service) => (
            <div key={service.id} className="px-5 py-4">
              <form action={updateService} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="serviceId" value={service.id} />
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-sm">{niche.emoji}</div>
                <div className="min-w-[9rem] flex-1">
                  <Label htmlFor={`name-${service.id}`}>Nome</Label>
                  <Input id={`name-${service.id}`} name="name" defaultValue={service.name} disabled={!isOwner} />
                </div>
                <div className="w-28">
                  <Label htmlFor={`category-${service.id}`}>Categoria</Label>
                  <Input id={`category-${service.id}`} name="category" defaultValue={service.category ?? ''} placeholder="Ex: Cabelo" disabled={!isOwner} />
                </div>
                <div className="w-24">
                  <Label htmlFor={`duration-${service.id}`}>Duração</Label>
                  <Input id={`duration-${service.id}`} name="durationMinutes" type="number" min={5} step={5} defaultValue={service.durationMinutes} disabled={!isOwner} />
                </div>
                <div className="w-28">
                  <Label htmlFor={`price-${service.id}`}>Preço (R$)</Label>
                  <Input id={`price-${service.id}`} name="price" defaultValue={(service.priceCents / 100).toFixed(2)} disabled={!isOwner} />
                </div>
                {isOwner && (
                  <Button type="submit" size="sm" variant="secondary">
                    Salvar
                  </Button>
                )}
                <span className="font-mono text-sm font-bold text-accent">{formatPriceFromCents(service.priceCents)}</span>
                <Badge variant={service.active ? 'accent' : 'neutral'}>{service.active ? 'Ativo' : 'Inativo'}</Badge>
              </form>
              {isOwner && (
                <form action={toggleServiceActive} className="mt-2">
                  <input type="hidden" name="serviceId" value={service.id} />
                  <input type="hidden" name="active" value={(!service.active).toString()} />
                  <Button type="submit" size="sm" variant="ghost">
                    {service.active ? 'Desativar' : 'Ativar'}
                  </Button>
                </form>
              )}
            </div>
          ))}
        </div>
      </Card>

      {isOwner && (
        <Card>
          <div className="p-5">
            <h2 className="mb-4 flex items-center gap-1.5 text-sm font-bold text-base-100">
              <Plus size={14} className="text-accent" /> Novo serviço
            </h2>
            <form action={createService} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[10rem] flex-1">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" required placeholder="Ex: Corte de cabelo" />
              </div>
              <div className="w-28">
                <Label htmlFor="category">Categoria</Label>
                <Input id="category" name="category" placeholder="Ex: Cabelo" />
              </div>
              <div className="w-24">
                <Label htmlFor="durationMinutes">Duração</Label>
                <Input id="durationMinutes" name="durationMinutes" type="number" min={5} step={5} required defaultValue={30} />
              </div>
              <div className="w-28">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input id="price" name="price" required placeholder="50,00" />
              </div>
              <Button type="submit">Adicionar</Button>
            </form>
          </div>
        </Card>
      )}

      <Card accentGlow>
        <div className="flex items-center gap-4 px-5 py-4">
          <Globe size={16} className="shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-base-100">Estes serviços aparecem na sua agenda pública</p>
            <p className="mt-0.5 truncate font-mono text-[11px] text-base-500">{buildBookingLink(tenant.slug)}</p>
          </div>
          <a
            href={buildBookingLink(tenant.slug)}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent"
          >
            <ExternalLink size={11} /> Visualizar
          </a>
        </div>
      </Card>
    </div>
  );
}
