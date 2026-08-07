import type { NicheType } from '@prisma/client';

/**
 * Cor de acento por nicho (referência: protótipo visual "Dynamic Theming for
 * Niches" gerado no Figma Make). O painel e a agenda pública trocam o
 * `--accent` do Tailwind por essa cor via CSS custom properties, calculadas
 * aqui (dim = mais escura, bright = mais clara, contrast = cor de texto
 * legível em cima do accent, escolhida pela luminância real da cor).
 */
export const NICHE_ACCENT_HEX: Record<NicheType, string> = {
  BEAUTY_SALON: '#C49A2E',
  HEALTH_CLINIC: '#2DA876',
  BARBERSHOP: '#5B7FC4',
  PETSHOP: '#D4742A',
  PERSONAL_TRAINER: '#D94040',
  TATTOO_STUDIO: '#8B5CF6',
  THERAPY_CONSULTING: '#0E86C8',
  SPORTS_COURT: '#16A34A',
};

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function mix(hex: string, target: [number, number, number], weight: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mixed = [r, g, b].map((channel, i) => Math.round(channel + (target[i]! - channel) * weight));
  return `${mixed[0]} ${mixed[1]} ${mixed[2]}`;
}

function toRgbTriplet(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

function linearizeChannel(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// Luminancia relativa (WCAG) da cor, usada para calcular a razao de contraste real.
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linearizeChannel(r) + 0.7152 * linearizeChannel(g) + 0.0722 * linearizeChannel(b);
}

function contrastRatio(luminanceA: number, luminanceB: number): number {
  const [lighter, darker] = luminanceA > luminanceB ? [luminanceA, luminanceB] : [luminanceB, luminanceA];
  return (lighter + 0.05) / (darker + 0.05);
}

const DARK_TEXT_RGB = '11 13 18'; // combina com o base-950 do tema
const LIGHT_TEXT_RGB = '245 247 251';

/**
 * Escolhe texto escuro ou claro comparando a razao de contraste real (WCAG)
 * contra as duas opcoes, em vez de um limiar de luminancia fixo — algumas
 * das cores de nicho (medio-saturadas) tem contraste melhor com uma ou outra
 * de forma nao obvia "a olho".
 */
export function pickContrastTextRgb(hex: string): string {
  const luminance = relativeLuminance(hex);
  const ratioWithBlack = contrastRatio(luminance, 0);
  const ratioWithWhite = contrastRatio(luminance, 1);
  return ratioWithBlack >= ratioWithWhite ? DARK_TEXT_RGB : LIGHT_TEXT_RGB;
}

export interface NicheThemeVars {
  '--accent-rgb': string;
  '--accent-dim-rgb': string;
  '--accent-bright-rgb': string;
  '--accent-contrast-rgb': string;
}

/** Variaveis CSS (React.CSSProperties) para sobrescrever o accent do Tailwind conforme o nicho. */
export function getNicheThemeVars(niche: NicheType): NicheThemeVars {
  const hex = NICHE_ACCENT_HEX[niche];
  return {
    '--accent-rgb': toRgbTriplet(hex),
    '--accent-dim-rgb': mix(hex, [0, 0, 0], 0.3),
    '--accent-bright-rgb': mix(hex, [255, 255, 255], 0.3),
    '--accent-contrast-rgb': pickContrastTextRgb(hex),
  };
}
