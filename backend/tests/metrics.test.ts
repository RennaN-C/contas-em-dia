import request from 'supertest';
import { afterEach, expect, it, vi } from 'vitest';
import { app } from '../src/app.js';
import { metricsRegistry } from '../src/lib/metrics.js';
afterEach(() => vi.unstubAllEnvs());
it('métricas ficam ocultas por padrão e exigem bearer quando habilitadas', async () => {
  vi.stubEnv('METRICS_ENABLED', 'false'); expect((await request(app).get('/internal/metrics')).status).toBe(404);
  vi.stubEnv('METRICS_ENABLED', 'true'); vi.stubEnv('METRICS_TOKEN', 'segredo-apenas-teste-metricas');
  expect((await request(app).get('/internal/metrics')).status).toBe(401);
  expect((await request(app).get('/internal/metrics').set('Authorization', 'Bearer errado')).status).toBe(401);
});
it('labels de HTTP usam padrão de rota sem query strings nem conteúdo financeiro', async () => {
  await request(app).get('/api/nao-existe-id-pessoal?token=nao-vazar');
  const values = await metricsRegistry.getSingleMetric('saldo_http_requests_total')!.get();
  expect(JSON.stringify(values)).not.toContain('id-pessoal'); expect(JSON.stringify(values)).not.toContain('nao-vazar');
  expect(JSON.stringify(values)).toContain('saldo_http_requests_total');
});
