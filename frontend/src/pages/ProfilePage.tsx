import { useAuth } from '../features/auth/useAuth';
import { Icon } from '../components/Icon';

export function ProfilePage() {
  const { user } = useAuth();
  return (
    <section className="page"><span className="eyebrow">SEU ESPAÇO</span><h1 className="page-title">Perfil</h1><p className="page-description">Seus dados de acesso ao Saldo +.</p><div className="panel profile-panel"><span className="account-symbol"><Icon name="user"/></span><h2>{user?.nome}</h2><dl><dt>Nome</dt><dd>{user?.nome}</dd><dt>E-mail</dt><dd>{user?.email}</dd></dl><p>Suas contas, pagamentos e mensagens ficam associados ao seu acesso pessoal.</p></div></section>
  );
}
