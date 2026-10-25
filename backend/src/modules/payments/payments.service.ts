import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { dateOnly, money } from '../accounts/accounts.schema.js';
import { AccountError, accountStatus, cents, nextDue } from '../accounts/accounts.service.js';
import { businessDay } from '../notifications/dates.js';
import {transaction} from '../../jobs/transaction.js';
export const paymentSchema = z.object({valor:money,encargos:money.or(z.literal(0)).optional(),pagoEm:dateOnly.refine(v=>v<=businessDay().toISOString().slice(0,10),'Pagamento não pode estar no futuro'),chave:z.string().uuid()}).strict();
export async function registerPayment(usuarioId:string,id:string,input:z.infer<typeof paymentSchema>) {
 return transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM contas WHERE id = ${id} AND usuario_id = ${usuarioId} FOR UPDATE`;
  const c=await tx.conta.findFirst({where:{id,usuarioId},include:{pagamentos:true}});
  if(!c) throw new AccountError('Conta não encontrada',404);
  const existing=await tx.pagamento.findUnique({where:{chave:input.chave}});
  if(existing) {
   if(existing.contaId!==id || cents(existing.valor)!==cents(input.valor) || cents(existing.encargos??0)!==cents(input.encargos??0) || existing.pagoEm.toISOString().slice(0,10)!==input.pagoEm) throw new AccountError('Chave de idempotência já utilizada');
   return existing;
  }
  const paid=c.pagamentos.reduce((n,p)=>n+cents(p.valor),0);
  if(paid+cents(input.valor)>cents(c.valor)) throw new AccountError('Pagamento excede o saldo da conta');
  const payment=await tx.pagamento.create({data:{contaId:id,valor:input.valor,...(input.encargos!==undefined?{encargos:input.encargos}:{}),pagoEm:new Date(input.pagoEm),chave:input.chave}});
  const status=accountStatus(c.valor,c.vencimento,[...c.pagamentos,payment]);
  await tx.conta.update({where:{id},data:{status}});
  if(status==='PAGA' && c.tipo==='RECORRENTE' && c.recorrenciaAtiva !== false) {
   const due=nextDue(c.vencimento,c.diaRecorrencia??c.vencimento.getUTCDate());
   await tx.conta.upsert({where:{origemId:id},update:{},create:{usuarioId,descricao:c.descricao,valor:c.valor,vencimento:due,tipo:'RECORRENTE',recorrencia:'MENSAL',recorrenciaAtiva:true,diaRecorrencia:c.diaRecorrencia??c.vencimento.getUTCDate(),origemId:id}});
  }
  return payment;
 },'Serializable');
}
export async function listPayments(usuarioId:string,contaId?:string) {
 return prisma.pagamento.findMany({where:{conta:{usuarioId},...(contaId?{contaId}:{})},include:{conta:{select:{id:true,descricao:true,vencimento:true}}},orderBy:[{pagoEm:'desc'},{criadoEm:'desc'},{id:'asc'}]});
}
