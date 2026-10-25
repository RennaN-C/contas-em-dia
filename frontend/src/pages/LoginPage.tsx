import { Link } from "react-router";
import { LoginForm } from "../features/auth/LoginForm";
import { Brand } from '../components/Icon';
import { AuthStory } from '../components/AuthStory';

export function LoginPage() {
  return (
    <main className="auth-page">
      <AuthStory/>
      <section className="auth-card">
        <Brand/>
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
