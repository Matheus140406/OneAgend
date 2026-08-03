import { describe, it, expect } from 'vitest';
import { evaluateAppointmentLimit } from '../appointment-limit';

describe('evaluateAppointmentLimit', () => {
  it('PLATINA nunca tem limite', () => {
    const result = evaluateAppointmentLimit(999_999, 'PLATINA');
    expect(result).toEqual({ allowed: true, used: 999_999, limit: null, remaining: null });
  });

  it('BASICO permite agendar abaixo do teto (100)', () => {
    const result = evaluateAppointmentLimit(99, 'BASICO');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('BASICO bloqueia exatamente no teto', () => {
    const result = evaluateAppointmentLimit(100, 'BASICO');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('BASICO bloqueia acima do teto', () => {
    const result = evaluateAppointmentLimit(150, 'BASICO');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('ELITE usa o teto de 500', () => {
    expect(evaluateAppointmentLimit(499, 'ELITE').allowed).toBe(true);
    expect(evaluateAppointmentLimit(500, 'ELITE').allowed).toBe(false);
  });
});
