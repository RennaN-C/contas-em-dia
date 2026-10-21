import { ApiError } from "../../services/api";
import type { RegisterInput } from "./auth.service";

export type RegisterErrors = Partial<Record<keyof RegisterInput, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTER_FIELDS: Array<keyof RegisterInput> = ["nome", "email", "senha"];

export function validateRegisterForm(input: RegisterInput): RegisterErrors {
  const errors: RegisterErrors = {};
  const nome = input.nome.trim();
  const email = input.email.trim();

  if (!nome) {
    errors.nome = "Informe seu nome";
  } else if (nome.length < 2) {
    errors.nome = "Nome deve ter pelo menos 2 caracteres";
  } else if (nome.length > 100) {
    errors.nome = "Nome deve ter no máximo 100 caracteres";
  }

  if (!email) {
    errors.email = "Informe seu e-mail";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "E-mail inválido";
  }

  if (!input.senha) {
    errors.senha = "Informe uma senha";
  } else if (input.senha.length < 8) {
    errors.senha = "Senha deve ter pelo menos 8 caracteres";
  } else if (input.senha.length > 72) {
    errors.senha = "Senha deve ter no máximo 72 caracteres";
  }

  return errors;
}

export function registerErrorsFromApi(error: ApiError): RegisterErrors {
  if (error.status === 409) {
    return { email: error.message };
  }

  const errors: RegisterErrors = {};

  for (const issue of error.issues) {
    const field = REGISTER_FIELDS.find((name) => name === issue.path);

    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}
