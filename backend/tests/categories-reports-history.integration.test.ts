import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';
import { createAccessToken } from '../src/modules/auth/token.service.js';
import { businessDay } from '../src/modules/notifications/dates.js';

describe.skipIf(process.env.RUN_DATABASE_TESTS !== '1')('categorias, relatórios, histórico e perfil com PostgreSQL', () => {
  const owner=randomUUID(),other=randomUUID(),headers={Authorization:`Bearer ${createAccessToken(owner,env.JWT_SECRET)}`},foreign={Authorization:`Bearer ${createAccessToken(other,env.JWT_SECRET)}`};
  const day=businessDay(),month=day.toISOString().slice(0,7),start=`${month}-01`,previous=new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth()-1,1)).toISOString().slice(0,10);
  let a:string,b:string,c:string;
  const pay={valor:40,encargos:.9,pagoEm:start,chave:randomUUID()};
  async function create(descricao:string,valor:number,vencimento:string,categoria?:string,tipo='AVULSA'){
    const response=await request(app).post('/api/accounts').set(headers).send({descricao,valor,vencimento,categoria,tipo,recorrencia:tipo==='RECORRENTE'?'MENSAL':null});expect(response.status).toBe(201);return response.body.account;
  }
  beforeAll(async()=>{
    await prisma.usuario.createMany({data:[owner,other].map(id=>({id,nome:'QA relatório',email:`${id}@example.org`,senhaHash:'HASH_NAO_EXPORTAR'}))});
    a=(await create('Moradia mensal',100,start,'MORADIA')).id;
    b=(await create('Conta do mês anterior',30,previous)).id;
    c=(await create('Estudos',60,start,'ESTUDOS')).id;
    await request(app).post(`/api/accounts/${a}/payments`).set(headers).send(pay).expect(201);
    await request(app).post(`/api/accounts/${b}/payments`).set(headers).send({valor:10,encargos:.1,pagoEm:start,chave:randomUUID()}).expect(201);
    await request(app).post(`/api/accounts/${c}/payments`).set(headers).send({valor:20,pagoEm:previous,chave:randomUUID()}).expect(201);
    await prisma.conta.create({data:{usuarioId:other,descricao:'DADO_ALHEIO',valor:999,vencimento:new Date(start),categoria:'MORADIA'}});
  });
  afterAll(async()=>{
    const rows=await prisma.conta.findMany({where:{usuarioId:{in:[owner,other]}},orderBy:{vencimento:'desc'}});
    for(const row of rows)await prisma.conta.delete({where:{id:row.id}});
    await prisma.usuario.deleteMany({where:{id:{in:[owner,other]}}});await prisma.$disconnect();
  });
  it('categoria antiga recebe Outras e filtro é isolado por usuário',async()=>{
    expect((await request(app).get(`/api/accounts/${b}`).set(headers)).body.account.categoria).toBe('OUTRAS');
    const response=await request(app).get('/api/accounts?categoria=MORADIA').set(headers);
    expect(response.body.accounts.map((row:{id:string})=>row.id)).toEqual([a]);
    expect((await request(app).get('/api/accounts?categoria=INVALIDA').set(headers)).status).toBe(400);
  });
  it('relatório distingue vencimentos do mês de pagamentos realizados no mês',async()=>{
    const response=await request(app).get(`/api/accounts/reports/monthly?mes=${month}`).set(headers);
    expect(response.status).toBe(200);
    expect(response.body.report.totais).toEqual({previsto:160,saldoPendente:100,principalPago:50,encargos:1,totalPago:51});
    expect(response.body.report.contas.map((row:{id:string})=>row.id).sort()).toEqual([a,c].sort());
    expect(response.body.report.pagamentos).toHaveLength(2);
    expect(response.body.report.categorias.find((row:{categoria:string})=>row.categoria==='MORADIA')).toEqual({categoria:'MORADIA',previsto:100,principalPago:40,encargos:.9,saldoPendente:60});
  });
  it('relatório exige sessão e valida mês civil',async()=>{
    expect((await request(app).get(`/api/accounts/reports/monthly?mes=${month}`)).status).toBe(401);
    for(const mes of ['2026-13','26-11','0000-01','9999-01'])expect((await request(app).get(`/api/accounts/reports/monthly?mes=${mes}`).set(headers)).status).toBe(400);
    expect((await request(app).get('/api/accounts/reports/monthly?mes=1900-01').set(headers)).body.report.totais.totalPago).toBe(0);
  });
  it('criação e pagamento geram eventos; repetição de pagamento não duplica evento',async()=>{
    await request(app).post(`/api/accounts/${a}/payments`).set(headers).send(pay).expect(201);
    const rows=(await request(app).get(`/api/accounts/${a}/history`).set(headers)).body.history;
    expect(rows.filter((row:{acao:string})=>row.acao==='CONTA_CRIADA')).toHaveLength(1);
    expect(rows.filter((row:{acao:string})=>row.acao==='PAGAMENTO_REGISTRADO')).toHaveLength(1);
    expect(rows.find((row:{acao:string})=>row.acao==='PAGAMENTO_REGISTRADO').detalhes).toMatchObject({valor:'40',encargos:'0.9',pagoEm:start});
  });
  it('edição preserva categoria omitida e registra antes/depois sem duplicar edição idêntica',async()=>{
    const body={descricao:'Moradia editada',valor:120,vencimento:start,tipo:'AVULSA',recorrencia:null};
    for(let i=0;i<2;i++)await request(app).put(`/api/accounts/${a}`).set(headers).send(body).expect(200);
    const response=await request(app).get(`/api/accounts/${a}/history`).set(headers);
    const edits=response.body.history.filter((row:{acao:string})=>row.acao==='CONTA_EDITADA');
    expect(edits).toHaveLength(1);expect(edits[0].detalhes.antes.valor).toBe('100');expect(edits[0].detalhes.depois.valor).toBe('120');
    expect((await request(app).get(`/api/accounts/${a}`).set(headers)).body.account.categoria).toBe('MORADIA');
  });
  it('série herda categoria e registra pausa/retomada uma única vez',async()=>{
    const root=await create('Assinatura',25,start,'ASSINATURAS','RECORRENTE');
    const next=await prisma.conta.findUniqueOrThrow({where:{origemId:root.id}});expect(next.categoria).toBe('ASSINATURAS');
    for(const ativa of [false,false,true,true])await request(app).patch(`/api/accounts/${root.id}/recurrence`).set(headers).send({ativa}).expect(200);
    const events=(await request(app).get(`/api/accounts/${root.id}/history`).set(headers)).body.history;
    expect(events.filter((row:{acao:string})=>row.acao==='RECORRENCIA_PAUSADA')).toHaveLength(1);
    expect(events.filter((row:{acao:string})=>row.acao==='RECORRENCIA_RETOMADA')).toHaveLength(1);
    expect(await prisma.historicoConta.count({where:{contaId:next.id,acao:'RECORRENCIA_GERADA'}})).toBe(1);
    expect(await prisma.historicoConta.count({where:{contaId:next.id,acao:'RECORRENCIA_PAUSADA'}})).toBe(1);
    expect(await prisma.historicoConta.count({where:{contaId:next.id,acao:'RECORRENCIA_RETOMADA'}})).toBe(1);
  });
  it('edição rejeitada não deixa histórico ou valor alterado',async()=>{
    const before=await prisma.historicoConta.count({where:{contaId:a}});
    await request(app).put(`/api/accounts/${a}`).set(headers).send({descricao:'Tentativa inválida',valor:30,vencimento:start,tipo:'AVULSA',recorrencia:null}).expect(409);
    expect(await prisma.historicoConta.count({where:{contaId:a}})).toBe(before);
    expect(Number((await prisma.conta.findUniqueOrThrow({where:{id:a}})).valor)).toBe(120);
  });
  it('exclusão preserva rastro e histórico não pode ser acessado por outra pessoa',async()=>{
    const account=await create('Excluir com rastro',10,start,'LAZER');
    expect((await request(app).get(`/api/accounts/${account.id}/history`).set(foreign)).status).toBe(404);
    await request(app).delete(`/api/accounts/${account.id}`).set(headers).expect(200);
    const global=(await request(app).get('/api/accounts/history').set(headers)).body.history;
    expect(global.find((row:{acao:string;descricao:string})=>row.acao==='CONTA_EXCLUIDA'&&row.descricao==='Excluir com rastro').contaId).toBeNull();
    expect(global.every((row:{usuarioId:string})=>row.usuarioId===owner)).toBe(true);
  });
  it('exportação inclui apenas dados próprios e nunca o hash de senha',async()=>{
    const response=await request(app).get('/api/users/me/export').set(headers);expect(response.status).toBe(200);
    expect(response.body.usuario.id).toBe(owner);expect(response.body.contas.every((row:{usuarioId:string})=>row.usuarioId===owner)).toBe(true);
    const json=JSON.stringify(response.body);expect(json).not.toContain('HASH_NAO_EXPORTAR');expect(json).not.toContain('senhaHash');expect(json).not.toContain('DADO_ALHEIO');
    expect((await request(app).get('/api/users/me/export')).status).toBe(401);
  });
  it('resumo pessoal corresponde aos próprios registros',async()=>{
    const response=await request(app).get('/api/users/me/summary').set(headers);expect(response.status).toBe(200);
    expect(response.body.summary.pagamentos).toBe(3);expect(response.body.summary.totalPago).toBe(71);
    expect(response.body.summary.contas).toBe(await prisma.conta.count({where:{usuarioId:owner}}));
  });
});
