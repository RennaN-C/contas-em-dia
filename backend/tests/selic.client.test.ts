import { afterEach, expect, it, vi } from 'vitest';
import { fetchSelic, SELIC_URL } from '../src/integrations/brasil-api/selic.client.js';
afterEach(() => vi.useRealTimers());
it('aceita o nome SELIC em maiúsculas retornado pela API real', async () => {
  expect(await fetchSelic(vi.fn<typeof fetch>().mockResolvedValue(new Response('{"nome":"SELIC","valor":13.75}')))).toEqual({status:'disponivel',taxaAnual:13.75});
});
it('valida contrato e endpoint Selic', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ nome: 'Selic', valor: 15 })));
  expect(await fetchSelic(fetcher)).toEqual({ status: 'disponivel', taxaAnual: 15 });
  expect(fetcher).toHaveBeenCalledWith(SELIC_URL, { signal: expect.any(AbortSignal) });
});
it.each([{ nome: 'CDI', valor: 15 }, { nome: 'Selic', valor: '15' }, { nome: 'Selic', valor: -1 }, { nome: 'Selic' }, null, []])('rejeita contrato inválido %j', async body => {
  expect(await fetchSelic(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body))))).toEqual({ status: 'indisponivel' });
});
it.each([404, 429, 500, 503])('trata HTTP %s', async status => {
  expect(await fetchSelic(vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status })))).toEqual({ status: 'indisponivel' });
});
it('trata JSON inválido', async () => expect(await fetchSelic(vi.fn<typeof fetch>().mockResolvedValue(new Response('not json')))).toEqual({ status: 'indisponivel' }));
it('trata erro de rede', async () => expect(await fetchSelic(vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')))).toEqual({ status: 'indisponivel' }));
it('aborta timeout mesmo com fetch que não respeita signal', async () => {
  vi.useFakeTimers(); const fetcher = vi.fn<typeof fetch>().mockReturnValue(new Promise(() => {}));
  const promise = fetchSelic(fetcher, 100); await vi.advanceTimersByTimeAsync(100);
  expect(await promise).toEqual({ status: 'indisponivel' }); expect(fetcher.mock.calls[0]![1]!.signal!.aborted).toBe(true);
});
it('timeout cobre também leitura do body', async () => {
  vi.useFakeTimers(); const response = { ok: true, json: () => new Promise(() => {}) } as Response;
  const promise = fetchSelic(vi.fn<typeof fetch>().mockResolvedValue(response), 100); await vi.advanceTimersByTimeAsync(100);
  expect(await promise).toEqual({ status: 'indisponivel' });
});
it('aceita taxa zero e libera timer após sucesso', async () => {
  vi.useFakeTimers(); expect(await fetchSelic(vi.fn<typeof fetch>().mockResolvedValue(new Response('{"nome":"Selic","valor":0}')))).toEqual({ status: 'disponivel', taxaAnual: 0 });
  expect(vi.getTimerCount()).toBe(0);
});
