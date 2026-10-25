import { useAuth } from '../features/auth/useAuth';
import { Icon } from '../components/Icon';
import { useState, type FormEvent } from 'react';
import { updateCurrentUser } from '../features/auth/auth.service';
import { loadSession } from '../features/auth/session';
import { ApiError } from '../services/api';
import {Modal} from '../components/Modal';
import {Link} from 'react-router';
import {displayDate} from '../features/accounts/accounts.api';

export function ProfilePage() {
  const { user,login } = useAuth();
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[feedback,setFeedback]=useState(''),[editing,setEditing]=useState(false);
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data=new FormData(event.currentTarget); setBusy(true);setError('');setFeedback('');
    try { const updated=await updateCurrentUser({nome:String(data.get('nome')).trim(),email:String(data.get('email')).trim()});const session=loadSession();if(session)login({...session,user:updated});setFeedback('Perfil atualizado com sucesso.');setEditing(false); }
    catch(e){setError(e instanceof ApiError?[e.message,...e.issues.map(i=>i.message)].join(' · '):(e as Error).message);}finally{setBusy(false);}
  }
  return (
    <section className="page"><span className="eyebrow">SEU ESPAÇO</span><h1 className="page-title">Perfil</h1><p className="page-description">Seus dados pessoais e atalhos para cuidar da sua vida financeira.</p>{feedback&&<p role="status" className="feedback-success">{feedback}</p>}<div className="profile-grid"><aside className="panel profile-identity"><span className="profile-avatar" aria-hidden="true">{user?.nome.charAt(0).toUpperCase()}</span><h2>{user?.nome}</h2><p>{user?.email}</p>{user?.criadoEm&&<p>Membro desde {displayDate(user.criadoEm)}</p>}<button className="button" onClick={()=>{setError('');setEditing(true);}}>Editar perfil</button></aside><div className="profile-details"><section className="panel profile-panel"><h2>Informações da conta</h2><dl><dt>Nome</dt><dd>{user?.nome}</dd><dt>E-mail de acesso</dt><dd>{user?.email}</dd></dl><p>Suas contas, pagamentos e mensagens são acessíveis somente pelo seu usuário autenticado.</p></section><section className="panel"><h2>Preferências e cuidados</h2><p>Ajuste a ordenação das contas, a confirmação de pagamentos e as animações.</p><Link className="text-link" to="/configuracoes">Abrir configurações<Icon name="arrow"/></Link><p className="field-hint">Ao usar um computador compartilhado, encerre sua sessão pelo botão Sair.</p></section></div></div>{editing&&<Modal title="Editar perfil" onClose={()=>{if(!busy)setEditing(false);}} busy={busy}><form className="form" onSubmit={save}>{error&&<p role="alert">{error}</p>}<label>Nome<input name="nome" required minLength={2} maxLength={100} autoComplete="name" defaultValue={user?.nome} autoFocus/></label><label>E-mail<input name="email" type="email" required autoComplete="email" defaultValue={user?.email}/></label><div className="form-actions"><button className="button" disabled={busy}>{busy?'Salvando…':'Salvar perfil'}</button><button type="button" disabled={busy} onClick={()=>setEditing(false)}>Cancelar</button></div></form></Modal>}</section>
  );
}
