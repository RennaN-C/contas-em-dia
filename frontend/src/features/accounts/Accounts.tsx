import { useEffect, useState } from 'react';
import { accountsApi, currency, displayDate, type Account } from './accounts.api';
import { AccountForm } from './AccountForm';
import { PaymentForm, PaymentHistory } from '../payments/Payments';
import { Icon } from '../../components/Icon';

export function Accounts() {
  const [rows, setRows] = useState<Account[]>([]), [status, setStatus] = useState(''), [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<Account | null | undefined>(), [paying, setPaying] = useState<Account>(), [history, setHistory] = useState<Account>(), [removing, setRemoving] = useState<Account>(), [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    accountsApi.list(status).then(r => { if (active) setRows(r.accounts); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status, revision]);
  function saved() { setEditing(undefined); setPaying(undefined); setRevision(v => v + 1); }
  async function remove() {
    if (!removing) return; setBusy(true);
    try { await accountsApi.remove(removing.id); setRemoving(undefined); saved(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const visible = rows.filter(c => c.descricao.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const statusLabel = (value: string) => ({ PAGA: 'Paga', PENDENTE: 'A vencer', ATRASADA: 'Em atraso' })[value] ?? value;
  return <section className="page accounts-page">
    <div className="page-heading"><div><span className="eyebrow">TUDO NO SEU CONTROLE</span><h1 className="page-title">Contas</h1><p className="page-description">Organize seus compromissos. Cada vencimento, no seu lugar.</p></div><button className="button" onClick={() => { setEditing(null); setPaying(undefined); }}>Nova conta</button></div>
    <div className="finance-actions account-filters"><label>Buscar conta<input type="search" placeholder="Buscar por descrição…" value={search} onChange={e => setSearch(e.target.value)}/></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todas</option>{['PENDENTE', 'PAGA', 'ATRASADA'].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label></div>
    {editing !== undefined && <AccountForm key={editing?.id ?? 'new'} account={editing ?? undefined} onSaved={saved} onCancel={() => setEditing(undefined)}/>}
    {paying && <PaymentForm key={paying.id} account={paying} onSaved={saved} onCancel={() => setPaying(undefined)}/>}
    {error && <p role="alert">{error} <button onClick={() => setRevision(v => v + 1)}>Tentar novamente</button></p>}
    {removing && <section role="alertdialog" aria-labelledby="delete-title" className="finance-card"><h2 id="delete-title">Excluir {removing.descricao}?</h2><p>Esta ação remove a conta e seus avisos. Contas com pagamentos são preservadas.</p><button autoFocus disabled={busy} onClick={remove}>Confirmar exclusão</button><button disabled={busy} onClick={() => setRemoving(undefined)}>Cancelar</button></section>}
    {loading ? <p role="status">Carregando contas…</p> : !error && visible.length === 0 ? <div className="empty-state"><Icon name="wallet"/><h2>Nenhuma conta encontrada.</h2><p>{search ? 'Tente outra descrição ou ajuste os filtros.' : 'Adicione sua primeira conta e comece a organizar seus vencimentos.'}</p></div> : <ul className="finance-list accounts-grid">{visible.map(c => <li className="finance-card account-card" key={c.id}>
      <div className="account-topline"><span className={`account-symbol ${c.status === 'ATRASADA' ? 'is-late' : ''}`}><Icon name={c.tipo === 'RECORRENTE' ? 'clock' : 'wallet'}/></span><span className={`status-badge ${c.status.toLowerCase()}`}>{statusLabel(c.status)}</span></div>
      <h2>{c.descricao}</h2><p>Vencimento: {displayDate(c.vencimento)} · {c.tipo === 'RECORRENTE' ? 'Mensal' : 'Avulsa'}</p><strong className="account-value">{currency(c.saldo)}</strong><p>Saldo pendente · Valor da conta: {currency(c.valor)}</p>
      <div className="finance-actions">{c.saldo > 0 && <button onClick={() => { setPaying(c); setEditing(undefined); }}>Pagar {c.descricao}</button>}<button onClick={() => { setEditing(c); setPaying(undefined); }}>Editar {c.descricao}</button><button onClick={() => setHistory(c)}>Histórico de {c.descricao}</button><button onClick={() => setRemoving(c)}>Excluir {c.descricao}</button></div>
    </li>)}</ul>}
    {history && <><h2>{history.descricao}</h2><PaymentHistory accountId={history.id} revision={revision}/><button onClick={() => setHistory(undefined)}>Fechar histórico</button></>}
  </section>;
}
