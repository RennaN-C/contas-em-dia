import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { accountsApi, currency, displayDate, type Account } from './accounts.api';
import { financialOverview } from './overview';
import { api } from '../../services/api';
import type { Payment } from '../payments/Payments';
import { Icon } from '../../components/Icon';

export function FinancialOverview() {
  const [data, setData] = useState<{ accounts: Account[]; payments: Payment[] }>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; setError(''); setData(undefined);
    Promise.all([accountsApi.list(), api<{ payments: Payment[] }>('/payments')])
      .then(([a, p]) => {
        if (!Array.isArray(a.accounts) || !Array.isArray(p.payments)) throw new Error('Não foi possível carregar os dados financeiros');
        if (active) setData({ accounts: a.accounts, payments: p.payments });
      })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [revision]);
  if (error) return <div className="alert alert-error" role="alert">{error} <button onClick={() => setRevision(v => v + 1)}>Tentar novamente</button></div>;
  if (!data) return <div className="dashboard-loading" role="status"><span className="loading-orbit"/>Preparando seu panorama financeiro…</div>;
  const view = financialOverview(data.accounts, data.payments);
  const max = Math.max(1, ...view.months.flatMap(m => [m.contas, m.pagamentos]));
  const total = view.balance + view.paid;
  const paidShare = total ? view.paid / total * 100 : 0;
  const paidPercentage = Math.round(paidShare);
  const pendingPercentage = total ? (view.balance - view.late) / total * 100 : 0;
  return <>
    <div className="stats-grid">
      <article className="stat-card stat-featured"><div className="stat-label">Saldo a pagar<Icon name="wallet"/></div><strong>{currency(view.balance)}</strong><span>{view.pending.length} conta(s) com saldo pendente</span></article>
      <article className="stat-card"><div className="stat-label">Total pago<Icon name="check"/></div><strong>{currency(view.paid)}</strong><span>Pagamentos registrados no histórico</span></article>
      <article className="stat-card"><div className="stat-label">Em atraso<Icon name="clock"/></div><strong className={view.late ? 'text-danger' : ''}>{currency(view.late)}</strong><span>{view.overdue.length} conta(s) precisam de atenção</span></article>
    </div>
    <div className="dashboard-charts">
      <section className="panel chart-panel" aria-labelledby="cashflow-title"><div className="section-heading"><div><span className="eyebrow">SEU HISTÓRICO</span><h2 id="cashflow-title">Compromissos e pagamentos</h2></div><span className="period-pill">Últimos 6 meses</span></div>
        <div className="chart-legend"><span><i className="legend-dot commitment"/>Contas por vencimento</span><span><i className="legend-dot paid"/>Pagamentos realizados</span></div>
        <svg viewBox="0 0 600 220" className="cashflow-chart" role="img" aria-labelledby="cashflow-description"><title id="cashflow-description">Contas e pagamentos nos últimos seis meses. Valores exatos disponíveis na tabela abaixo.</title>
          {[0, 1, 2, 3].map(n => <g key={n}><line x1="60" x2="590" y1={20 + n * 52} y2={20 + n * 52} stroke="#e5eceb" strokeDasharray="4 5"/><text x="50" y={24 + n * 52} textAnchor="end" fill="#647672" fontSize="10">{new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(max * (3 - n) / 3)}</text></g>)}
          {view.months.map((m, i) => <g key={m.key}><rect x={80 + i * 85} y={176 - m.contas / max * 156} width="22" height={m.contas / max * 156} rx="5" fill="#d3e7df"/><rect x={106 + i * 85} y={176 - m.pagamentos / max * 156} width="22" height={m.pagamentos / max * 156} rx="5" fill="#178263"/><text x={104 + i * 85} y="205" textAnchor="middle" fill="#5f726d" fontSize="12">{m.label}</text></g>)}
        </svg>
        <details className="chart-data"><summary>Consultar valores do gráfico</summary><div className="table-scroll"><table><caption>Valores mensais em reais</caption><thead><tr><th scope="col">Mês</th><th scope="col">Contas</th><th scope="col">Pagamentos</th></tr></thead><tbody>{view.months.map(m => <tr key={m.key}><th scope="row">{m.key}</th><td>{currency(m.contas)}</td><td>{currency(m.pagamentos)}</td></tr>)}</tbody></table></div></details>
      </section>
      <section className="panel distribution-panel" aria-labelledby="distribution-title"><span className="eyebrow">VISÃO GERAL</span><h2 id="distribution-title">Cada valor no seu lugar</h2><div className="donut" role="img" aria-label={`${paidPercentage}% pagos; ${currency(view.balance)} pendentes, dos quais ${currency(view.late)} em atraso`} style={{ background: total ? `conic-gradient(#178263 0% ${paidShare}%, #d3e7df ${paidShare}% ${paidShare + pendingPercentage}%, #dd875e ${paidShare + pendingPercentage}% 100%)` : '#e7eeeb' }}><div><strong>{paidPercentage}%</strong><span>pagos</span></div></div>
        <ul className="distribution-legend"><li><span><i className="legend-dot paid"/>Pago</span><strong>{currency(view.paid)}</strong></li><li><span><i className="legend-dot commitment"/>A vencer</span><strong>{currency(view.balance - view.late)}</strong></li><li><span><i className="legend-dot late"/>Em atraso</span><strong>{currency(view.late)}</strong></li></ul>
      </section>
    </div>
    <section className="panel upcoming-panel" aria-labelledby="upcoming-title"><div className="section-heading"><div><span className="eyebrow">NO SEU RADAR</span><h2 id="upcoming-title">Contas para acompanhar</h2></div><Link className="text-link" to="/contas">Ver todas<Icon name="arrow"/></Link></div>
      {view.upcoming.length ? <ul className="upcoming-list">{view.upcoming.map(c => <li key={c.id}><span className={`account-symbol ${c.status === 'ATRASADA' ? 'is-late' : ''}`}><Icon name={c.status === 'ATRASADA' ? 'clock' : 'wallet'}/></span><div><strong>{c.descricao}</strong><span>Vence em {displayDate(c.vencimento)}</span></div><span className={`status-badge ${c.status.toLowerCase()}`}>{c.status === 'ATRASADA' ? 'Em atraso' : 'A vencer'}</span><strong>{currency(c.saldo)}</strong></li>)}</ul> : <div className="empty-state"><Icon name="wallet"/><h3>Seu próximo passo começa aqui</h3><p>Cadastre uma conta para acompanhar vencimentos e ver seus gráficos ganharem vida.</p><Link className="button" to="/contas">Cadastrar minha primeira conta<Icon name="arrow"/></Link></div>}
    </section>
  </>;
}
