import { EmailAlreadyInUseError, type PublicUser } from "./register-user.service.js";
import type { UpdateProfileInput } from "./user.schema.js";
import {
  userRepository,
  type UserRecord,
  type UserRepository
} from "./user.repository.js";

export class UserNotFoundError extends Error {
  constructor() {
    super("Usuário não encontrado");
    this.name = "UserNotFoundError";
  }
}

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    criadoEm: user.criadoEm
  };
}

export async function getProfile(
  userId: string,
  repository: UserRepository = userRepository
): Promise<PublicUser> {
  const user = await repository.findById(userId);

  if (!user) {
    throw new UserNotFoundError();
  }

  return toPublicUser(user);
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
  repository: UserRepository = userRepository
): Promise<PublicUser> {
  const user = await repository.findById(userId);

  if (!user) {
    throw new UserNotFoundError();
  }

  if (input.email && input.email !== user.email) {
    const emailOwner = await repository.findByEmail(input.email);

    if (emailOwner && emailOwner.id !== userId) {
      throw new EmailAlreadyInUseError();
    }
  }

  try {
    const updatedUser = await repository.update(userId, { nome: input.nome, email: input.email });
    return toPublicUser(updatedUser);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new EmailAlreadyInUseError();
    throw error;
  }
}
