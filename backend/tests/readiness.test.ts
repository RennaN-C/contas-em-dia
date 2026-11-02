import request from 'supertest';
import { beforeEach, expect, it, vi } from 'vitest';
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../src/lib/prisma.js', () => ({ prisma: { $queryRaw: query } }));
import { app } from '../src/app.js';

beforeEach(() => vi.resetAllMocks());
it('prontidão confirma conexão com PostgreSQL', async () => {
  query.mockResolvedValue([{ '?column?': 1 }]);
  const response = await request(app).get('/api/ready');
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ status: 'ok', database: 'connected' });
  expect(query).toHaveBeenCalledOnce();
});
it('banco indisponível retorna 503 sem expor credenciais ou detalhes internos', async () => {
  query.mockRejectedValue(new Error('password=segredo host=interno'));
  const response = await request(app).get('/api/ready');
  expect(response.status).toBe(503);
  expect(response.body).toEqual({ status: 'unavailable', service: 'contas-em-dia-api' });
});
it('liveness continua disponível sem depender do banco', async () => {
  const response = await request(app).get('/api/health');
  expect(response.status).toBe(200);
  expect(query).not.toHaveBeenCalled();
});
