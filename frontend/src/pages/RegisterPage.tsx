import { Link } from "react-router";
import { RegisterForm } from "../features/auth/RegisterForm";
import { Brand } from '../components/Icon';
import { AuthStory } from '../components/AuthStory';

export function RegisterPage() {
  return (
    <main className="auth-page">
      <AuthStory/>
      <section className="auth-card">
        <Brand/>
        <h1 className="auth-title">Crie sua conta</h1>
        <p className="auth-subtitle">Organize suas contas e receba avisos antes do vencimento.</p>
        <RegisterForm />
        <p className="auth-footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
