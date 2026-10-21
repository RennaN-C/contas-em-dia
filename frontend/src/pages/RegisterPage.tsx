import { RegisterForm } from "../features/auth/RegisterForm";

export function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">ContasEmDia</span>
        <h1 className="auth-title">Crie sua conta</h1>
        <p className="auth-subtitle">Organize suas contas e receba avisos antes do vencimento.</p>
        <RegisterForm />
        <p className="auth-footer">
          Já tem conta? <a href="/login">Entrar</a>
        </p>
      </section>
    </main>
  );
}
