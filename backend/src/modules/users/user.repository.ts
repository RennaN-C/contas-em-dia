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
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  create(data: { nome: string; email: string; senhaHash: string }): Promise<UserRecord>;
  update(id: string, data: { nome?: string; email?: string }): Promise<UserRecord>;
}

export const userRepository: UserRepository = {
  findById(id) {
    return prisma.usuario.findUnique({ where: { id } });
  },

  findByEmail(email) {
    return prisma.usuario.findUnique({ where: { email } });
  },

  create(data) {
    return prisma.usuario.create({ data });
  },

  update(id, data) {
    return prisma.usuario.update({ where: { id }, data });
  }
};
