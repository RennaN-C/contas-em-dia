import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import {
  authenticateUser,
  InvalidCredentialsError
} from "../src/modules/auth/login-user.service.js";
import type {
  UserRecord,
  UserRepository
} from "../src/modules/users/user.repository.js";

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "user-1",
    nome: "Marlon",
    email: "marlon@example.com",
    senhaHash: "hash",
    criadoEm: new Date("2026-09-30T12:00:00Z"),
    atualizadoEm: new Date("2026-09-30T12:00:00Z"),
    ...overrides
  };
}

describe("authenticateUser", () => {
  it("autentica usuário com credenciais válidas", async () => {
    const senhaHash = await bcrypt.hash("senha-segura", 4);

    const repository: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(
        makeUser({
          senhaHash
        })
      ),
      create: vi.fn()
    };

    const user = await authenticateUser(
      {
        email: "marlon@example.com",
        senha: "senha-segura"
      },
      repository
    );

    expect(user).toEqual({
      id: "user-1",
      nome: "Marlon",
      email: "marlon@example.com"
    });
    expect(user).not.toHaveProperty("senhaHash");
  });

  it("recusa usuário inexistente", async () => {
    const repository: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn()
    };

    await expect(
      authenticateUser(
        {
          email: "naoexiste@example.com",
          senha: "senha-segura"
        },
        repository
      )
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("recusa senha inválida", async () => {
    const senhaHash = await bcrypt.hash("senha-correta", 4);

    const repository: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(
        makeUser({
          senhaHash
        })
      ),
      create: vi.fn()
    };

    await expect(
      authenticateUser(
        {
          email: "marlon@example.com",
          senha: "senha-incorreta"
        },
        repository
      )
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
