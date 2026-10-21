import { Link } from "react-router";
import { LoginForm } from "../features/auth/LoginForm";

export function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">ContasEmDia</span>
        <h1 className="auth-title">Entrar</h1>
        <p className="auth-subtitle">Acesse suas contas e vencimentos.</p>
        <LoginForm />
        <p className="auth-footer">
          Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
        </p>
      </section>
    </main>
  );
}
