import { useAuth } from "../features/auth/useAuth";

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <main className="app-shell">
      <section className="hero">
        <span className="eyebrow">ContasEmDia</span>
        <h1>Olá, {user?.nome}!</h1>
        <p>As áreas do sistema serão adicionadas aqui.</p>
        <button className="button" type="button" onClick={logout}>
          Sair
        </button>
      </section>
    </main>
  );
}
