import { z } from 'zod';

export const SELIC_URL = 'https://brasilapi.com.br/api/taxas/v1/Selic';
const contract = z.object({ nome: z.string().trim().transform(value => value.toUpperCase()).pipe(z.literal('SELIC')), valor: z.number().finite().nonnegative() });
export type SelicResult = { status: 'disponivel'; taxaAnual: number } | { status: 'indisponivel' };

/** Timeout covers the HTTP response AND body; the timer is always released. */
export async function fetchSelic(fetcher: typeof fetch = fetch, timeoutMs = 5000): Promise<SelicResult> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('Timeout BrasilAPI')); }, timeoutMs);
    });
    const result = await Promise.race([(async () => {
      const response = await fetcher(SELIC_URL, { signal: controller.signal });
      if (!response.ok) throw new Error('BrasilAPI indisponível');
      return contract.parse(await response.json());
    })(), timeout]);
    return { status: 'disponivel', taxaAnual: result.valor };
  } catch { return { status: 'indisponivel' }; }
  finally { clearTimeout(timer); }
}
