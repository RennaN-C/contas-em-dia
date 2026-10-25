import { prisma } from '../../lib/prisma.js';
import type { AccountInput } from './accounts.schema.js';
import { extendRecurrence } from './recurrence.service.js';
import { businessDay } from '../notifications/dates.js';
import {transaction} from '../../jobs/transaction.js';
export class AccountError extends Error { constructor(message: string, public status = 409) { super(message); } }
export function cents(value: unknown) { return Math.round(Number(value) * 100); }
export function accountStatus(valor: unknown, vencimento: Date, pagamentos: {valor: unknown}[], now = businessDay()): 'PAGA'|'ATRASADA'|'PENDENTE' {
 if (pagamentos.reduce((n,p) => n+cents(p.valor),0) >= cents(valor)) return 'PAGA';
 return vencimento.toISOString().slice(0,10) < now.toISOString().slice(0,10) ? 'ATRASADA' : 'PENDENTE';
}
export function nextDue(date: Date, day: number) {
 const y = date.getUTCFullYear(), m = date.getUTCMonth()+1;
 return new Date(Date.UTC(y,m,Math.min(day,new Date(Date.UTC(y,m+1,0)).getUTCDate())));
}
const include = { pagamentos: { orderBy: [{pagoEm:'desc' as const},{id:'asc' as const}] } };
export function present<T extends {valor: unknown; vencimento: Date; pagamentos: {valor: unknown}[]}>(c:T) { return {...c,status:accountStatus(c.valor,c.vencimento,c.pagamentos),saldo: (cents(c.valor)-c.pagamentos.reduce((n,p)=>n+cents(p.valor),0))/100}; }
export async function listAccounts(usuarioId:string, status?:string) {
 const rows = await prisma.conta.findMany({where:{usuarioId},include,orderBy:[{vencimento:'asc'},{id:'asc'}]});
 return rows.map(present).filter(c=>!status || c.status===status);
}
export async function getAccount(usuarioId:string,id:string) {
 const row = await prisma.conta.findFirst({where:{id,usuarioId},include});
 if(!row) throw new AccountError('Conta não encontrada',404);
 return present(row);
}
export async function createAccount(usuarioId:string,input:AccountInput) {
 return prisma.$transaction(async tx => {
  const account = await tx.conta.create({data:{...input,usuarioId,status:accountStatus(input.valor,new Date(input.vencimento),[]),vencimento:new Date(input.vencimento),recorrencia:input.recorrencia??null,diaRecorrencia:new Date(input.vencimento).getUTCDate()},include});
  if (account.tipo === 'RECORRENTE') await extendRecurrence(tx, account);
  return present(account);
 });
}
// All writers lock the same account row. Serializable transactions also prevent
// phantom payments and duplicate monthly successors under concurrent requests.
export async function mutateAccount(usuarioId:string,id:string,input?:AccountInput) {
 return transaction(async tx=> {
  await tx.$queryRaw`SELECT id FROM contas WHERE id = ${id} AND usuario_id = ${usuarioId} FOR UPDATE`;
  const c = await tx.conta.findFirst({where:{id,usuarioId},include});
  if(!c) throw new AccountError('Conta não encontrada',404);
  if(!input) {
   if(c.origemId || await tx.conta.findFirst({where:{origemId:id}})) throw new AccountError('Lançamentos de série iniciada não podem ser excluídos');
   if(c.pagamentos.length) throw new AccountError('Conta com pagamentos não pode ser excluída');
   await tx.conta.delete({where:{id}}); return {message:'Conta excluída'};
  }
  if(c.pagamentos.reduce((n,p)=>n+cents(p.valor),0)>cents(input.valor)) throw new AccountError('Valor inferior aos pagamentos registrados');
  const successor = await tx.conta.findFirst({where:{origemId:id}});
  if((c.origemId || successor) && (input.vencimento!==c.vencimento.toISOString().slice(0,10) || input.tipo!==c.tipo)) throw new AccountError('Vencimento e tipo de uma série iniciada não podem ser alterados');
  const updated = await tx.conta.update({where:{id},data:{...input,status:accountStatus(input.valor,new Date(input.vencimento),c.pagamentos),recorrencia:input.recorrencia??null,vencimento:new Date(input.vencimento),diaRecorrencia:c.origemId?c.diaRecorrencia:new Date(input.vencimento).getUTCDate()},include});
  if(accountStatus(updated.valor,updated.vencimento,updated.pagamentos)==='PAGA' && updated.tipo==='RECORRENTE') throw new AccountError('Edite somente contas recorrentes ainda não quitadas');
  return present(updated);
 },'Serializable');
}
