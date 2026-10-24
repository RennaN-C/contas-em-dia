import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../services/api';
import { currency, displayDate, type Account } from '../accounts/accounts.api';
export type Payment={id:string;valor:string;pagoEm:string;conta:{id:string;descricao:string}};
export function PaymentHistory({accountId,revision=0}:{accountId?:string;revision?:number}) {
 const [rows,setRows]=useState<Payment[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');api<{payments:Payment[]}>(`/payments${accountId?`?contaId=${accountId}`:''}`).then(r=>{if(active)setRows(r.payments);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[accountId,revision,retry]);
 return <section aria-label="Histórico de pagamentos"><h2>Histórico de pagamentos</h2>{loading?<p role="status">Carregando pagamentos…</p>:error?<p role="alert">{error} <button onClick={()=>setRetry(v=>v+1)}>Tentar novamente</button></p>:rows.length===0?<p>Nenhum pagamento registrado.</p>:<ul className="finance-list">{rows.map(p=><li key={p.id}>{p.conta.descricao} — {currency(p.valor)} — {displayDate(p.pagoEm)}</li>)}</ul>}</section>;
}
export function PaymentForm({account,onSaved,onCancel}:{account:Account;onSaved:()=>void;onCancel:()=>void}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[key,setKey]=useState(()=>crypto.randomUUID());
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);setBusy(true);setError('');try{await api(`/accounts/${account.id}/payments`,{method:'POST',body:JSON.stringify({valor:Number(d.get('valor')),pagoEm:d.get('pagoEm'),chave:key})});onSaved();}catch(e){setError(e instanceof ApiError?[e.message,...e.issues.map(i=>i.message)].join(' — '):'Erro ao pagar');}finally{setBusy(false);}}
 return <form className="form finance-card" onSubmit={submit} onChange={()=>setKey(crypto.randomUUID())}><h2>Pagar {account.descricao}</h2><p>Saldo: {currency(account.saldo)}</p>{error&&<p role="alert">{error}</p>}<label>Valor do pagamento<input name="valor" type="number" min="0.01" step="0.01" max={account.saldo} required defaultValue={account.saldo}/></label><label>Data do pagamento<input name="pagoEm" type="date" required max={new Date().toISOString().slice(0,10)} defaultValue={new Date().toISOString().slice(0,10)}/></label><div className="finance-actions"><button disabled={busy}>{busy?'Registrando…':'Registrar pagamento'}</button><button type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div></form>;
}
