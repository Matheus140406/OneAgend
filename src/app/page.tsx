import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-accent">
        OneAgend
      </span>
      <h1 className="mt-4 max-w-xl font-display text-4xl font-bold leading-tight text-base-100">
        Agenda online para o seu negócio de hora marcada
      </h1>
      <p className="mt-4 max-w-md text-base-400">
        Barbearia, clínica, personal trainer, estúdio ou consultório — sua agenda pública,
        seus profissionais e seus lembretes de WhatsApp em um só lugar.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/cadastro">
          <Button size="lg" className="w-full sm:w-auto">
            Criar minha agenda
          </Button>
        </Link>
        <Link href="/login">
          <Button size="lg" variant="outline" className="w-full sm:w-auto">
            Entrar
          </Button>
        </Link>
      </div>
    </main>
  );
}
