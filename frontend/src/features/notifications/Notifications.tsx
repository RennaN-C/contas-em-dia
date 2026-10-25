import { useEffect, useState } from 'react';
import { currency, displayDate } from '../accounts/accounts.api';
import { Messages } from '../messages/Messages';
import { notificationsApi, type Summary, type Estimate } from './notifications.api';

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
  return <section className="finance-card" aria-labelledby="summary-title"><h2 id="summary-title">Próximos 7 dias</h2>
    {loading ? <p role="status">Carregando resumo…</p> : error ? <p role="alert">{error} <button onClick={() => setRevision(v => v + 1)}>Recarregar resumo</button></p> : data && <>
      <p>A partir de {displayDate(data.inicio)} · Saldo total: <strong>{currency(data.total)}</strong></p>
      {data.accounts.length === 0 ? <p>Nenhuma conta a vencer nos próximos 7 dias.</p> : <ul>{data.accounts.map(c => <li key={c.id}>{c.descricao} · {currency(c.saldo)} · Vencimento: {displayDate(c.vencimento)}</li>)}</ul>}
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
        {r.status === 'disponivel' ? <p>Selic: {r.taxaAnual.toLocaleString('pt-BR')}% ao ano · Juros estimados: {currency(r.juros)} · Total estimado: <strong>{currency(r.valorEstimado)}</strong></p> : <p>Estimativa indisponível enquanto não for possível consultar a Selic.</p>}
      </li>)}</ul>
    </>}
  </section>;
}
export function Notifications() {
  return <div className="page notifications-page"><h1 className="page-title">Avisos</h1><p className="page-description">Acompanhe vencimentos, mensagens e estimativas de atraso.</p><WeeklySummary/><Messages/><InterestEstimates/></div>;
}
