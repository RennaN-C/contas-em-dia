import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';
import { createAccessToken } from '../src/modules/auth/token.service.js';
const enabled=process.env.RUN_DATABASE_TESTS==='1';
describe.skipIf(!enabled)('contas e pagamentos com PostgreSQL real',()=>{
 const owner=randomUUID(),other=randomUUID();
 const auth={Authorization:`Bearer ${createAccessToken(owner,env.JWT_SECRET)}`};
 const foreign={Authorization:`Bearer ${createAccessToken(other,env.JWT_SECRET)}`};
 const input={descricao:'Integração mensal',valor:100,vencimento:'2024-01-31',tipo:'RECORRENTE',recorrencia:'MENSAL'};
 let id:string;
 beforeAll(async()=>{await prisma.usuario.createMany({data:[owner,other].map(id=>({id,nome:'Integração',email:`${id}@example.org`,senhaHash:'teste-sem-login'}))});});
 afterAll(async()=>{
  // Remove the test-only chain from leaves to root because origins are protected.
  const rows=await prisma.conta.findMany({where:{usuarioId:{in:[owner,other]}},orderBy:{vencimento:'desc'}});
  for(const row of rows) await prisma.conta.delete({where:{id:row.id}});
  await prisma.usuario.deleteMany({where:{id:{in:[owner,other]}}});await prisma.$disconnect();
 });
 it('cria e consulta conta persistida',async()=>{const r=await request(app).post('/api/accounts').set(auth).send(input);expect(r.status).toBe(201);id=r.body.account.id;const detail=await request(app).get(`/api/accounts/${id}`).set(auth);expect(detail.body.account.usuarioId).toBe(owner);});
 it('isola todos os endpoints por proprietário',async()=>{
  expect((await request(app).get('/api/accounts').set(foreign)).body.accounts).toEqual([]);
  for(const method of ['get','put','delete'] as const) expect((await request(app)[method](`/api/accounts/${id}`).set(foreign).send(input)).status).toBe(404);
  expect((await request(app).post(`/api/accounts/${id}/payments`).set(foreign).send({valor:1,pagoEm:'2024-01-01',chave:randomUUID()})).status).toBe(404);
 });
 it('edita antes do início da série',async()=>{expect((await request(app).put(`/api/accounts/${id}`).set(auth).send({...input,descricao:'Editada'})).status).toBe(200);});
 it('pagamento parcial mantém atraso e preserva competência já prevista',async()=>{const r=await request(app).post(`/api/accounts/${id}/payments`).set(auth).send({valor:40,pagoEm:'2024-01-01',chave:randomUUID()});expect(r.status).toBe(201);const detail=(await request(app).get(`/api/accounts/${id}`).set(auth)).body.account;expect(detail.saldo).toBe(60);expect(detail.status).toBe('ATRASADA');expect(await prisma.conta.count({where:{origemId:id}})).toBe(1);});
 it('quitação repetida é idempotente e gera fevereiro bissexto uma vez',async()=>{const payload={valor:60,pagoEm:'2024-01-02',chave:randomUUID()};const first=await request(app).post(`/api/accounts/${id}/payments`).set(auth).send(payload);const second=await request(app).post(`/api/accounts/${id}/payments`).set(auth).send(payload);expect(first.status).toBe(201);expect(second.body.payment.id).toBe(first.body.payment.id);const next=await prisma.conta.findMany({where:{origemId:id}});expect(next).toHaveLength(1);expect(next[0]!.vencimento.toISOString().slice(0,10)).toBe('2024-02-29');expect((await request(app).get(`/api/accounts/${id}`).set(auth)).body.account.status).toBe('PAGA');});
 it('mês seguinte recupera dia 31',async()=>{const next=await prisma.conta.findUniqueOrThrow({where:{origemId:id}});expect((await request(app).post(`/api/accounts/${next.id}/payments`).set(auth).send({valor:100,pagoEm:'2024-02-01',chave:randomUUID()})).status).toBe(201);const march=await prisma.conta.findUniqueOrThrow({where:{origemId:next.id}});expect(march.vencimento.toISOString().slice(0,10)).toBe('2024-03-31');});
 it('histórico é ordenado, vinculado e isolado; exclusão preserva pagamentos',async()=>{const r=await request(app).get(`/api/payments?contaId=${id}`).set(auth);expect(r.body.payments.map((p:{valor:string})=>Number(p.valor))).toEqual([60,40]);expect((await request(app).get('/api/payments').set(foreign)).body.payments).toEqual([]);expect((await request(app).delete(`/api/accounts/${id}`).set(auth)).status).toBe(409);expect(await prisma.pagamento.count({where:{contaId:id}})).toBe(2);});
 it('exclusão de avulsa remove avisos sem órfãos',async()=>{const r=await request(app).post('/api/accounts').set(auth).send({...input,tipo:'AVULSA',recorrencia:null});const cid=r.body.account.id;await prisma.aviso.create({data:{contaId:cid,diasAntes:1,agendadoPara:new Date('2024-01-30')}});expect((await request(app).delete(`/api/accounts/${cid}`).set(auth)).status).toBe(200);expect(await prisma.aviso.count({where:{contaId:cid}})).toBe(0);});
 it('pagamentos concorrentes não ultrapassam saldo',async()=>{const r=await request(app).post('/api/accounts').set(auth).send({...input,tipo:'AVULSA',recorrencia:null});const cid=r.body.account.id;const responses=await Promise.all([1,2].map(()=>request(app).post(`/api/accounts/${cid}/payments`).set(auth).send({valor:70,pagoEm:'2024-01-01',chave:randomUUID()})));expect(responses.map(r=>r.status).sort()).toEqual([201,409]);const paid=await prisma.pagamento.aggregate({where:{contaId:cid},_sum:{valor:true}});expect(Number(paid._sum.valor)).toBe(70);});
});
