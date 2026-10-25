import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';
import { createAccessToken } from '../src/modules/auth/token.service.js';
import { processNotifications } from '../src/modules/notifications/notifications.service.js';
import { processWeeklySummaries, weeklySummary } from '../src/modules/messages/messages.service.js';
import { runDaily, runWeekly } from '../src/jobs/schedules.js';
import { listInterestEstimates } from '../src/modules/notifications/interest.service.js';
import { addDays } from '../src/modules/notifications/dates.js';
import * as messageService from '../src/modules/messages/messages.service.js';

describe.skipIf(process.env.RUN_DATABASE_TESTS !== '1')('avisos e mensagens no PostgreSQL isolado', () => {
  const owner = randomUUID(), other = randomUUID();
  const now = new Date('2026-10-26T23:59:59Z');
  const auth = { Authorization: `Bearer ${createAccessToken(owner, env.JWT_SECRET)}` };
  const foreign = { Authorization: `Bearer ${createAccessToken(other, env.JWT_SECRET)}` };
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    await prisma.usuario.createMany({ data: [owner, other].map(id => ({ id, nome: 'Teste avisos', email: `${id}@example.org`, senhaHash: 'teste-sem-login' })) });
    for (const [name, days, paid, status] of [
      ['three', 3, 0, 'PENDENTE'], ['one', 1, 40, 'PENDENTE'], ['today', 0, 0, 'PENDENTE'], ['paid', 3, 100, 'PENDENTE'],
      ['outside', 7, 0, 'PENDENTE'], ['last', 6, 0, 'PENDENTE'], ['late', -30, 40, 'PENDENTE'], ['paidLate', -30, 100, 'PENDENTE']
    ] as const) {
      const c = await prisma.conta.create({ data: { usuarioId: owner, descricao: name, valor: 100, vencimento: addDays(now, days), status, ...(paid ? { pagamentos: { create: { valor: paid, pagoEm: addDays(now, -31) } } } : {}) } });
      ids[name] = c.id;
    }
    ids.foreign = (await prisma.conta.create({ data: { usuarioId: other, descricao: 'Alheia', valor: 999, vencimento: addDays(now, 1) } })).id;
  });
  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { id: { in: [owner, other] } } });
    await prisma.$disconnect();
  });
  it('concorrência e reexecuções geram um aviso e uma mensagem por evento', async () => {
    await Promise.all(Array.from({ length: 4 }, () => processNotifications(now)));
    await runDaily(now);
    const avisos = await prisma.aviso.findMany({ where: { conta: { usuarioId: owner } } });
    expect(avisos).toHaveLength(3); expect(avisos.map(a => a.diasAntes).sort()).toEqual([0, 1, 3]);
    expect(await prisma.mensagem.count({ where: { usuarioId: owner, tipo: 'AVISO' } })).toBe(3);
    expect(await prisma.aviso.count({ where: { contaId: ids.paid } })).toBe(0);
    expect(avisos.every(a => a.enviadoEm !== null)).toBe(true);
  });
  it('restrição única do banco rejeita mesmo evento', async () => {
    await expect(prisma.aviso.create({ data: { contaId: ids.three!, tipo: 'TRES_DIAS', diasAntes: 3, agendadoPara: addDays(now, 0) } })).rejects.toMatchObject({ code: 'P2002' });
  });
  it('FK rejeita aviso de conta inexistente', async () => {
    await expect(prisma.aviso.create({ data: { contaId: randomUUID(), diasAntes: 0, agendadoPara: now } })).rejects.toMatchObject({ code: 'P2003' });
  });
  it('resumo inclui hoje e sexto dia, exclui sétimo dia, quitadas e alheias', async () => {
    const summary = await weeklySummary(owner, now);
    expect(summary.accounts.map(c => c.descricao).sort()).toEqual(['last', 'one', 'three', 'today']);
    expect(summary.total).toBe(360);
  });
  it('resumo concorrente e reexecutado persiste apenas uma mensagem por semana', async () => {
    await Promise.all(Array.from({ length: 4 }, () => processWeeklySummaries(now)));
    await runWeekly(addDays(now, 1));
    const messages = await prisma.mensagem.findMany({ where: { usuarioId: owner, tipo: 'RESUMO_SEMANAL' } });
    expect(messages).toHaveLength(1); expect(messages[0]!.conteudo).toContain('360,00'); expect(messages[0]!.conteudo).toContain('2026-10-29');
    expect(messages[0]!.conteudo).not.toContain('Alheia');
  });
  it('semana seguinte permite um novo resumo', async () => {
    await processWeeklySummaries(addDays(now, 7));
    expect(await prisma.mensagem.count({ where: { usuarioId: owner, tipo: 'RESUMO_SEMANAL' } })).toBe(2);
  });
  it('GET e PATCH isolam usuários e persistem leitura idempotente', async () => {
    const response = await request(app).get('/api/messages').set(auth);
    expect(response.status).toBe(200); expect(response.body.messages.every((m: { usuarioId: string }) => m.usuarioId === owner)).toBe(true);
    const message = response.body.messages.find((m: { contaId: string }) => m.contaId === ids.one);
    expect(message.conta.descricao).toBe('one'); expect(message.conteudo).toContain('60,00');
    expect((await request(app).patch(`/api/messages/${message.id}/read`).set(foreign)).status).toBe(404);
    expect((await prisma.mensagem.findUniqueOrThrow({ where: { id: message.id } })).lida).toBe(false);
    for (let n = 0; n < 2; n++) expect((await request(app).patch(`/api/messages/${message.id}/read`).set(auth)).body.message.lida).toBe(true);
    expect((await prisma.mensagem.findUniqueOrThrow({ where: { id: message.id } })).lida).toBe(true);
  });
  it('avisos HTTP não expõem contas de outro usuário', async () => {
    const r = await request(app).get('/api/notifications').set(auth);
    expect(r.status).toBe(200); expect(r.body.notifications).toHaveLength(3);
    expect(r.body.notifications.some((n: { contaId: string }) => n.contaId === ids.foreign)).toBe(false);
  });
  it('juros reais sobre saldo parcial com BrasilAPI mockada', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"nome":"Selic","valor":15}'));
    try {
      const r = await listInterestEstimates(owner, now);
      expect(r.estimates).toHaveLength(1); expect(r.estimates[0]).toMatchObject({ conta: { id: ids.late }, dias: 30, saldo: '60.00', juros: '0.74', valorEstimado: '60.74' });
      expect(fetcher).toHaveBeenCalledOnce();
    } finally { fetcher.mockRestore(); }
  });
  it('exclusão da conta preserva mensagem e remove referência', async () => {
    const c = await prisma.conta.create({ data: { usuarioId: owner, descricao: 'Exclusão', valor: 1, vencimento: now } });
    const m = await prisma.mensagem.create({ data: { usuarioId: owner, contaId: c.id, titulo: 'Histórico', conteudo: 'Preservado' } });
    await prisma.conta.delete({ where: { id: c.id } });
    expect((await prisma.mensagem.findUniqueOrThrow({ where: { id: m.id } })).contaId).toBeNull();
  });
  it('falha de mensagem reverte aviso e reexecução recupera atomicamente', async () => {
    const future = addDays(now, 2);
    const c = await prisma.conta.create({ data: { usuarioId: owner, descricao: 'Atomicidade', valor: 10, vencimento: future } });
    const original = messageService.persistMessage;
    const spy = vi.spyOn(messageService, 'persistMessage').mockImplementation(async (tx, input) => {
      if (input.contaId === c.id) throw new Error('Falha simulada na mensagem');
      return original(tx, input);
    });
    try {
      await expect(processNotifications(future)).rejects.toThrow('Falha ao processar avisos');
      expect(await prisma.aviso.count({ where: { contaId: c.id } })).toBe(0);
      expect(await prisma.mensagem.count({ where: { contaId: c.id } })).toBe(0);
    } finally { spy.mockRestore(); }
    await processNotifications(future);
    expect(await prisma.aviso.count({ where: { contaId: c.id } })).toBe(1);
    expect(await prisma.mensagem.count({ where: { contaId: c.id } })).toBe(1);
  });
  it('relê pagamentos depois de aguardar lock de uma quitação concorrente', async () => {
    const c = await prisma.conta.create({ data: { usuarioId: owner, descricao: 'Quitação concorrente', valor: 100, vencimento: addDays(now, 3) } });
    let processing: Promise<void> | undefined;
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM contas WHERE id = ${c.id} FOR UPDATE`;
      await tx.pagamento.create({ data: { contaId: c.id, valor: 100, pagoEm: now } });
      // Keep a stale status intentionally. Notification processing must wait for this commit.
      processing = processNotifications(now);
    });
    await processing;
    expect(await prisma.aviso.count({ where: { contaId: c.id } })).toBe(0);
    expect(await prisma.mensagem.count({ where: { contaId: c.id } })).toBe(0);
  });
});
