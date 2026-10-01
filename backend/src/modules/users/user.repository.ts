import { prisma } from "../../lib/prisma.js";

export type UserRecord = {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  criadoEm: Date;
  atualizadoEm: Date;
};

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  create(data: { nome: string; email: string; senhaHash: string }): Promise<UserRecord>;
}

export const userRepository: UserRepository = {
  findByEmail(email) {
    return prisma.usuario.findUnique({ where: { email } });
  },

  create(data) {
    return prisma.usuario.create({ data });
  }
};
