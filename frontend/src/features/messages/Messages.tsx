import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { displayDate } from '../accounts/accounts.api';
import { messagesApi, type Message } from './messages.api';

export function Messages() {
  const [rows, setRows] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [readError, setReadError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState<string[]>([]);
  const [filter, setFilter] = useState('all');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    messagesApi.list().then(r => { if (active) setRows(r.messages); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  async function read(id: string) {
    setBusy(ids => [...ids, id]); setReadError(''); setFeedback('');
    try {
      const result = await messagesApi.read(id);
      setRows(items => items.map(m => m.id === id ? result.message : m));
      setFeedback('Mensagem marcada como lida.');
    } catch (e) { setReadError((e as Error).message); }
    finally { setBusy(ids => ids.filter(item => item !== id)); }
  }
  const visible = rows.filter(m => filter === 'all' || (filter === 'unread' ? !m.lida : m.lida));
  return <section aria-labelledby="messages-title">
    <h2 id="messages-title">Mensagens e avisos</h2>
    <div className="finance-actions"><label>Exibir mensagens<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todas</option><option value="unread">Não lidas</option><option value="read">Lidas</option></select></label></div>
    <p role="status" aria-live="polite">{feedback}</p>
    {readError && <p role="alert">{readError} Tente marcar a mensagem novamente.</p>}
    {loading ? <p role="status">Carregando mensagens…</p> : error ? <p role="alert">{error} <button onClick={() => setRevision(v => v + 1)}>Tentar novamente</button></p> : visible.length === 0 ? <p>Nenhuma mensagem encontrada.</p> :
      <ul className="finance-list">{visible.map(m => <li className={`finance-card message-card${m.lida ? '' : ' message-unread'}`} key={m.id}>
        <span className="message-state">{m.lida ? 'Lida' : 'Não lida'} · {m.tipo === 'RESUMO_SEMANAL' ? 'Resumo semanal' : 'Aviso'}</span>
        <h3>{m.titulo}</h3><p className="message-content">{m.conteudo}</p>
        <p><time dateTime={m.criadoEm}>{displayDate(m.criadoEm)}</time>{m.conta && <> · Conta: <Link to="/contas">{m.conta.descricao}</Link> · Vencimento: {displayDate(m.conta.vencimento)}</>}</p>
        {!m.lida && <button disabled={busy.includes(m.id)} onClick={() => read(m.id)} aria-label={`Marcar como lida: ${m.titulo}`}>{busy.includes(m.id) ? 'Salvando…' : 'Marcar como lida'}</button>}
      </li>)}</ul>}
  </section>;
}
