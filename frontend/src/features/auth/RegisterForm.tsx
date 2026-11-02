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
  const [confirmationError,setConfirmationError]=useState('');
  const [capsLock,setCapsLock]=useState(false);
  const [registeredEmail,setRegisteredEmail]=useState('');
  const passwordBytes=new TextEncoder().encode(values.senha).length;

  function updateField(field: keyof RegisterInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(submitting)return;
    setFormError(null);

    const validationErrors = validateRegisterForm(values);
    const mismatch=confirmation!==values.senha?'As senhas devem ser iguais':!confirmation?'Confirme sua senha':'';
    setConfirmationError(mismatch);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0 || mismatch) {
      document.getElementById(`register-${Object.keys(validationErrors)[0]??'confirmation'}`)?.focus();
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
      setRegisteredEmail(user.email);
      setValues(initialValues);
      setConfirmation('');
    } catch (error) {
      if (error instanceof ApiError) {
        const apiErrors = registerErrorsFromApi(error);
        setErrors(apiErrors);
        const first=Object.keys(apiErrors)[0];
        if(first)document.getElementById(`register-${first}`)?.focus();

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
        <ol className="registration-next"><li>Entre com seu e-mail e senha.</li><li>Cadastre sua primeira conta, avulsa ou mensal.</li><li>Acompanhe vencimentos, pagamentos e avisos pelo painel.</li></ol>
        <Link className="button" to="/login" state={{email:registeredEmail}}>
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form className="form registration-form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
      <h2 className="form-section-title">Seus dados</h2>
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
          required
          maxLength={100}
          disabled={submitting}
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
          required
          disabled={submitting}
          autoCapitalize="none"
          spellCheck={false}
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

      <h2 className="form-section-title">Sua senha de acesso</h2>
      <div className="field">
        <label htmlFor="register-senha">Senha</label>
        <input
          id="register-senha"
          name="senha"
          type={showPassword?'text':'password'}
          autoComplete="new-password"
          required
          disabled={submitting}
          onKeyUp={event=>setCapsLock(event.getModifierState('CapsLock'))}
          onBlur={()=>setCapsLock(false)}
          value={values.senha}
          onChange={(event) => {updateField("senha", event.target.value);setConfirmationError('');}}
          aria-invalid={Boolean(errors.senha)}
          aria-describedby={errors.senha ? "register-senha-error" : "register-senha-hint"}
        />
        {errors.senha ? (
          <span id="register-senha-error" className="field-error">
            {errors.senha}
          </span>
        ) : (
          <span id="register-senha-hint" className="field-hint">
            De 8 caracteres a 72 bytes. Combine palavras, números e símbolos para fortalecer sua senha.
          </span>
        )}
      </div>

      <div className="field"><label htmlFor="register-confirmation">Confirmar senha</label><input id="register-confirmation" name="confirmation" disabled={submitting} type={showPassword?'text':'password'} autoComplete="new-password" value={confirmation} onChange={e=>{setConfirmation(e.target.value);setConfirmationError('');}} required aria-invalid={!!confirmationError} aria-describedby={confirmationError?'register-confirmation-error':undefined}/>{confirmationError&&<span id="register-confirmation-error" className="field-error">{confirmationError}</span>}</div>
      {capsLock&&<p className="field-hint" role="status">Caps Lock está ativado.</p>}
      {values.senha&&<div className="password-guidance" aria-label="Requisitos da senha"><span className={values.senha.length>=8?'complete':''}>{values.senha.length>=8?'✓':'○'} Pelo menos 8 caracteres</span><span className={passwordBytes<=72?'complete':''}>{passwordBytes<=72?'✓':'○'} Limite de 72 bytes ({passwordBytes}/72)</span><span className={confirmation===values.senha?'complete':''}>{confirmation===values.senha?'✓':'○'} Confirmação igual à senha</span></div>}
      <button className="password-toggle" type="button" disabled={submitting} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Ocultar senhas':'Mostrar senhas'}</button>

      <button className="button" type="submit" disabled={submitting}>
        {submitting ? "Cadastrando..." : "Criar conta"}
      </button>
      <p className="registration-privacy">Você começa com seu próprio espaço: contas, pagamentos e mensagens ficam vinculados ao seu acesso.</p>
    </form>
  );
}
