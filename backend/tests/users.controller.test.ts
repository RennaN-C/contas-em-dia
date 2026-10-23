import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthenticate } from "../src/middlewares/authenticate.js";
import { createAccessToken } from "../src/modules/auth/token.service.js";
import { EmailAlreadyInUseError } from "../src/modules/users/register-user.service.js";
import {
  getProfile,
  updateProfile
} from "../src/modules/users/user-profile.service.js";
import { showMe, updateMe } from "../src/modules/users/users.controller.js";

vi.mock("../src/modules/users/user-profile.service.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/modules/users/user-profile.service.js")>();

  return {
    ...original,
    getProfile: vi.fn(),
    updateProfile: vi.fn()
  };
});

const secret = "segredo-de-teste-com-tamanho-seguro";
const token = createAccessToken("user-1", secret);
const publicUser = {
  id: "user-1",
  nome: "Marlon",
  email: "marlon@example.com",
  criadoEm: "2026-09-30T12:00:00.000Z"
};

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(createAuthenticate(secret));
  app.get("/me", showMe);
  app.put("/me", updateMe);
  return app;
}

describe("rotas de perfil", () => {
  beforeEach(() => {
    vi.mocked(getProfile).mockReset();
    vi.mocked(updateProfile).mockReset();
  });

  it("GET /me retorna o perfil do usuário do token", async () => {
    vi.mocked(getProfile).mockResolvedValue({ ...publicUser, criadoEm: new Date(publicUser.criadoEm) });

    const response = await request(makeApp())
      .get("/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: publicUser });
    expect(getProfile).toHaveBeenCalledWith("user-1");
  });

  it("GET /me exige autenticação", async () => {
    const response = await request(makeApp()).get("/me");

    expect(response.status).toBe(401);
    expect(getProfile).not.toHaveBeenCalled();
  });

  it("PUT /me atualiza apenas o usuário do token", async () => {
    vi.mocked(updateProfile).mockResolvedValue({
      ...publicUser,
      nome: "Marlon M.",
      criadoEm: new Date(publicUser.criadoEm)
    });

    const response = await request(makeApp())
      .put("/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Marlon M." });

    expect(response.status).toBe(200);
    expect(response.body.user.nome).toBe("Marlon M.");
    expect(updateProfile).toHaveBeenCalledWith("user-1", { nome: "Marlon M." });
  });

  it("PUT /me retorna 400 para dados inválidos", async () => {
    const response = await request(makeApp())
      .put("/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "email-invalido" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Dados inválidos");
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("PUT /me retorna 409 para e-mail já cadastrado", async () => {
    vi.mocked(updateProfile).mockRejectedValue(new EmailAlreadyInUseError());

    const response = await request(makeApp())
      .put("/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "outro@example.com" });

    expect(response.status).toBe(409);
  });
});
