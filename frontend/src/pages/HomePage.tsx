import { useAuth } from "../features/auth/useAuth";

export function HomePage() {
  const { user } = useAuth();

  return (
    <section className="page">
      <h1 className="page-title">Olá, {user?.nome}!</h1>
      <p className="page-description">
        Acompanhe suas contas, pagamentos e avisos pelo menu.
      </p>
    </section>
  );
}
