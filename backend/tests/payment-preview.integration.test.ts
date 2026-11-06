import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
vi.mock('../src/integrations/brasil-api/rate.service.js', () => ({ getAnnualSelic: vi.fn(async () => ({ status: 'disponivel', taxaAnual: 15, fonte: 'Teste', emCache: true, desatualizada: false })) }));
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';
import { createAccessToken } from '../src/modules/auth/token.service.js';
import { addDays, businessDay } from '../src/modules/notifications/dates.js';

describe.skipIf(process.env.RUN_DATABASE_TESTS !== '1')('prévia de pagamento autenticada', () => {
  const owner = randomUUID(), other = randomUUID();
  const auth = { Authorization: `Bearer ${createAccessToken(owner, env.JWT_SECRET)}` };
  let accountId: string;
  beforeAll(async () => {
    await prisma.usuario.createMany({ data: [owner, other].map(id => ({ id, nome: 'QA prévia', email: `${id}@example.org`, senhaHash: 'teste' })) });
    accountId = (await prisma.conta.create({ data: { usuarioId: owner, descricao: 'Conta prévia', valor: 100, vencimento: addDays(businessDay(), -30) } })).id;
  });
  afterAll(async () => { await prisma.usuario.deleteMany({ where: { id: { in: [owner, other] } } }); await prisma.$disconnect(); });
  const payload = () => ({ valor: 60, pagoEm: businessDay().toISOString().slice(0, 10) });
  it('exige sessão e isola proprietário', async () => {
    expect((await request(app).post(`/api/accounts/${accountId}/payments/preview`).send(payload())).status).toBe(401);
    expect((await request(app).post(`/api/accounts/${accountId}/payments/preview`).set('Authorization', `Bearer ${createAccessToken(other, env.JWT_SECRET)}`).send(payload())).status).toBe(404);
  });
  it('retorna valor automático sem persistir pagamento ou alterar saldo', async () => {
    const response = await request(app).post(`/api/accounts/${accountId}/payments/preview`).set(auth).send(payload());
    expect(response.status).toBe(200);
    expect(response.body.preview).toMatchObject({ encargos: '0.74', total: '60.74', dias: 30 });
    expect(await prisma.pagamento.count({ where: { contaId: accountId } })).toBe(0);
    expect((await request(app).get(`/api/accounts/${accountId}`).set(auth)).body.account.saldo).toBe(100);
  });
  it('valida UUID e payload estrito', async () => {
    expect((await request(app).post('/api/accounts/invalido/payments/preview').set(auth).send(payload())).status).toBe(400);
    expect((await request(app).post(`/api/accounts/${accountId}/payments/preview`).set(auth).send({ ...payload(), usuarioId: other })).status).toBe(400);
  });
});
