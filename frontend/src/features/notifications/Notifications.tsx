import { useEffect, useState } from 'react';
import { currency, displayDate } from '../accounts/accounts.api';
import { Messages } from '../messages/Messages';
import { notificationsApi, type Summary, type Estimate } from './notifications.api';
import {Link} from 'react-router';
import {Icon} from '../../components/Icon';
import {displayTimestamp} from '../../services/dates';

function WeeklySummary() {
  const [data, setData] = useState<Summary>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    notificationsApi.summary().then(r => { if (active) setData(r.summary); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  return <section className="finance-card weekly-overview" aria-labelledby="summary-title"><div className="section-heading"><div><span className="eyebrow">PREVISÃO DA SEMANA</span><h2 id="summary-title">Próximos 7 dias</h2></div><Link className="text-link" to="/contas">Ver contas<Icon name="arrow"/></Link></div>
    {loading ? <p role="status">Carregando resumo…</p> : error ? <p role="alert">{error} <button onClick={() => setRevision(v => v + 1)}>Recarregar resumo</button></p> : data && <>
      <div className="weekly-total"><strong>{currency(data.total)}</strong><span>{data.accounts.length} conta(s) a partir de {displayDate(data.inicio)}</span></div>
      {data.accounts.length === 0 ? <p>Nenhuma conta a vencer nos próximos 7 dias.</p> : <ul className="upcoming-list">{data.accounts.map(c => <li key={c.id}><span className="account-symbol"><Icon name="clock"/></span><div><strong>{c.descricao}</strong><span>Vencimento: {displayDate(c.vencimento)}</span></div><strong>{currency(c.saldo)}</strong></li>)}</ul>}
    </>}
  </section>;
}
function InterestEstimates() {
  const [rows, setRows] = useState<Estimate[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    notificationsApi.interest().then(r => { if (active) setRows(r.estimates); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  return <section aria-labelledby="interest-title"><h2 id="interest-title">Juros estimados de atraso</h2>
    <p>Simulação demonstrativa sobre o saldo pendente, com Selic anual atual e juros simples proporcionais aos dias de atraso (base de 365 dias). Não é cobrança contratual.</p>
    {loading ? <p role="status">Consultando estimativas…</p> : error ? <p role="alert">{error} <button onClick={() => setRevision(v => v + 1)}>Recarregar estimativas</button></p> : rows.length === 0 ? <p>Nenhuma conta atrasada com saldo pendente.</p> : <>
      {rows.some(r => r.status === 'indisponivel') && <p role="status">Selic indisponível. <button onClick={() => setRevision(v => v + 1)}>Consultar taxa novamente</button></p>}
      <ul className="finance-list">{rows.map(r => <li className="finance-card" key={r.conta.id}><h3>{r.conta.descricao}</h3><p>Vencimento: {displayDate(r.conta.vencimento)} · {r.dias} dia(s) de atraso · Saldo: {currency(r.saldo)}</p>
        {r.status === 'disponivel' ? <><p>Selic: {r.taxaAnual.toLocaleString('pt-BR')}% ao ano · Juros estimados: {currency(r.juros)} · Total estimado: <strong>{currency(r.valorEstimado)}</strong></p>{r.fonte && <p className="rate-source">Fonte: {r.fonte}{r.emCache ? ' · Em cache' : ''}{r.consultadaEm ? ` · Consultada em ${displayTimestamp(r.consultadaEm)}` : ''}</p>}{r.desatualizada && <p role="status" className="rate-warning">Última taxa conhecida, ainda sem confirmação de atualização. Considere a data de consulta nesta simulação.</p>}</> : <p>Estimativa indisponível enquanto não for possível consultar a Selic.</p>}
      </li>)}</ul>
    </>}
  </section>;
}
export function Notifications() {
  const [revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),[error,setError]=useState('');
  async function refresh() { setBusy(true); setError(''); try { await notificationsApi.refresh(); setFeedback('Avisos e previsões atualizados.'); setRevision(v=>v+1); window.dispatchEvent(new Event('saldo:messages-changed')); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <div className="page notifications-page"><div className="page-heading"><div><span className="eyebrow">SEMPRE UM PASSO À FRENTE</span><h1 className="page-title">Avisos</h1><p className="page-description">Vencimentos pelo calendário de Brasília. Acompanhe mensagens e estimativas de atraso.</p></div><button className="button" disabled={busy} onClick={refresh}>{busy?'Atualizando…':'Atualizar avisos'}</button></div>{feedback&&<p role="status" className="feedback-success">{feedback}</p>}{error&&<p role="alert">{error}</p>}<WeeklySummary key={`summary-${revision}`}/><Messages key={`messages-${revision}`}/><InterestEstimates key={`interest-${revision}`}/></div>;
}
