import Link from 'next/link';
import { Layers, MessageSquare, SlidersHorizontal, Check, Globe, Smartphone } from 'lucide-react';
import { requireCurrentUser } from '@/lib/auth';
import { checkPermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NICHE_META, LOCALE_LABELS } from '@/lib/niche-labels';
import { NICHE_ACCENT_HEX } from '@/lib/niche-theme';
import { buildBookingLink } from '@/lib/whatsapp/niche-templates';
import { cn } from '@/lib/utils';
import type { NicheType } from '@prisma/client';
import { updateBusinessSettings } from './actions';

export const dynamic = 'force-dynamic';

const SECTIONS = [
  { key: 'niche', label: 'Nicho', icon: Layers },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { key: 'appearance', label: 'Aparência', icon: SlidersHorizontal },
] as const;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string; section?: string };
}) {
  const user = await requireCurrentUser();
  const canEdit = await checkPermission(prisma, user.id, 'canManageSettings');

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: user.tenantId },
    select: { name: true, slug: true, niche: true, locale: true, whatsappPhone: true, whatsappTemplate: true },
  });

  const whatsappConfigured = Boolean(process.env.WHATSAPP_CLOUD_API_TOKEN && process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID);
  const activeSection = (['niche', 'whatsapp', 'appearance'] as const).includes(searchParams.section as never)
    ? (searchParams.section as 'niche' | 'whatsapp' | 'appearance')
    : 'niche';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-base-100">Configurações</h1>
        <p className="mt-0.5 text-xs text-base-500">Nicho, WhatsApp Cloud API e preferências do estabelecimento</p>
      </div>

      {searchParams.error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</p>
      )}
      {searchParams.success && (
        <p className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm text-accent">{searchParams.success}</p>
      )}

      {!canEdit && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-4 py-3">
          <p className="text-xs text-amber-400">Sua conta não tem permissão para alterar configurações. Contate o dono.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-6 lg:flex-nowrap">
        <div className="w-full shrink-0 lg:w-44">
          <div className="space-y-0.5">
            {SECTIONS.map((s) => (
              <Link
                key={s.key}
                href={`/dashboard/configuracoes?section=${s.key}`}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all',
                  activeSection === s.key ? 'bg-accent/[0.15] text-accent' : 'text-base-500 hover:bg-white/5',
                )}
              >
                <s.icon size={14} /> {s.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          {activeSection === 'niche' && (
            <>
              <Card accentGlow>
                <div className="p-5">
                  <div className="mb-1 flex items-center gap-2">
                    <Layers size={14} className="text-accent" />
                    <h3 className="text-sm font-bold text-base-100">Selecione o Nicho</h3>
                  </div>
                  <p className="mb-5 text-xs text-base-500">O nicho define o visual, a mensagem padrão e as funcionalidades disponíveis.</p>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {(Object.entries(NICHE_META) as [NicheType, (typeof NICHE_META)[NicheType]][]).map(([key, meta]) => {
                      const isActive = key === tenant.niche;
                      return (
                        <form key={key} action={updateBusinessSettings}>
                          <input type="hidden" name="name" value={tenant.name} />
                          <input type="hidden" name="niche" value={key} />
                          <input type="hidden" name="locale" value={tenant.locale} />
                          <input type="hidden" name="whatsappPhone" value={tenant.whatsappPhone ?? ''} />
                          <input type="hidden" name="useDefaultTemplate" value="on" />
                          <button
                            type="submit"
                            disabled={!canEdit || isActive}
                            className={cn(
                              'relative flex w-full flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all disabled:cursor-default',
                              isActive ? 'border-accent/50 bg-accent/[0.14] shadow-[0_0_20px_rgba(0,0,0,0)]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20',
                            )}
                          >
                            {isActive && (
                              <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent">
                                <Check size={9} className="text-accent-contrast" strokeWidth={3} />
                              </div>
                            )}
                            <div className="text-2xl">{meta.emoji}</div>
                            <div>
                              <p className={cn('text-[11px] font-semibold leading-tight', isActive ? 'text-accent' : 'text-base-100')}>{meta.label}</p>
                              <p className="mt-0.5 text-[10px] leading-tight text-base-500">{meta.description}</p>
                            </div>
                          </button>
                        </form>
                      );
                    })}
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Globe size={13} className="text-accent" />
                    <h3 className="text-sm font-bold text-base-100">Agenda Pública</h3>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                    <p className="flex-1 truncate font-mono text-xs text-base-100">{buildBookingLink(tenant.slug)}</p>
                    <a
                      href={buildBookingLink(tenant.slug)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-md border border-white/[0.06] px-2.5 py-1.5 text-xs font-semibold text-base-500 hover:bg-white/5"
                    >
                      Abrir
                    </a>
                  </div>
                  <p className="mt-2 text-[11px] text-base-500">Compartilhe este link com seus clientes. Mobile-first, 3 passos, sem login.</p>
                </div>
              </Card>
            </>
          )}

          {activeSection === 'whatsapp' && (
            <>
              <Card accentGlow={whatsappConfigured}>
                <div className="p-5">
                  <div className="mb-1 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/12">
                      <Smartphone size={18} className="text-[#25D366]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-base-100">WhatsApp Cloud API</h3>
                      <Badge variant={whatsappConfigured ? 'accent' : 'warn'}>{whatsappConfigured ? 'Configurado' : 'Não configurado'}</Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-base-500">
                    {whatsappConfigured
                      ? 'Ativa — lembretes e o bot de respostas (confirmar/reagendar/cancelar) funcionam automaticamente para os planos Elite e Platina.'
                      : 'Sem token configurado no ambiente (WHATSAPP_CLOUD_API_TOKEN / WHATSAPP_CLOUD_API_PHONE_NUMBER_ID) — lembretes e o bot não enviam mensagens.'}
                  </p>
                </div>
              </Card>

              <Card>
                <CardContent>
                  <form action={updateBusinessSettings} className="flex flex-col gap-4">
                    <input type="hidden" name="name" value={tenant.name} />
                    <input type="hidden" name="niche" value={tenant.niche} />

                    <div>
                      <Label htmlFor="locale">Idioma das mensagens automáticas</Label>
                      <Select id="locale" name="locale" defaultValue={tenant.locale} disabled={!canEdit}>
                        {Object.entries(LOCALE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="whatsappPhone">phone_number_id próprio (opcional)</Label>
                      <Input
                        id="whatsappPhone"
                        name="whatsappPhone"
                        defaultValue={tenant.whatsappPhone ?? ''}
                        disabled={!canEdit}
                        placeholder="Deixe em branco para usar o número da plataforma"
                      />
                    </div>

                    <div>
                      <Label htmlFor="whatsappTemplate">Mensagem Padrão do Nicho</Label>
                      <p className="mb-2 text-xs text-base-500">
                        Editada para <span className="text-accent">{NICHE_META[tenant.niche].emoji} {NICHE_META[tenant.niche].label}</span>.
                      </p>
                      <textarea
                        id="whatsappTemplate"
                        name="whatsappTemplate"
                        defaultValue={tenant.whatsappTemplate ?? ''}
                        disabled={!canEdit}
                        rows={4}
                        className="flex w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 font-mono text-sm leading-relaxed text-base-100 placeholder:text-base-500 outline-none focus:border-accent disabled:opacity-50"
                      />
                      <label className="mt-2 flex items-center gap-2 text-sm text-base-400">
                        <input
                          type="checkbox"
                          name="useDefaultTemplate"
                          defaultChecked={!tenant.whatsappTemplate}
                          disabled={!canEdit}
                          className="h-4 w-4 rounded border-base-600 bg-base-900 accent-accent"
                        />
                        Usar o texto padrão sugerido para o nicho/idioma
                      </label>
                    </div>

                    {canEdit && (
                      <div>
                        <Button type="submit">Salvar Configurações</Button>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </>
          )}

          {activeSection === 'appearance' && (
            <Card accentGlow>
              <CardContent className="space-y-5">
                <div>
                  <h3 className="mb-1 text-sm font-bold text-base-100">Cor do Nicho Selecionado</h3>
                  <p className="text-xs text-base-500">A cor é definida automaticamente pelo nicho escolhido e aplicada em toda a interface.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {(Object.entries(NICHE_META) as [NicheType, (typeof NICHE_META)[NicheType]][]).map(([key, meta]) => (
                    <Link
                      key={key}
                      href="/dashboard/configuracoes?section=niche"
                      className="flex flex-col items-center gap-2"
                      title={meta.label}
                    >
                      <div
                        className={cn('h-10 w-10 rounded-full border-2 transition-all', key === tenant.niche ? 'scale-110 border-white' : 'border-transparent')}
                        style={{ background: NICHE_ACCENT_HEX[key] }}
                      />
                      <span className={cn('text-[9px] font-semibold', key === tenant.niche ? 'text-accent' : 'text-base-500')}>
                        {meta.label.split(' ')[0]}
                      </span>
                    </Link>
                  ))}
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="font-mono text-xs text-base-500">
                    Nicho: <span className="text-accent">{NICHE_META[tenant.niche].label}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
