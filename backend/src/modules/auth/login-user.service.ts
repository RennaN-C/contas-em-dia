import bcrypt from "bcryptjs";
import type { LoginInput } from "./auth.schema.js";
import {
  userRepository,
  type UserRepository
} from "../users/user.repository.js";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("E-mail ou senha inválidos");
    this.name = "InvalidCredentialsError";
  }
}

export type AuthenticatedUser = {
  id: string;
  nome: string;
  email: string;
};

export async function authenticateUser(
  input: LoginInput,
  repository: UserRepository = userRepository
): Promise<AuthenticatedUser> {
  const user = await repository.findByEmail(input.email);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await bcrypt.compare(input.senha, user.senhaHash);

  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  return {
    id: user.id,
    nome: user.nome,
    email: user.email
  };
}
