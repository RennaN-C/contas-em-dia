import { useEffect, useState } from 'react';
import { api } from '../../services/api';

type Connection = { configured: boolean; ativo: boolean; pendente: boolean; expiraEm: string | null; erro: string | null };
export function DiscordConnection() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [invitation, setInvitation] = useState<{ codigo: string; expiraEm: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void api<Connection>('/integrations/discord', { signal: controller.signal }).then(setConnection).catch(() => { if (!controller.signal.aborted) setError('Não foi possível consultar o Discord. Tente atualizar.'); });
    return () => controller.abort();
  }, []);
  async function perform(action: 'status' | 'invite' | 'revoke') {
    setBusy(true); setError(''); setFeedback('');
    try {
      if (action === 'invite') {
        const result = await api<{ codigo: string; expiraEm: string }>('/integrations/discord/invite', { method: 'POST' });
        setInvitation(result);
      }
      if (action === 'revoke') {
        await api('/integrations/discord', { method: 'DELETE' });
        setInvitation(null); setFeedback('Discord desconectado. Os avisos no Saldo+ continuam disponíveis.');
      }
      const status = await api<Connection>('/integrations/discord');
      setConnection(status);
      if (status.ativo) { setInvitation(null); setFeedback('Discord conectado com sucesso!'); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível atualizar o Discord.'); }
    finally { setBusy(false); }
  }
  return <section className="panel profile-panel" aria-labelledby="discord-title" aria-busy={busy}>
    <h2 id="discord-title">Discord</h2>
    <p>Autorize o SaldoPlusBot a enviar lembretes de vencimento e resumos por mensagem direta. Você pode desconectar quando quiser.</p>
    <p role="status">{connection ? !connection.configured ? 'Integração ainda não configurada pela equipe.' : connection.ativo ? 'Discord conectado.' : connection.pendente ? 'Vínculo pendente. Use o código no servidor privado do projeto.' : 'Discord desconectado.' : 'Consultando conexão…'}</p>
    {connection?.erro && <p role="alert">{connection.erro}</p>}
    {error && <p role="alert">{error}</p>}
    {feedback && <p role="status" className="feedback-success">{feedback}</p>}
    {invitation && connection?.pendente && <div>
      <p>No servidor Discord do projeto, use:</p>
      <pre><code>/vincular codigo:{invitation.codigo}</code></pre>
      <p>Expira às {new Date(invitation.expiraEm).toLocaleTimeString('pt-BR')}. Uso único. Não compartilhe este código.</p>
      <p>Depois de executar o comando, clique em Atualizar conexão.</p>
    </div>}
    {connection?.pendente && !invitation && <p>O código fica visível apenas quando gerado. Gere outro se precisar.</p>}
    <div className="form-actions">
      {connection?.configured && !connection.ativo && <button className="button" disabled={busy} onClick={() => void perform('invite')}>{connection.pendente ? 'Gerar novo código' : 'Conectar Discord'}</button>}
      {(connection?.ativo || connection?.pendente || connection?.erro) && <button disabled={busy} onClick={() => void perform('revoke')}>Desconectar Discord</button>}
      <button disabled={busy} onClick={() => void perform('status')}>{busy ? 'Aguarde…' : 'Atualizar conexão'}</button>
    </div>
    <p className="field-hint">Permita mensagens diretas dos membros do servidor. Se as DMs estiverem bloqueadas, o aviso ficará registrado como falha. Confirmar recebimento no Discord não registra pagamento.</p>
  </section>;
}
