import { useAuth } from '../features/auth/useAuth';
import { Icon } from '../components/Icon';
import { useState, type FormEvent } from 'react';
import { updateCurrentUser } from '../features/auth/auth.service';
import { loadSession } from '../features/auth/session';
import { ApiError } from '../services/api';

export function ProfilePage() {
  const { user,login } = useAuth();
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[feedback,setFeedback]=useState('');
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data=new FormData(event.currentTarget); setBusy(true);setError('');setFeedback('');
    try { const updated=await updateCurrentUser({nome:String(data.get('nome')).trim(),email:String(data.get('email')).trim()});const session=loadSession();if(session)login({...session,user:updated});setFeedback('Perfil atualizado com sucesso.'); }
    catch(e){setError(e instanceof ApiError?[e.message,...e.issues.map(i=>i.message)].join(' · '):(e as Error).message);}finally{setBusy(false);}
  }
  return (
    <section className="page"><span className="eyebrow">SEU ESPAÇO</span><h1 className="page-title">Perfil</h1><p className="page-description">Mantenha seus dados de acesso atualizados.</p><div className="panel profile-panel"><span className="account-symbol"><Icon name="user"/></span><h2>{user?.nome}</h2><form className="form" onSubmit={save}>{error&&<p role="alert">{error}</p>}{feedback&&<p role="status" className="feedback-success">{feedback}</p>}<label>Nome<input name="nome" required minLength={2} maxLength={100} autoComplete="name" defaultValue={user?.nome}/></label><label>E-mail<input name="email" type="email" required autoComplete="email" defaultValue={user?.email}/></label><button className="button" disabled={busy}>{busy?'Salvando…':'Salvar perfil'}</button></form><p>Suas contas, pagamentos e mensagens ficam associados ao seu acesso pessoal.</p></div></section>
  );
}
