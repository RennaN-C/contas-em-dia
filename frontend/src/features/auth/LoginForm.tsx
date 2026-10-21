import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { loginUser, type LoginInput } from "./auth.service";
import { loginErrorMessage, validateLoginForm, type LoginErrors } from "./login-validation";
import { useAuth } from "./useAuth";

const initialValues: LoginInput = { email: "", senha: "" };

type LoginLocationState = {
  from?: string;
};

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof LoginInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const validationErrors = validateLoginForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const session = await loginUser({ email: values.email.trim(), senha: values.senha });
      login(session);

      const from = (location.state as LoginLocationState | null)?.from;
      navigate(from ?? "/", { replace: true });
    } catch (error) {
      setFormError(loginErrorMessage(error));
      setValues((current) => ({ ...current, senha: "" }));
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="alert alert-error" role="alert">
          {formError}
        </div>
      )}

      <div className="field">
        <label htmlFor="login-email">E-mail</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => updateField("email", event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
        />
        {errors.email && (
          <span id="login-email-error" className="field-error">
            {errors.email}
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="login-senha">Senha</label>
        <input
          id="login-senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          value={values.senha}
          onChange={(event) => updateField("senha", event.target.value)}
          aria-invalid={Boolean(errors.senha)}
          aria-describedby={errors.senha ? "login-senha-error" : undefined}
        />
        {errors.senha && (
          <span id="login-senha-error" className="field-error">
            {errors.senha}
          </span>
        )}
      </div>

      <button className="button" type="submit" disabled={submitting}>
        {submitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
