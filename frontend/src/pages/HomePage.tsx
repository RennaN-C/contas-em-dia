import { useAuth } from "../features/auth/useAuth";
import { Link } from 'react-router';
import { Icon } from '../components/Icon';
import { FinancialOverview } from '../features/accounts/FinancialOverview';

export function HomePage() {
  const { user } = useAuth();

  return (
    <section className="page dashboard-page">
      <div className="page-heading"><div><span className="eyebrow">SEU PANORAMA FINANCEIRO</span><h1 className="page-title">Olá, {user?.nome.split(' ')[0]}!</h1><p className="page-description">Mais clareza para hoje. Mais tranquilidade para amanhã.</p></div><Link className="button" to="/contas">Gerenciar contas<Icon name="arrow"/></Link></div>
      <FinancialOverview/>
    </section>
  );
}
