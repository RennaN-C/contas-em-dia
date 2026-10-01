import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import {
  EmailAlreadyInUseError,
  registerUser
} from "../src/modules/users/register-user.service.js";
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

describe("registerUser", () => {
  it("cadastra usuário com senha protegida e não retorna senhaHash", async () => {
    let createdData: { nome: string; email: string; senhaHash: string } | undefined;

    const repository: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn(async (data) => {
        createdData = data;
        return makeUser({
          nome: data.nome,
          email: data.email,
          senhaHash: data.senhaHash
        });
      })
    };

    const user = await registerUser(
      {
        nome: "Marlon",
        email: "marlon@example.com",
        senha: "senha-segura"
      },
      repository
    );

    expect(createdData).toBeDefined();
    expect(createdData?.senhaHash).not.toBe("senha-segura");
    expect(await bcrypt.compare("senha-segura", createdData!.senhaHash)).toBe(true);
    expect(user).toEqual({
      id: "user-1",
      nome: "Marlon",
      email: "marlon@example.com",
      criadoEm: new Date("2026-09-30T12:00:00Z")
    });
    expect(user).not.toHaveProperty("senhaHash");
  });

  it("recusa e-mail já cadastrado", async () => {
    const repository: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(makeUser()),
      create: vi.fn()
    };

    await expect(
      registerUser(
        {
          nome: "Outro usuário",
          email: "marlon@example.com",
          senha: "senha-segura"
        },
        repository
      )
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);

    expect(repository.create).not.toHaveBeenCalled();
  });
});
