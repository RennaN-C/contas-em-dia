import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
const { db } = vi.hoisted(() => ({ db: {
  conta: { findMany: vi.fn(), findUnique: vi.fn() },
  aviso: { createMany: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  mensagem: { createMany: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), findFirstOrThrow: vi.fn() },
  usuario: { findMany: vi.fn() }, $transaction: vi.fn(), $queryRaw: vi.fn()
} }));
vi.mock('../src/lib/prisma.js', () => ({ prisma: db }));
vi.mock('../src/config/env.js', () => ({ env: { JWT_SECRET: 'secret-test-long-enough' } }));
vi.mock('../src/integrations/brasil-api/selic.client.js', () => ({ fetchSelic: vi.fn() }));
import { processNotifications } from '../src/modules/notifications/notifications.service.js';
import { listMessages, markRead, processWeeklySummaries, weeklySummary } from '../src/modules/messages/messages.service.js';
import { estimateInterest, listInterestEstimates } from '../src/modules/notifications/interest.service.js';
import { fetchSelic } from '../src/integrations/brasil-api/selic.client.js';
import { notificationsRoutes } from '../src/modules/notifications/notifications.routes.js';
import { messagesRoutes } from '../src/modules/messages/messages.routes.js';
import { createAccessToken } from '../src/modules/auth/token.service.js';
import { addDays, utcDay, weekStart } from '../src/modules/notifications/dates.js';
import { transaction } from '../src/jobs/transaction.js';

const now = new Date('2026-10-25T23:59:59Z');
const id = '11111111-1111-4111-8111-111111111111';
const account = { id, usuarioId: 'owner', descricao: 'Aluguel', valor: '100.00', vencimento: new Date('2026-10-28'), pagamentos: [], status: 'PENDENTE' };
const auth = { Authorization: `Bearer ${createAccessToken('owner', 'secret-test-long-enough')}` };
const app = express(); app.use(express.json()); app.use('/api/messages', messagesRoutes); app.use('/api/notifications', notificationsRoutes);
beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(fn => fn(db));
  db.$queryRaw.mockResolvedValue([{ id: 'owner' }]);
  db.conta.findMany.mockResolvedValue([account]); db.conta.findUnique.mockResolvedValue(account);
  db.aviso.findUniqueOrThrow.mockResolvedValue({ id: 'aviso', enviadoEm: null });
  db.usuario.findMany.mockResolvedValue([{ id: 'owner' }]);
  db.mensagem.updateMany.mockResolvedValue({ count: 1 });
  db.mensagem.findFirstOrThrow.mockResolvedValue({ id, usuarioId: 'owner', lida: true });
});
afterEach(() => vi.restoreAllMocks());

describe('datas civis UTC', () => {
  it.each([
    ['2026-10-25T23:59:59-03:00', '2026-10-26'],
    ['2024-02-28T23:00:00Z', '2024-02-28'],
    ['2026-12-31T23:59:59Z', '2026-12-31']
  ])('%s é %s', (input, expected) => expect(utcDay(new Date(input)).toISOString().slice(0, 10)).toBe(expected));
  it('avança ano e ano bissexto', () => {
    expect(addDays(new Date('2026-12-31'), 1).toISOString().slice(0, 10)).toBe('2027-01-01');
    expect(addDays(new Date('2024-02-28'), 1).toISOString().slice(0, 10)).toBe('2024-02-29');
  });
  it.each([['2026-10-25', '2026-10-19'], ['2026-10-26', '2026-10-26'], ['2027-01-01', '2026-12-28']])('semana de %s inicia %s', (input, expected) => expect(weekStart(new Date(input)).toISOString().slice(0, 10)).toBe(expected));
});
describe('avisos atômicos', () => {
  it.each([[3, 'TRES_DIAS'], [1, 'VESPERA'], [0, 'VENCIMENTO']])('gera %s dias', async (days, tipo) => {
    db.conta.findUnique.mockResolvedValue({ ...account, vencimento: addDays(now, Number(days)) });
    await processNotifications(now);
    expect(db.aviso.createMany).toHaveBeenCalledWith({ data: expect.objectContaining({ contaId: id, diasAntes: days, tipo, agendadoPara: utcDay(now) }), skipDuplicates: true });
    expect(db.mensagem.createMany).toHaveBeenCalledWith({ data: expect.objectContaining({ usuarioId: 'owner', contaId: id, chave: 'aviso:aviso' }), skipDuplicates: true });
    expect(db.$queryRaw).toHaveBeenCalledOnce();
  });
  it('ignora quitação com status desatualizado', async () => {
    db.conta.findUnique.mockResolvedValue({ ...account, pagamentos: [{ valor: 40 }, { valor: 60 }] });
    await processNotifications(now); expect(db.aviso.createMany).not.toHaveBeenCalled();
  });
  it('avisa saldo parcial mesmo com status PAGA incorreto', async () => {
    db.conta.findUnique.mockResolvedValue({ ...account, status: 'PAGA', pagamentos: [{ valor: 40 }] });
    await processNotifications(now); expect(db.mensagem.createMany.mock.calls[0]![0].data.conteudo).toContain('60,00');
  });
  it.each([-1, 2, 4])('ignora vencimento fora da regra: %s', async days => {
    db.conta.findUnique.mockResolvedValue({ ...account, vencimento: addDays(now, days) });
    await processNotifications(now); expect(db.aviso.createMany).not.toHaveBeenCalled();
  });
  it('ignora conta excluída entre seleção e lock', async () => {
    db.conta.findUnique.mockResolvedValue(null); await processNotifications(now); expect(db.aviso.createMany).not.toHaveBeenCalled();
  });
  it('reexecuções usam a mesma chave e preservam envio original', async () => {
    db.aviso.findUniqueOrThrow.mockResolvedValue({ id: 'aviso', enviadoEm: now });
    await processNotifications(now); await processNotifications(now);
    expect(db.mensagem.createMany.mock.calls.map(c => c[0].data.chave)).toEqual(['aviso:aviso', 'aviso:aviso']);
    expect(db.aviso.update).not.toHaveBeenCalled();
  });
  it('falha individual não impede processamento das demais contas', async () => {
    db.conta.findMany.mockResolvedValue([account, { ...account, id: 'second' }]);
    db.conta.findUnique.mockRejectedValueOnce(new Error('DB indisponível'));
    await expect(processNotifications(now)).rejects.toThrow('Falha ao processar avisos');
    expect(db.mensagem.createMany).toHaveBeenCalledOnce();
  });
});
describe('resumo semanal', () => {
  it('ignora usuário removido antes da obtenção do lock', async () => {
    db.$queryRaw.mockResolvedValueOnce([]);
    await expect(processWeeklySummaries(now)).resolves.toBeUndefined();
    expect(db.mensagem.createMany).not.toHaveBeenCalled();
  });
  it('usa sete datas civis e saldo pendente', async () => {
    db.conta.findMany.mockResolvedValue([{ ...account, pagamentos: [{ valor: 30 }] }, { ...account, id: 'paid', pagamentos: [{ valor: 100 }] }]);
    const r = await weeklySummary('owner', now);
    expect(r.total).toBe(70); expect(r.accounts).toHaveLength(1);
    expect(db.conta.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { usuarioId: 'owner', vencimento: { gte: new Date('2026-10-25'), lt: new Date('2026-11-01') } } }));
  });
  it('persiste valores e vencimentos em mensagem semanal única', async () => {
    await processWeeklySummaries(now); await processWeeklySummaries(addDays(now, -1));
    expect(db.mensagem.createMany.mock.calls.map(c => c[0].data.chave)).toEqual(['semana:owner:2026-10-19', 'semana:owner:2026-10-19']);
    expect(db.mensagem.createMany.mock.calls[0]![0].data.conteudo).toContain('2026-10-28');
    expect(db.mensagem.createMany.mock.calls[0]![0].data.conteudo).toContain('100,00');
  });
  it('gera mensagem vazia sem inventar contas', async () => {
    db.conta.findMany.mockResolvedValue([]); await processWeeklySummaries(now);
    expect(db.mensagem.createMany.mock.calls[0]![0].data.conteudo).toContain('Nenhuma conta');
  });
  it('continua após falha em usuário e sinaliza reexecução', async () => {
    db.usuario.findMany.mockResolvedValue([{ id: 'owner' }, { id: 'other' }]);
    db.$transaction.mockRejectedValueOnce(new Error('erro'));
    await expect(processWeeklySummaries(now)).rejects.toThrow('Falha ao gerar resumos');
    expect(db.mensagem.createMany).toHaveBeenCalledOnce();
  });
});
describe('mensagens e autorização HTTP', () => {
  it.each(['/api/messages', '/api/notifications', '/api/notifications/weekly-summary', '/api/notifications/interest-estimates'])('%s exige JWT', async path => expect((await request(app).get(path)).status).toBe(401));
  it('leitura exige JWT', async () => expect((await request(app).patch(`/api/messages/${id}/read`)).status).toBe(401));
  it('lista só usuário do token', async () => {
    db.mensagem.findMany.mockResolvedValue([]);
    expect((await request(app).get('/api/messages?usuarioId=other').set(auth)).body.messages).toEqual([]);
    expect(db.mensagem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { usuarioId: 'owner' } }));
  });
  it('marca como lida com escopo obrigatório do token', async () => {
    expect((await request(app).patch(`/api/messages/${id}/read`).set(auth).send({ usuarioId: 'other' })).body.message.lida).toBe(true);
    expect(db.mensagem.updateMany).toHaveBeenCalledWith({ where: { id, usuarioId: 'owner' }, data: { lida: true } });
  });
  it('mensagem alheia é 404 e não retorna dados', async () => {
    db.mensagem.updateMany.mockResolvedValue({ count: 0 });
    expect((await request(app).patch(`/api/messages/${id}/read`).set(auth)).status).toBe(404);
    expect(db.mensagem.findFirstOrThrow).not.toHaveBeenCalled();
  });
  it('rejeita id inválido', async () => {
    expect((await request(app).patch('/api/messages/invalido/read').set(auth)).status).toBe(400);
    expect(db.mensagem.updateMany).not.toHaveBeenCalled();
  });
  it('avisos usam proprietário da conta', async () => {
    db.aviso.findMany.mockResolvedValue([]); expect((await request(app).get('/api/notifications').set(auth)).status).toBe(200);
    expect(db.aviso.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { conta: { usuarioId: 'owner' } } }));
  });
  it('serviço exige proprietário na consulta e na atualização', async () => {
    await listMessages('other'); await markRead('other', id);
    expect(db.mensagem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { usuarioId: 'other' } }));
    expect(db.mensagem.updateMany).toHaveBeenCalledWith({ where: { id, usuarioId: 'other' }, data: { lida: true } });
  });
});
describe('juros demonstrativos', () => {
  it('usa juros simples em 365 dias e arredonda em centavos', () => {
    expect(estimateInterest(60, new Date('2026-09-25'), 15, now)).toEqual({ dias: 30, taxaAnual: 15, saldo: '60.00', juros: '0.74', valorEstimado: '60.74' });
    expect(estimateInterest(100, new Date('2025-10-25'), 15, now).juros).toBe('15.00');
  });
  it.each([[0, '2026-01-01'], [100, '2026-10-25'], [100, '2026-10-26']])('sem juros saldo=%s vencimento=%s', (saldo, due) => expect(estimateInterest(Number(saldo), new Date(String(due)), 15, now).juros).toBe('0.00'));
  it('calcula só saldo parcial e consulta taxa uma vez', async () => {
    db.conta.findMany.mockResolvedValue([{ ...account, vencimento: new Date('2026-09-25'), pagamentos: [{ valor: 40 }] }, { ...account, vencimento: new Date('2026-09-25'), pagamentos: [{ valor: 100 }] }]);
    vi.mocked(fetchSelic).mockResolvedValue({ status: 'disponivel', taxaAnual: 15 });
    const result = await listInterestEstimates('owner', now);
    expect(result.estimates).toHaveLength(1); expect(result.estimates[0]).toMatchObject({ saldo: '60.00', juros: '0.74' });
    expect(fetchSelic).toHaveBeenCalledOnce(); expect(result.aviso).toContain('Não é cobrança contratual');
  });
  it('falha externa retorna indisponível sem taxa ou valor inventado', async () => {
    db.conta.findMany.mockResolvedValue([{ ...account, vencimento: new Date('2026-09-25') }]);
    vi.mocked(fetchSelic).mockResolvedValue({ status: 'indisponivel' });
    const result = await listInterestEstimates('owner', now);
    expect(result.estimates[0]).toMatchObject({ status: 'indisponivel' });
    expect(result.estimates[0]).not.toHaveProperty('taxaAnual'); expect(result.estimates[0]).not.toHaveProperty('juros');
  });
  it('não consulta BrasilAPI sem atraso', async () => {
    expect((await listInterestEstimates('owner', now)).estimates).toEqual([]); expect(fetchSelic).not.toHaveBeenCalled();
  });
});
describe('transações e reexecução', () => {
  it.each([{ code: 'P2034' }, { code: 'P2010', meta: { code: '40P01' } }])('repete conflito transitório %j', async error => {
    db.$transaction.mockRejectedValueOnce(error); const work = vi.fn().mockResolvedValue('ok');
    expect(await transaction(work)).toBe('ok'); expect(db.$transaction).toHaveBeenCalledTimes(2);
  });
  it('limita tentativas em falha persistente', async () => {
    db.$transaction.mockRejectedValue({ code: 'P2034' }); await expect(transaction(async () => true)).rejects.toMatchObject({ code: 'P2034' });
    expect(db.$transaction).toHaveBeenCalledTimes(3);
  });
  it('propaga erros não transitórios', async () => {
    db.$transaction.mockRejectedValue(new Error('offline')); await expect(transaction(async () => true)).rejects.toThrow('offline'); expect(db.$transaction).toHaveBeenCalledOnce();
  });
});
