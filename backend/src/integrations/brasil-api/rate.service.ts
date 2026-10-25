import { prisma } from '../../lib/prisma.js';
import { fetchSelic } from './selic.client.js';
import { fetchCentralBankSelic } from '../banco-central/selic.client.js';

const TTL = 60 * 60 * 1000;
const MAX_AGE = 7 * 24 * TTL;
export type AnnualRate = { status: 'disponivel'; taxaAnual: number; fonte: string; consultadaEm: string; referencia?: string; emCache: boolean; desatualizada: boolean } | { status: 'indisponivel' };
let pending: Promise<AnnualRate> | undefined;

export async function getAnnualSelic(now = new Date()): Promise<AnnualRate> {
  if (pending) return pending;
  const request = resolveRate(now);
  pending = request;
  try { return await request; } finally { if (pending === request) pending = undefined; }
}
async function resolveRate(now: Date): Promise<AnnualRate> {
  const cached = await prisma.taxaReferencia.findUnique({ where: { chave: 'SELIC' } });
  const age = cached ? now.getTime() - cached.consultadaEm.getTime() : Infinity;
  const present = (stale: boolean): AnnualRate => ({ status: 'disponivel', taxaAnual: Number(cached!.taxaAnual), fonte: cached!.fonte, consultadaEm: cached!.consultadaEm.toISOString(), ...(cached!.referencia ? { referencia: cached!.referencia.toISOString() } : {}), emCache: true, desatualizada: stale });
  if (cached && age >= 0 && age < TTL) return present(false);
  const primary = await fetchSelic();
  const fallback = primary.status === 'disponivel' ? null : await fetchCentralBankSelic(fetch, 5000, now);
  const live = primary.status === 'disponivel' ? { taxaAnual: primary.taxaAnual, fonte: 'BrasilAPI', referencia: null } : fallback?.status === 'disponivel' ? { taxaAnual: fallback.taxaAnual, fonte: 'Banco Central · SGS 432', referencia: fallback.referencia } : null;
  if (live) {
    await prisma.taxaReferencia.upsert({ where: { chave: 'SELIC' }, create: { chave: 'SELIC', ...live, consultadaEm: now }, update: { ...live, consultadaEm: now } });
    return { status: 'disponivel', taxaAnual: live.taxaAnual, fonte: live.fonte, consultadaEm: now.toISOString(), ...(live.referencia ? { referencia: live.referencia.toISOString() } : {}), emCache: false, desatualizada: false };
  }
  if (cached && age >= 0 && age <= MAX_AGE) return present(true);
  return { status: 'indisponivel' };
}
