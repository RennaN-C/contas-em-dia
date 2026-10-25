import { useEffect, useState } from 'react';
import { accountsApi, currency, displayDate, type Account } from './accounts.api';
import { AccountForm } from './AccountForm';
import { PaymentForm, PaymentHistory } from '../payments/Payments';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import { notificationsApi,type Estimate } from '../notifications/notifications.api';
import { InterestPreview } from '../notifications/InterestPreview';
import { usePreferences } from '../auth/PreferencesProvider';

type DialogState={kind:'create'}|{kind:'edit'|'pay'|'history'|'delete';account:Account};
export function Accounts() {
  const [rows,setRows]=useState<Account[]>([]),[status,setStatus]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const [dialog,setDialog]=useState<DialogState>(),[busy,setBusy]=useState(false),[modalBusy,setModalBusy]=useState(false),[modalError,setModalError]=useState('');
  const [search,setSearch]=useState(''),[feedback,setFeedback]=useState('');
  const [estimates,setEstimates]=useState<Estimate[]>([]),[interestLoading,setInterestLoading]=useState(true),[interestError,setInterestError]=useState(''),[interestRetry,setInterestRetry]=useState(0);
  const {preferences}=usePreferences();
  useEffect(()=>{let active=true;setLoading(true);setError('');accountsApi.list(status).then(r=>{if(active)setRows(r.accounts);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[status,revision]);
  useEffect(()=>{let active=true;setInterestLoading(true);setInterestError('');notificationsApi.interest().then(r=>{if(!Array.isArray(r.estimates))throw new Error('Não foi possível consultar os juros.');if(active)setEstimates(r.estimates);}).catch(e=>{if(active){setEstimates([]);setInterestError(e.message);}}).finally(()=>{if(active)setInterestLoading(false);});return()=>{active=false;};},[revision,interestRetry]);
  function open(value:DialogState){setModalError('');setDialog(value);}
  function close(){if(!modalBusy){setDialog(undefined);setModalError('');}}
  function saved(){setDialog(undefined);setFeedback('Conta salva com sucesso.');setRevision(v=>v+1);}
  async function toggleRecurrence(account:Account){setBusy(true);setError('');try{await accountsApi.recurrence(account.id,account.recorrenciaAtiva===false);setFeedback(account.recorrenciaAtiva===false?'Recorrência retomada. Atualize as previsões para gerar as próximas mensalidades.':'Recorrência pausada. As contas já previstas e os pagamentos foram preservados.');setRevision(v=>v+1);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function sync(){setBusy(true);setError('');try{const result=await accountsApi.sync();setFeedback(`${result.created} nova(s) mensalidade(s) prevista(s).`);setRevision(v=>v+1);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function remove(){if(dialog?.kind!=='delete')return;setModalBusy(true);try{await accountsApi.remove(dialog.account.id);setDialog(undefined);setFeedback('Conta excluída.');setRevision(v=>v+1);}catch(e){setModalError((e as Error).message);}finally{setModalBusy(false);}}
  const visible=rows.filter(c=>c.descricao.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).sort((a,b)=>preferences.ordenacaoContas==='valor'?b.saldo-a.saldo:preferences.ordenacaoContas==='descricao'?a.descricao.localeCompare(b.descricao,'pt-BR'):a.vencimento.localeCompare(b.vencimento));
  const label=(value:string)=>({PAGA:'Paga',PENDENTE:'A vencer',ATRASADA:'Em atraso'})[value]??value;
  const estimateFor=(id:string)=>estimates.find(e=>e.conta.id===id);
  return <section className="page accounts-page">
    <div className="page-heading"><div><span className="eyebrow">TUDO NO SEU CONTROLE</span><h1 className="page-title">Contas</h1><p className="page-description">Saldo, vencimentos e juros de atraso à vista. Registre seus pagamentos com clareza.</p></div><button className="button" onClick={()=>open({kind:'create'})}>Nova conta</button></div>
    <div className="account-toolbar"><label>Buscar conta<input type="search" placeholder="Buscar por descrição…" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Status<select aria-label="Status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todas</option>{['PENDENTE','PAGA','ATRASADA'].map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label><button disabled={busy} onClick={sync}><Icon name="clock"/>Atualizar previsões</button></div>
    {feedback&&<p className="feedback-success" role="status">{feedback}</p>}{error&&<p role="alert">{error} <button onClick={()=>setRevision(v=>v+1)}>Tentar novamente</button></p>}
    {loading?<p role="status">Carregando contas…</p>:!error&&visible.length===0?<div className="empty-state"><Icon name="wallet"/><h2>Nenhuma conta encontrada.</h2><p>{search?'Tente outra descrição ou ajuste os filtros.':'Adicione sua primeira conta e comece a organizar seus vencimentos.'}</p></div>:<ul className="finance-list accounts-grid">{visible.map(c=><li className="finance-card account-card" key={c.id}>
      <div className="account-topline"><span className={`account-symbol ${c.status==='ATRASADA'?'is-late':''}`}><Icon name={c.tipo==='RECORRENTE'?'clock':'wallet'}/></span><span className={`status-badge ${c.status.toLowerCase()}`}>{label(c.status)}</span></div>
      <h2>{c.descricao}</h2><p>Vencimento: {displayDate(c.vencimento)} · {c.tipo==='RECORRENTE'?`Mensal${c.recorrenciaAtiva===false?' · Pausada':''}`:'Avulsa'}</p><strong className="account-value">{currency(c.saldo)}</strong><p>Saldo principal · Valor da conta: {currency(c.valor)}</p>
      {c.status==='ATRASADA'&&c.saldo>0&&<InterestPreview compact estimate={estimateFor(c.id)} loading={interestLoading} error={interestError} onRetry={()=>setInterestRetry(v=>v+1)}/>}
      <div className="account-actions"><div className="account-primary-actions"><button className="button" disabled={c.saldo<=0} aria-label={`Pagar ${c.descricao}`} onClick={()=>open({kind:'pay',account:c})}><Icon name={c.saldo>0?'payment':'check'}/>{c.saldo>0?'Pagar':'Quitada'}</button><button aria-label={`Editar ${c.descricao}`} onClick={()=>open({kind:'edit',account:c})}>Editar</button><button aria-label={`Histórico de ${c.descricao}`} onClick={()=>open({kind:'history',account:c})}>Pagamentos</button></div><div className="account-secondary-actions">{c.tipo==='RECORRENTE'&&<button disabled={busy} onClick={()=>toggleRecurrence(c)} aria-label={`${c.recorrenciaAtiva===false?'Retomar':'Pausar'} recorrência de ${c.descricao}`}>{c.recorrenciaAtiva===false?'Retomar série':'Pausar série'}</button>}<button className="danger-button" aria-label={`Excluir ${c.descricao}`} onClick={()=>open({kind:'delete',account:c})}>Excluir</button></div></div>
    </li>)}</ul>}
    {dialog&&<Modal title={dialog.kind==='create'?'Nova conta':dialog.kind==='edit'?'Editar conta':dialog.kind==='pay'?'Registrar pagamento':dialog.kind==='history'?'Pagamentos da conta':`Excluir ${dialog.account.descricao}?`} onClose={close} busy={modalBusy} role={dialog.kind==='delete'?'alertdialog':'dialog'}>
      {(dialog.kind==='create'||dialog.kind==='edit')&&<AccountForm account={dialog.kind==='edit'?dialog.account:undefined} onSaved={saved} onCancel={close} onBusyChange={setModalBusy} showHeading={false}/>}
      {dialog.kind==='pay'&&<PaymentForm account={dialog.account} estimate={estimateFor(dialog.account.id)} interestLoading={interestLoading} interestError={interestError} onRefreshInterest={()=>setInterestRetry(v=>v+1)} confirmPayment={preferences.confirmarPagamento} onBusyChange={setModalBusy} onSaved={()=>{setRevision(v=>v+1);setFeedback('Pagamento registrado com sucesso.');}} onCancel={close} onViewHistory={()=>open({kind:'history',account:dialog.account})}/>}
      {dialog.kind==='history'&&<><p className="modal-account-name">{dialog.account.descricao}</p><PaymentHistory accountId={dialog.account.id} revision={revision}/></>}
      {dialog.kind==='delete'&&<><p>Esta ação remove a conta e seus avisos. Contas com pagamentos ou competências vinculadas são preservadas.</p>{modalError&&<p role="alert">{modalError}</p>}<div className="form-actions"><button disabled={modalBusy} className="danger-button" onClick={remove}>Confirmar exclusão</button><button disabled={modalBusy} onClick={close}>Cancelar</button></div></>}
    </Modal>}
  </section>;
}
