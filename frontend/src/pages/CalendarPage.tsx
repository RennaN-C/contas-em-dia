import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { accountsApi, currency, displayDate, type Account } from '../features/accounts/accounts.api';
import { todayISO } from '../services/dates';
import { calendarDays, shiftMonth } from '../features/accounts/calendar';
import { categories, categoryLabel } from '../features/accounts/categories';
import { accountStatusLabel } from '../features/accounts/accounts.report';
import { usePreferences } from '../features/auth/PreferencesProvider';
import { Modal } from '../components/Modal';
import { AccountHistory } from '../features/accounts/AccountHistory';
import { PaymentHistory } from '../features/payments/Payments';

export function CalendarPage() {
  const today=todayISO(), {preferences}=usePreferences();
  const [month,setMonth]=useState(today.slice(0,7)),[selected,setSelected]=useState(today),[category,setCategory]=useState('');
  const [accounts,setAccounts]=useState<Account[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[detail,setDetail]=useState<Account>();
  useEffect(()=>{let active=true;setLoading(true);setError('');accountsApi.list().then(result=>{if(active)setAccounts(result.accounts);}).catch(error=>{if(active)setError(error.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[revision]);
  function changeMonth(value:string){if(/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&Number(value.slice(0,4))>=1900&&Number(value.slice(0,4))<=9998){setMonth(value);setSelected(value===today.slice(0,7)?today:`${value}-01`);}}
  const filtered=accounts.filter(row=>!category||(row.categoria??'OUTRAS')===category);
  const groups=new Map<string,Account[]>();
  for(const row of filtered){const key=row.vencimento.slice(0,10);groups.set(key,[...(groups.get(key)??[]),row]);}
  const rows=groups.get(selected)??[];
  const week=preferences.inicioSemana===1?['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']:['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  return <section className="page calendar-page"><span className="eyebrow">CADA COMPROMISSO NO SEU DIA</span><h1 className="page-title">Calendário</h1><p className="page-description">Veja seus vencimentos do mês. Selecione um dia para consultar as contas e seus históricos.</p>
    <div className="calendar-toolbar"><div><button disabled={month==='1900-01'} onClick={()=>changeMonth(shiftMonth(month,-1))} aria-label="Mês anterior">←</button><label>Mês do calendário<input type="month" min="1900-01" max="9998-12" value={month} onChange={event=>changeMonth(event.target.value)}/></label><button disabled={month==='9998-12'} onClick={()=>changeMonth(shiftMonth(month,1))} aria-label="Próximo mês">→</button><button onClick={()=>{setMonth(today.slice(0,7));setSelected(today);}}>Hoje</button></div><label>Categoria<select aria-label="Categoria" value={category} onChange={event=>setCategory(event.target.value)}><option value="">Todas as categorias</option>{categories.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
    {loading?<p role="status">Carregando calendário…</p>:error?<p role="alert">{error} <button onClick={()=>setRevision(value=>value+1)}>Tentar novamente</button></p>:<>
      <div className="calendar-legend"><span className="status-badge paga">Paga</span><span className="status-badge pendente">A vencer</span><span className="status-badge atrasada">Em atraso</span></div>
      <div className="calendar-grid" aria-label="Dias e vencimentos do mês">{week.map(day=><div key={day} className="calendar-weekday">{day}</div>)}{calendarDays(month,preferences.inicioSemana).map(day=>{
        const entries=groups.get(day.key)??[];
        return <button key={day.key} className={`calendar-day${day.current?'':' outside-month'}${day.key===today?' is-today':''}`} disabled={!day.current} aria-pressed={day.key===selected} aria-current={day.key===today?'date':undefined} aria-label={`${displayDate(day.key)}, ${entries.length} conta(s)`} onClick={()=>setSelected(day.key)}>
          <span className="calendar-day-number">{day.day}</span>{entries.length>0&&<><span className="calendar-count">{entries.length} <span>conta(s)</span></span><span className="calendar-markers">{['PAGA','PENDENTE','ATRASADA'].map(status=>{const count=entries.filter(row=>row.status===status).length;return count>0?<span key={status} className={status.toLowerCase()} aria-label={`${count} ${accountStatusLabel(status)}`}>{count}</span>:null;})}</span></>}
        </button>;
      })}</div>
      <section className="panel calendar-selection" aria-live="polite"><h2>Contas de {displayDate(selected)}</h2>{!rows.length?<p>Nenhuma conta neste dia{category?' para a categoria selecionada':''}.</p>:<ul className="calendar-accounts">{rows.map(account=><li key={account.id}><div><strong>{account.descricao}</strong><span>{categoryLabel(account.categoria)} · {account.tipo==='RECORRENTE'?'Mensal':'Avulsa'}</span></div><span className={`status-badge ${account.status.toLowerCase()}`}>{accountStatusLabel(account.status)}</span><strong>{currency(account.saldo)}</strong><button onClick={()=>setDetail(account)} aria-label={`Detalhes de ${account.descricao}`}>Ver detalhes</button></li>)}</ul>}<Link className="text-link" to="/contas">Cadastrar ou gerenciar contas →</Link></section>
    </>}
    {detail&&<Modal title={detail.descricao} onClose={()=>setDetail(undefined)}><dl className="money-breakdown"><div><dt>Valor da conta</dt><dd>{currency(detail.valor)}</dd></div><div><dt>Saldo principal</dt><dd>{currency(detail.saldo)}</dd></div><div><dt>Vencimento</dt><dd>{displayDate(detail.vencimento)}</dd></div><div><dt>Categoria</dt><dd>{categoryLabel(detail.categoria)}</dd></div></dl><PaymentHistory accountId={detail.id}/><AccountHistory accountId={detail.id}/><Link className="button" to="/contas">Gerenciar pagamentos</Link></Modal>}
  </section>;
}
