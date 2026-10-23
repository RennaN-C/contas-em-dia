import { ApiError } from "../../services/api";
import type { LoginInput } from "./auth.service";
import { isValidEmail } from "./register-validation";

export type LoginErrors = Partial<Record<keyof LoginInput, string>>;

export function validateLoginForm(input: LoginInput): LoginErrors {
  const errors: LoginErrors = {};
  const email = input.email.trim();

  if (!email) {
    errors.email = "Informe seu e-mail";
  } else if (!isValidEmail(email)) {
    errors.email = "E-mail inválido";
  }

  if (!input.senha) {
    errors.senha = "Informe sua senha";
  }

  return errors;
}

export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "E-mail ou senha inválidos";
    }

    return error.message;
  }

  return "Não foi possível entrar. Tente novamente.";
}
