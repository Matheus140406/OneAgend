import { requireCurrentUser } from '@/lib/auth';
import { checkPermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NICHE_LABELS, LOCALE_LABELS } from '@/lib/niche-labels';
import { buildBookingLink } from '@/lib/whatsapp/niche-templates';
import { updateBusinessSettings } from './actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ searchParams }: { searchParams: { error?: string; success?: string } }) {
  const user = await requireCurrentUser();
  const canEdit = await checkPermission(prisma, user.id, 'canManageSettings');

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: user.tenantId },
    select: { name: true, slug: true, niche: true, locale: true, whatsappPhone: true, whatsappTemplate: true },
  });

  const whatsappConfigured = Boolean(process.env.WHATSAPP_CLOUD_API_TOKEN && process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-base-100">Configurações</h1>

      {searchParams.error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</p>
      )}
      {searchParams.success && (
        <p className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm text-accent">{searchParams.success}</p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>WhatsApp</CardTitle>
          <Badge variant={whatsappConfigured ? 'accent' : 'warn'}>
            {whatsappConfigured ? 'Configurado' : 'Não configurado'}
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-base-400">
            {whatsappConfigured
              ? 'A WhatsApp Cloud API oficial está ativa. Lembretes e o bot de respostas (confirmar/reagendar/cancelar) funcionam automaticamente para os planos Elite e Platina.'
              : 'Ainda não há um token da WhatsApp Cloud API configurado no ambiente (WHATSAPP_CLOUD_API_TOKEN / WHATSAPP_CLOUD_API_PHONE_NUMBER_ID). Sem isso, lembretes e o bot não enviam mensagens.'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Negócio e mensagem de divulgação</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateBusinessSettings} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="name">Nome do negócio</Label>
              <Input id="name" name="name" defaultValue={tenant.name} disabled={!canEdit} required />
            </div>

            <div>
              <Label htmlFor="niche">Nicho</Label>
              <Select id="niche" name="niche" defaultValue={tenant.niche} disabled={!canEdit}>
                {Object.entries(NICHE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-base-500">Usado para sugerir o texto padrão de divulgação abaixo.</p>
            </div>

            <div>
              <Label htmlFor="locale">Idioma das mensagens automáticas de WhatsApp</Label>
              <Select id="locale" name="locale" defaultValue={tenant.locale} disabled={!canEdit}>
                {Object.entries(LOCALE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-base-500">
                Idioma dos lembretes e do bot (confirmar/reagendar/cancelar) enviados aos seus clientes.
              </p>
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
              <p className="mt-1 text-xs text-base-500">
                Só preencha se você já configurou seu próprio número comercial na Meta.
              </p>
            </div>

            <div>
              <Label htmlFor="whatsappTemplate">Mensagem de divulgação</Label>
              <textarea
                id="whatsappTemplate"
                name="whatsappTemplate"
                defaultValue={tenant.whatsappTemplate ?? ''}
                disabled={!canEdit}
                rows={3}
                className="flex w-full rounded-xl border border-base-700 bg-base-900 px-4 py-3 text-base text-base-100 placeholder:text-base-500 outline-none transition-colors focus:border-accent disabled:opacity-50"
              />
              <label className="mt-2 flex items-center gap-2 text-sm text-base-300">
                <input
                  type="checkbox"
                  name="useDefaultTemplate"
                  defaultChecked={!tenant.whatsappTemplate}
                  disabled={!canEdit}
                  className="h-4 w-4 rounded border-base-600 bg-base-900 accent-accent"
                />
                Usar o texto padrão sugerido para o nicho/idioma
              </label>
              <p className="mt-1 text-xs font-mono text-base-500">Link público: {buildBookingLink(tenant.slug)}</p>
            </div>

            {canEdit && (
              <div>
                <Button type="submit">Salvar</Button>
              </div>
            )}
            {!canEdit && (
              <p className="text-sm text-base-500">
                Você não tem permissão para editar as configurações. Fale com o dono da conta.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
