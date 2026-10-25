import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ApiError } from "../../services/api";
import { registerUser, type RegisterInput } from "./auth.service";
import {
  registerErrorsFromApi,
  validateRegisterForm,
  type RegisterErrors
} from "./register-validation";

const initialValues: RegisterInput = { nome: "", email: "", senha: "" };

export function RegisterForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation,setConfirmation]=useState('');
  const [showPassword,setShowPassword]=useState(false);

  function updateField(field: keyof RegisterInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const validationErrors = validateRegisterForm(values);
    if (confirmation !== values.senha) validationErrors.senha = 'As senhas devem ser iguais';
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const user = await registerUser({
        nome: values.nome.trim(),
        email: values.email.trim(),
        senha: values.senha
      });

      setRegisteredName(user.nome);
      setValues(initialValues);
      setConfirmation('');
    } catch (error) {
      if (error instanceof ApiError) {
        const apiErrors = registerErrorsFromApi(error);
        setErrors(apiErrors);

        if (Object.keys(apiErrors).length === 0) {
          setFormError(error.message);
        }
      } else {
        setFormError("Não foi possível concluir o cadastro");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (registeredName) {
    return (
      <div className="alert alert-success" role="status">
        <strong>Cadastro realizado!</strong>
        <p>Bem-vindo(a), {registeredName}. Agora você já pode entrar com seu e-mail e senha.</p>
        <Link className="button" to="/login">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="alert alert-error" role="alert">
          {formError}
        </div>
      )}

      <div className="field">
        <label htmlFor="register-nome">Nome</label>
        <input
          id="register-nome"
          name="nome"
          autoComplete="name"
          value={values.nome}
          onChange={(event) => updateField("nome", event.target.value)}
          aria-invalid={Boolean(errors.nome)}
          aria-describedby={errors.nome ? "register-nome-error" : undefined}
        />
        {errors.nome && (
          <span id="register-nome-error" className="field-error">
            {errors.nome}
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="register-email">E-mail</label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => updateField("email", event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "register-email-error" : undefined}
        />
        {errors.email && (
          <span id="register-email-error" className="field-error">
            {errors.email}
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="register-senha">Senha</label>
        <input
          id="register-senha"
          name="senha"
          type={showPassword?'text':'password'}
          autoComplete="new-password"
          value={values.senha}
          onChange={(event) => updateField("senha", event.target.value)}
          aria-invalid={Boolean(errors.senha)}
          aria-describedby={errors.senha ? "register-senha-error" : "register-senha-hint"}
        />
        {errors.senha ? (
          <span id="register-senha-error" className="field-error">
            {errors.senha}
          </span>
        ) : (
          <span id="register-senha-hint" className="field-hint">
            Mínimo de 8 caracteres.
          </span>
        )}
      </div>

      <div className="field"><label htmlFor="register-confirmation">Confirmar senha</label><input id="register-confirmation" type={showPassword?'text':'password'} autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} required aria-invalid={!!errors.senha}/></div>
      <button className="password-toggle" type="button" aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Ocultar senhas':'Mostrar senhas'}</button>

      <button className="button" type="submit" disabled={submitting}>
        {submitting ? "Cadastrando..." : "Criar conta"}
      </button>
    </form>
  );
}
