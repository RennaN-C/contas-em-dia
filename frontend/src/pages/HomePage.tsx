import { loadSession } from "../features/auth/session";

export function HomePage() {
  const session = loadSession();

  return (
    <main className="app-shell">
      <section className="hero">
        <span className="eyebrow">ContasEmDia</span>
        <h1>Olá{session ? `, ${session.user.nome}` : ""}!</h1>
        <p>As áreas do sistema serão adicionadas aqui.</p>
      </section>
    </main>
  );
}
