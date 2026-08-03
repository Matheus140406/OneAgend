// Utilitarios para converter um instante (Date/UTC) no dia da semana e horario
// "de parede" (HH:mm) de acordo com o fuso horario do tenant. O expediente
// (WorkingHour) e armazenado como HH:mm local, entao toda comparacao de
// horario de expediente precisa passar por aqui em vez de usar Date#getHours,
// que refletiria o fuso do servidor (UTC na Vercel) e nao o do negocio.

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface BusinessMoment {
  weekday: number; // 0 = domingo ... 6 = sabado
  time: string; // "HH:mm"
}

export function getBusinessMoment(date: Date, timeZone: string): BusinessMoment {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekdayPart = parts.find((p) => p.type === 'weekday')?.value;
  let hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';

  // Intl pode retornar "24" para meia-noite quando hour12 e false em alguns runtimes.
  if (hour === '24') hour = '00';

  const weekday = weekdayPart ? WEEKDAY_INDEX[weekdayPart] : undefined;
  if (weekday === undefined) {
    throw new Error(`Nao foi possivel determinar o dia da semana para o fuso "${timeZone}".`);
  }

  return { weekday, time: `${hour}:${minute}` };
}

/** "YYYY-MM-DD" -> [ano, mes, dia] */
export function parseDateKey(dateKey: string): [number, number, number] {
  const [y, m, d] = dateKey.split('-');
  return [Number(y), Number(m), Number(d)];
}

/** "HH:mm" -> [hora, minuto] */
export function parseTime(time: string): [number, number] {
  const [h, m] = time.split(':');
  return [Number(h), Number(m)];
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = parseDateKey(dateKey);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(
    next.getUTCDate(),
  ).padStart(2, '0')}`;
}

/** Início (inclusivo) e fim (exclusivo) do mês corrente de `date`, no fuso do negócio. */
export function getMonthRange(date: Date, timeZone: string): { start: Date; end: Date } {
  const [year, month] = parseDateKey(businessDateKey(date, timeZone));
  const firstOfMonthKey = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const firstOfNextMonthKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  return {
    start: zonedWallTimeToUtc(firstOfMonthKey, '00:00', timeZone),
    end: zonedWallTimeToUtc(firstOfNextMonthKey, '00:00', timeZone),
  };
}

/** "YYYY-MM" do mes corrente de `date`, no fuso do negocio. */
export function businessMonthKey(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  return `${year}-${month}`;
}

/** Os `count` "YYYY-MM" mais recentes terminando no mes de `date` (no fuso do negocio), do mais antigo ao mais novo. */
export function recentMonthKeys(date: Date, timeZone: string, count: number): string[] {
  const [currentYear, currentMonth] = businessMonthKey(date, timeZone).split('-').map(Number) as [number, number];
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const totalMonths = currentYear * 12 + (currentMonth - 1) - i;
    const year = Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    keys.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return keys;
}

export function businessDateKey(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // "YYYY-MM-DD"
}

// Converte uma data (YYYY-MM-DD) + hora (HH:mm) "de parede" no fuso do negocio
// para o instante UTC correspondente, sem depender de bibliotecas externas de tz.
export function zonedWallTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [year, month, day] = parseDateKey(dateKey);
  const [hour, minute] = parseTime(time);

  // Primeiro palpite tratando a hora como UTC, depois corrigimos pelo offset real do fuso.
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(naiveUtc), timeZone);
  return new Date(naiveUtc - offsetMinutes * 60_000);
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  const hour = map.hour === '24' ? '00' : map.hour;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(hour),
    Number(map.minute),
    Number(map.second),
  );
  return (asUtc - date.getTime()) / 60_000;
}
