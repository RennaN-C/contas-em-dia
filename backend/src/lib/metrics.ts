import { timingSafeEqual } from 'node:crypto';
import { Counter, Gauge, Histogram, Registry } from '@prometheus-io/client';
import type { RequestHandler } from 'express';
import { prisma } from './prisma.js';

export const metricsRegistry = new Registry();
const http = new Counter({ name: 'saldo_http_requests_total', help: 'Requisições HTTP por método, rota e status', labelNames: ['method', 'route', 'status'] as const, registers: [metricsRegistry] });
const latency = new Histogram({ name: 'saldo_http_duration_seconds', help: 'Latência HTTP', labelNames: ['route'] as const, buckets: [0.01, 0.1, 0.5, 1, 3, 10], registers: [metricsRegistry] });
export const jobRuns = new Counter({ name: 'saldo_jobs_total', help: 'Execuções e falhas dos jobs', labelNames: ['job', 'result'] as const, registers: [metricsRegistry] });
export const discordMessageGauge = new Gauge({ name: 'saldo_discord_messages', help: 'Mensagens Discord persistidas por estado', labelNames: ['status'] as const, registers: [metricsRegistry], async collect() {
  const rows = await prisma.mensagem.groupBy({ by: ['estado'], where: { plataforma: 'DISCORD', direcao: 'saida' }, _count: true });
  for (const state of ['enfileirada', 'enviada', 'falha', 'respondida']) this.set({ status: state }, rows.find(r => r.estado === state)?._count ?? 0);
} });
export const discordAttemptGauge = new Gauge({ name: 'saldo_discord_attempts', help: 'Tentativas de envio persistidas', registers: [metricsRegistry], async collect() {
  const row = await prisma.mensagem.aggregate({ where: { plataforma: 'DISCORD' }, _sum: { tentativas: true } }); this.set(row._sum.tentativas ?? 0);
} });
export const discordRetryGauge = new Gauge({ name: 'saldo_discord_retries', help: 'Retentativas persistidas sem contar a primeira tentativa', registers: [metricsRegistry], async collect() {
  const rows = await prisma.$queryRaw<{ retries: number }[]>`SELECT COALESCE(SUM(GREATEST(tentativas - 1, 0)), 0)::float8 AS retries FROM mensagens WHERE plataforma = 'DISCORD' AND direcao = 'saida'`;
  this.set(rows[0]?.retries ?? 0);
} });
export const discordInteractionGauge = new Gauge({ name: 'saldo_discord_interactions', help: 'Interações recebidas persistidas', registers: [metricsRegistry], async collect() { this.set(await prisma.interacaoDiscord.count()); } });
export const measureRequests: RequestHandler = (req, res, next) => {
  const started = performance.now();
  res.once('finish', () => {
    // Only static route patterns, never URLs, query strings, IDs or user-supplied paths.
    const path: unknown = req.route?.path;
    const route = typeof path === 'string' ? path : 'unmatched';
    http.inc({ method: req.method, route, status: String(res.statusCode) });
    latency.observe({ route }, (performance.now() - started) / 1000);
  }); next();
};
export const metricsEndpoint: RequestHandler = async (req, res) => {
  const token = process.env.METRICS_TOKEN ?? '';
  if (process.env.METRICS_ENABLED !== 'true' || token.length < 16) { res.sendStatus(404); return; }
  const supplied = Buffer.from(req.get('Authorization') ?? ''), expected = Buffer.from(`Bearer ${token}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { res.sendStatus(401); return; }
  try { res.type(metricsRegistry.contentType).send(await metricsRegistry.metrics()); }
  catch { res.status(503).send('Métricas temporariamente indisponíveis'); }
};
