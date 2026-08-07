import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildBookingLink, buildNicheDefaultTemplate } from '../niche-templates';

describe('buildBookingLink', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it('usa NEXT_PUBLIC_APP_URL quando configurado', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://minhabarbearia.com/';
    expect(buildBookingLink('minha-barbearia')).toBe('https://minhabarbearia.com/agendar/minha-barbearia');
  });

  it('cai para o dominio padrao quando a env nao esta configurada', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(buildBookingLink('minha-barbearia')).toBe('https://oneagend.com/agendar/minha-barbearia');
  });
});

describe('buildNicheDefaultTemplate', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://oneagend.com';
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it('inclui o link de agendamento do tenant', () => {
    const message = buildNicheDefaultTemplate('BARBERSHOP', 'PT_BR', 'zeda-esquina');
    expect(message).toContain('https://oneagend.com/agendar/zeda-esquina');
  });

  it('varia o texto pelo nicho e idioma', () => {
    const pt = buildNicheDefaultTemplate('PETSHOP', 'PT_BR', 'auau');
    const en = buildNicheDefaultTemplate('PETSHOP', 'EN', 'auau');
    expect(pt).not.toBe(en);
    expect(en).toContain('pet shop');
  });

  it('cobre todos os 8 nichos sem lancar excecao', () => {
    const niches = [
      'BEAUTY_SALON',
      'HEALTH_CLINIC',
      'BARBERSHOP',
      'PETSHOP',
      'PERSONAL_TRAINER',
      'TATTOO_STUDIO',
      'THERAPY_CONSULTING',
      'SPORTS_COURT',
    ] as const;
    for (const niche of niches) {
      expect(() => buildNicheDefaultTemplate(niche, 'FR', 'slug')).not.toThrow();
    }
  });
});
