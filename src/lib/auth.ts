import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';
import { prisma } from './prisma';

export async function getCurrentUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return prisma.user.findUnique({
    where: { id: user.id },
    include: { tenant: true, professional: true },
  });
}

/** Usa em Server Components de rotas do painel: redireciona para /login se nao autenticado. */
export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
