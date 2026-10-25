import bcrypt from "bcryptjs";
// Valid dummy hash keeps missing-user attempts on the same bcrypt work path.
const MISSING_USER_HASH = '$2b$12$yPbBlHQcH4TkxoBbyqfb2./KgXSO9deuI.13GVOIvpc7US2WHFRy.';
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

  const passwordMatches = await bcrypt.compare(input.senha, user?.senhaHash ?? MISSING_USER_HASH);

  if (!user || !passwordMatches) {
    throw new InvalidCredentialsError();
  }

  return {
    id: user.id,
    nome: user.nome,
    email: user.email
  };
}
