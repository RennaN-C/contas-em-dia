import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';
import { createAccessToken } from '../src/modules/auth/token.service.js';
import { businessDay, addDays } from '../src/modules/notifications/dates.js';
import { processNotifications } from '../src/modules/notifications/notifications.service.js';

describe.skipIf(process.env.RUN_DATABASE_TESTS !== '1')('atualização imediata para demonstração', () => {
  const owner = randomUUID(), other = randomUUID();
  const auth = { Authorization: `Bearer ${createAccessToken(owner, env.JWT_SECRET)}` };
  const day = businessDay();
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    await prisma.usuario.createMany({ data: [owner, other].map(id => ({ id, nome: 'QA atualização', email: `${id}@example.org`, senhaHash: 'teste' })) });
    // The daily job has already run: new accounts must still be found by refresh.
    await processNotifications(day, owner);
    for (const days of [3, 1, 0, 2]) {
      const response = await request(app).post('/api/accounts').set(auth).send({
        descricao: `Demonstração em ${days} dias`, valor: 100,
        vencimento: addDays(day, days).toISOString().slice(0, 10), tipo: 'AVULSA', recorrencia: null
      });
      expect(response.status).toBe(201);
      ids[String(days)] = response.body.account.id;
    }
    ids.foreign = (await prisma.conta.create({ data: { usuarioId: other, descricao: 'Outro usuário', valor: 50, vencimento: addDays(day, 3) } })).id;
  });
  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { id: { in: [owner, other] } } });
    await prisma.$disconnect();
  });
  it('exige autenticação para atualizar', async () => {
    expect((await request(app).post('/api/notifications/refresh')).status).toBe(401);
  });
  it('cadastrar e atualizar gera imediatamente mensagens de 3 dias, véspera e hoje', async () => {
    expect(await prisma.mensagem.count({ where: { usuarioId: owner, tipo: 'AVISO' } })).toBe(0);
    expect((await request(app).post('/api/notifications/refresh').set(auth)).status).toBe(200);
    const response = await request(app).get('/api/messages').set(auth);
    const alerts = response.body.messages.filter((row: { tipo: string }) => row.tipo === 'AVISO');
    expect(alerts).toHaveLength(3);
    expect(alerts.find((row: { contaId: string }) => row.contaId === ids['3'])).toMatchObject({ titulo: 'Vencimento em 3 dia(s)', lida: false });
    expect(alerts.some((row: { contaId: string }) => row.contaId === ids['2'])).toBe(false);
    expect(await prisma.aviso.count({ where: { contaId: ids.foreign } })).toBe(0);
  });
  it('repetir atualização não duplica avisos nem mensagens', async () => {
    for (let i = 0; i < 2; i++) expect((await request(app).post('/api/notifications/refresh').set(auth)).status).toBe(200);
    expect(await prisma.aviso.count({ where: { conta: { usuarioId: owner } } })).toBe(3);
    expect(await prisma.mensagem.count({ where: { usuarioId: owner, tipo: 'AVISO' } })).toBe(3);
    expect(await prisma.mensagem.count({ where: { usuarioId: owner, tipo: 'RESUMO_SEMANAL' } })).toBe(1);
  });
});
