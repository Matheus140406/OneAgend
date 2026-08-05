import { describe, it, expect } from 'vitest';
import { getNicheThemeVars, pickContrastTextRgb } from '../niche-theme';

describe('getNicheThemeVars', () => {
  it('converte a cor base do nicho para o triplet RGB esperado (0x5B7FC4 -> "91 127 196")', () => {
    const vars = getNicheThemeVars('BARBERSHOP');
    expect(vars['--accent-rgb']).toBe('91 127 196');
  });

  it('accent-dim e mais escuro (mais proximo de preto) que o accent base', () => {
    const vars = getNicheThemeVars('BARBERSHOP');
    const base = vars['--accent-rgb'].split(' ').map(Number);
    const dim = vars['--accent-dim-rgb'].split(' ').map(Number);
    expect(dim[0]).toBeLessThan(base[0]!);
    expect(dim[1]).toBeLessThan(base[1]!);
    expect(dim[2]).toBeLessThan(base[2]!);
  });

  it('accent-bright e mais claro (mais proximo de branco) que o accent base', () => {
    const vars = getNicheThemeVars('BARBERSHOP');
    const base = vars['--accent-rgb'].split(' ').map(Number);
    const bright = vars['--accent-bright-rgb'].split(' ').map(Number);
    expect(bright[0]).toBeGreaterThan(base[0]!);
    expect(bright[1]).toBeGreaterThan(base[1]!);
    expect(bright[2]).toBeGreaterThan(base[2]!);
  });

  it('escolhe texto escuro para fundo quase branco (maior contraste com preto)', () => {
    const contrast = pickContrastTextRgb('#F5F5F5');
    const sum = contrast.split(' ').reduce((acc, v) => acc + Number(v), 0);
    expect(sum).toBeLessThan(100); // proximo de preto
  });

  it('escolhe texto claro para fundo quase preto (maior contraste com branco)', () => {
    const contrast = pickContrastTextRgb('#0A0A0A');
    const sum = contrast.split(' ').reduce((acc, v) => acc + Number(v), 0);
    expect(sum).toBeGreaterThan(600); // proximo de branco
  });

  it('gera as 4 variaveis para todos os 8 nichos sem lancar excecao', () => {
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
      const vars = getNicheThemeVars(niche);
      expect(Object.keys(vars)).toEqual([
        '--accent-rgb',
        '--accent-dim-rgb',
        '--accent-bright-rgb',
        '--accent-contrast-rgb',
      ]);
    }
  });
});
