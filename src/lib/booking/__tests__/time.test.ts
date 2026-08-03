import { describe, it, expect } from 'vitest';
import { getMonthRange, zonedWallTimeToUtc } from '../time';

const TZ = 'America/Sao_Paulo';

describe('getMonthRange', () => {
  it('cobre do primeiro ao ultimo instante do mes, no fuso do negocio', () => {
    const midMonth = zonedWallTimeToUtc('2026-02-15', '12:00', TZ);
    const { start, end } = getMonthRange(midMonth, TZ);

    expect(start).toEqual(zonedWallTimeToUtc('2026-02-01', '00:00', TZ));
    expect(end).toEqual(zonedWallTimeToUtc('2026-03-01', '00:00', TZ));
  });

  it('vira o ano corretamente em dezembro', () => {
    const dec = zonedWallTimeToUtc('2026-12-20', '12:00', TZ);
    const { start, end } = getMonthRange(dec, TZ);

    expect(start).toEqual(zonedWallTimeToUtc('2026-12-01', '00:00', TZ));
    expect(end).toEqual(zonedWallTimeToUtc('2027-01-01', '00:00', TZ));
  });
});
