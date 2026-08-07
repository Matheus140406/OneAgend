import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidSlug } from '@/lib/slug';

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug') ?? '';

  if (!isValidSlug(slug)) {
    return NextResponse.json({ available: false, reason: 'invalid' });
  }

  const existing = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  return NextResponse.json({ available: !existing });
}
