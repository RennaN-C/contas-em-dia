import { api } from '../../services/api';
export type Account = {id:string;descricao:string;valor:string;vencimento:string;tipo:'AVULSA'|'RECORRENTE';recorrencia:string|null;status:string;saldo:number};
export type AccountInput = {descricao:string;valor:number;vencimento:string;tipo:'AVULSA'|'RECORRENTE';recorrencia:'MENSAL'|null};
export const accountsApi = {
 list:(status='')=>api<{accounts:Account[]}>(`/accounts${status?`?status=${status}`:''}`),
 save:(data:AccountInput,id?:string)=>api(`/accounts${id?`/${id}`:''}`,{method:id?'PUT':'POST',body:JSON.stringify(data)}),
 remove:(id:string)=>api(`/accounts/${id}`,{method:'DELETE'})
};
export const currency=(v:string|number)=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const displayDate=(v:string)=>v.slice(0,10).split('-').reverse().join('/');
