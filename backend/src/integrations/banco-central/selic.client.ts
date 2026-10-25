import { z } from 'zod';
import { utcDay, addDays } from '../../modules/notifications/dates.js';

// SGS 432 is the annual Selic TARGET (% p.a.), never the daily SGS 11 rate.
export const BCB_SELIC_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados';
const rate = z.object({ data: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/), valor: z.string().regex(/^\d+(\.\d+)?$/) });
export async function fetchCentralBankSelic(fetcher: typeof fetch = fetch, timeoutMs = 5000, now = new Date()) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const format = (d: Date) => d.toISOString().slice(0, 10).split('-').reverse().join('/');
  const end = utcDay(now), start = addDays(end, -14);
  const url = `${BCB_SELIC_URL}?formato=json&dataInicial=${format(start)}&dataFinal=${format(end)}`;
  try {
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Timeout Banco Central')); }, timeoutMs); });
    const values = await Promise.race([(async () => {
      const response = await fetcher(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Banco Central indisponível');
      return z.array(rate).max(32).parse(await response.json());
    })(), timeout]);
    const valid = values.map(row => ({ taxaAnual: Number(row.valor), referencia: new Date(row.data.split('/').reverse().join('-')), date: row.data }))
      .filter(row => Number.isFinite(row.taxaAnual) && !Number.isNaN(row.referencia.getTime()) && format(row.referencia) === row.date && row.referencia >= start && row.referencia <= end)
      .sort((a, b) => b.referencia.getTime() - a.referencia.getTime());
    return valid[0] ? { status: 'disponivel' as const, ...valid[0] } : { status: 'indisponivel' as const };
  } catch { return { status: 'indisponivel' as const }; }
  finally { clearTimeout(timer); }
}
