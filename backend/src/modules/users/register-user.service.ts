import bcrypt from "bcryptjs";
import type { RegisterUserInput } from "./user.schema.js";
import { userRepository, type UserRepository } from "./user.repository.js";

export class EmailAlreadyInUseError extends Error {
  constructor() {
    super("E-mail já cadastrado");
    this.name = "EmailAlreadyInUseError";
  }
}

export type PublicUser = {
  id: string;
  nome: string;
  email: string;
  criadoEm: Date;
};

export async function registerUser(
  input: RegisterUserInput,
  repository: UserRepository = userRepository
): Promise<PublicUser> {
  const existingUser = await repository.findByEmail(input.email);

  if (existingUser) {
    throw new EmailAlreadyInUseError();
  }

  const senhaHash = await bcrypt.hash(input.senha, 12);

  const user = await repository.create({
    nome: input.nome,
    email: input.email,
    senhaHash
  });

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    criadoEm: user.criadoEm
  };
}
