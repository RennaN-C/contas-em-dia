import { useState, type FormEvent } from 'react';
import { accountsApi, type Account } from './accounts.api';
import { ApiError } from '../../services/api';
export function AccountForm({account,onSaved,onCancel}:{account?:Account;onSaved:()=>void;onCancel:()=>void}) {
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [tipo,setTipo]=useState(account?.tipo??'AVULSA');
 async function submit(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();const d=new FormData(e.currentTarget);setBusy(true);setError('');
  try {await accountsApi.save({descricao:String(d.get('descricao')),valor:Number(d.get('valor')),vencimento:String(d.get('vencimento')),tipo,recorrencia:tipo==='RECORRENTE'?'MENSAL':null},account?.id);onSaved();}
  catch(e){setError(e instanceof ApiError? [e.message,...e.issues.map(i=>`${i.path}: ${i.message}`)].join(' — '):'Não foi possível salvar');}finally{setBusy(false);}
 }
 return <form className="form finance-card" onSubmit={submit}><h2>{account?'Editar conta':'Nova conta'}</h2>{error&&<p role="alert">{error}</p>}<label>Descrição<input name="descricao" required maxLength={200} defaultValue={account?.descricao}/></label><label>Valor<input name="valor" type="number" required min="0.01" max="9999999999.99" step="0.01" defaultValue={account?.valor}/></label><label>Vencimento<input name="vencimento" type="date" required defaultValue={account?.vencimento.slice(0,10)}/></label><label>Tipo<select value={tipo} onChange={e=>setTipo(e.target.value as typeof tipo)}><option value="AVULSA">Avulsa</option><option value="RECORRENTE">Recorrente</option></select></label>{tipo==='RECORRENTE'&&<label>Recorrência<select aria-label="Recorrência"><option>Mensal</option></select></label>}<div className="finance-actions"><button disabled={busy} type="submit">{busy?'Salvando…':'Salvar'}</button><button disabled={busy} type="button" onClick={onCancel}>Cancelar</button></div></form>;
}
