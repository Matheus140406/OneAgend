import Link from 'next/link';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatPriceFromCents } from '@/lib/utils';
import { buildBookingLink } from '@/lib/whatsapp/niche-templates';
import { createService, updateService, toggleServiceActive } from './actions';

export const dynamic = 'force-dynamic';

const UNCATEGORIZED = 'Outros';

export default async function ServicesPage({ searchParams }: { searchParams: { error?: string; category?: string } }) {
  const user = await requireCurrentUser();
  const isOwner = user.role === 'OWNER';

  const [services, tenant] = await Promise.all([
    prisma.service.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'asc' } }),
    prisma.tenant.findUniqueOrThrow({ where: { id: user.tenantId }, select: { slug: true } }),
  ]);

  const categories = Array.from(new Set(services.map((s) => s.category?.trim() || UNCATEGORIZED))).sort();
  const activeCategory = searchParams.category && categories.includes(searchParams.category) ? searchParams.category : null;
  const visibleServices = activeCategory
    ? services.filter((s) => (s.category?.trim() || UNCATEGORIZED) === activeCategory)
    : services;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-base-100">Serviços</h1>

      {searchParams.error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {searchParams.error}
        </p>
      )}

      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <Link
            href="/dashboard/servicos"
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
              !activeCategory ? 'border-accent bg-accent/10 text-accent' : 'border-base-800 text-base-300',
            )}
          >
            Todos
          </Link>
          {categories.map((category) => (
            <Link
              key={category}
              href={`/dashboard/servicos?category=${encodeURIComponent(category)}`}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
                activeCategory === category ? 'border-accent bg-accent/10 text-accent' : 'border-base-800 text-base-300',
              )}
            >
              {category}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {visibleServices.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-base-500">
              Nenhum serviço cadastrado ainda.
            </CardContent>
          </Card>
        )}
        {visibleServices.map((service) => (
          <Card key={service.id}>
            <CardContent>
              <form action={updateService} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="serviceId" value={service.id} />
                <div className="min-w-[10rem] flex-1">
                  <Label htmlFor={`name-${service.id}`}>Nome</Label>
                  <Input id={`name-${service.id}`} name="name" defaultValue={service.name} disabled={!isOwner} />
                </div>
                <div className="w-32">
                  <Label htmlFor={`category-${service.id}`}>Categoria</Label>
                  <Input
                    id={`category-${service.id}`}
                    name="category"
                    defaultValue={service.category ?? ''}
                    placeholder="Ex: Cabelo"
                    disabled={!isOwner}
                  />
                </div>
                <div className="w-28">
                  <Label htmlFor={`duration-${service.id}`}>Duração (min)</Label>
                  <Input
                    id={`duration-${service.id}`}
                    name="durationMinutes"
                    type="number"
                    min={5}
                    step={5}
                    defaultValue={service.durationMinutes}
                    disabled={!isOwner}
                  />
                </div>
                <div className="w-32">
                  <Label htmlFor={`price-${service.id}`}>Preço (R$)</Label>
                  <Input
                    id={`price-${service.id}`}
                    name="price"
                    defaultValue={(service.priceCents / 100).toFixed(2)}
                    disabled={!isOwner}
                  />
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <Button type="submit" size="sm" variant="secondary">
                      Salvar
                    </Button>
                  </div>
                )}
                <span className="text-sm font-medium text-accent">{formatPriceFromCents(service.priceCents)}</span>
                <Badge variant={service.active ? 'accent' : 'neutral'}>
                  {service.active ? 'Ativo' : 'Inativo'}
                </Badge>
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
            </CardContent>
          </Card>
        ))}
      </div>

      {isOwner && (
        <Card>
          <CardContent>
            <h2 className="mb-4 font-display text-lg font-semibold text-base-100">Novo serviço</h2>
            <form action={createService} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[10rem] flex-1">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" required placeholder="Ex: Corte de cabelo" />
              </div>
              <div className="w-32">
                <Label htmlFor="category">Categoria</Label>
                <Input id="category" name="category" placeholder="Ex: Cabelo" />
              </div>
              <div className="w-28">
                <Label htmlFor="durationMinutes">Duração (min)</Label>
                <Input id="durationMinutes" name="durationMinutes" type="number" min={5} step={5} required defaultValue={30} />
              </div>
              <div className="w-32">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input id="price" name="price" required placeholder="50,00" />
              </div>
              <Button type="submit">Adicionar</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-base-500">
        Link público da sua agenda:{' '}
        <span className="font-mono text-base-400">{buildBookingLink(tenant.slug)}</span>
      </p>
    </div>
  );
}
