import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Callback do OAuth (Google) via Supabase Auth. Troca o `code` pela sessão e
 * decide para onde mandar o usuário: quem já tem Tenant vai pro painel, quem
 * está logando pela primeira vez completa o cadastro do negócio.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=Falha ao autenticar com o Google.', url.origin));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/login?error=Falha ao autenticar com o Google.', url.origin));
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id: data.user.id } });

    if (existingUser) {
      return NextResponse.redirect(new URL('/dashboard', url.origin));
    }

    return NextResponse.redirect(new URL('/cadastro/completar', url.origin));
  } catch (dbError) {
    // Sessao no Supabase Auth ja foi criada com sucesso; um erro aqui e do
    // nosso banco (ex: schema ainda nao migrado), nao da autenticacao.
    console.error('Falha ao consultar usuario apos login OAuth:', dbError);
    return NextResponse.redirect(
      new URL('/login?error=Não foi possível concluir o login. Tente novamente em instantes.', url.origin),
    );
  }
}
