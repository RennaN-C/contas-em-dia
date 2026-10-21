import { describe, expect, it, vi } from "vitest";
import { EmailAlreadyInUseError } from "../src/modules/users/register-user.service.js";
import {
  getProfile,
  updateProfile,
  UserNotFoundError
} from "../src/modules/users/user-profile.service.js";
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

function makeRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findById: vi.fn().mockResolvedValue(makeUser()),
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(async (id, data) => makeUser({ id, ...data })),
    ...overrides
  };
}

describe("getProfile", () => {
  it("retorna o perfil sem senhaHash", async () => {
    const repository = makeRepository();

    const user = await getProfile("user-1", repository);

    expect(repository.findById).toHaveBeenCalledWith("user-1");
    expect(user).toEqual({
      id: "user-1",
      nome: "Marlon",
      email: "marlon@example.com",
      criadoEm: new Date("2026-09-30T12:00:00Z")
    });
    expect(user).not.toHaveProperty("senhaHash");
  });

  it("recusa usuário inexistente", async () => {
    const repository = makeRepository({ findById: vi.fn().mockResolvedValue(null) });

    await expect(getProfile("user-x", repository)).rejects.toBeInstanceOf(UserNotFoundError);
  });
});

describe("updateProfile", () => {
  it("atualiza nome e e-mail do próprio usuário", async () => {
    const repository = makeRepository();

    const user = await updateProfile(
      "user-1",
      { nome: "Marlon M.", email: "novo@example.com" },
      repository
    );

    expect(repository.update).toHaveBeenCalledWith("user-1", {
      nome: "Marlon M.",
      email: "novo@example.com"
    });
    expect(user.nome).toBe("Marlon M.");
    expect(user.email).toBe("novo@example.com");
    expect(user).not.toHaveProperty("senhaHash");
  });

  it("permite manter o próprio e-mail", async () => {
    const repository = makeRepository();

    await updateProfile("user-1", { email: "marlon@example.com" }, repository);

    expect(repository.findByEmail).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalled();
  });

  it("recusa e-mail de outro usuário", async () => {
    const repository = makeRepository({
      findByEmail: vi.fn().mockResolvedValue(makeUser({ id: "user-2", email: "outro@example.com" }))
    });

    await expect(
      updateProfile("user-1", { email: "outro@example.com" }, repository)
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("recusa usuário inexistente", async () => {
    const repository = makeRepository({ findById: vi.fn().mockResolvedValue(null) });

    await expect(
      updateProfile("user-x", { nome: "Fulano" }, repository)
    ).rejects.toBeInstanceOf(UserNotFoundError);

    expect(repository.update).not.toHaveBeenCalled();
  });
});
