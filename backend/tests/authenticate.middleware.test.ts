import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  createAuthenticate,
  getAuthenticatedUserId
} from "../src/middlewares/authenticate.js";
import { createAccessToken } from "../src/modules/auth/token.service.js";

const secret = "segredo-de-teste-com-tamanho-seguro";

function makeApp() {
  const controller = vi.fn((req: express.Request, res: express.Response) => {
    res.json({ userId: getAuthenticatedUserId(req) });
  });

  const app = express();
  app.get("/protegida", createAuthenticate(secret), controller);

  return { app, controller };
}

describe("createAuthenticate", () => {
  it("disponibiliza o usuário do token para a rota", async () => {
    const { app } = makeApp();
    const token = createAccessToken("user-1", secret);

    const response = await request(app)
      .get("/protegida")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: "user-1" });
  });

  it.each([
    ["sem header", undefined],
    ["sem prefixo Bearer", "Token abc"],
    ["Bearer vazio", "Bearer "],
    ["token malformado", "Bearer nao-e-um-jwt"],
    ["assinado com outro segredo", `Bearer ${createAccessToken("user-1", "outro-segredo-com-tamanho-seguro")}`],
    ["expirado", `Bearer ${jwt.sign({ sub: "user-1" }, secret, { expiresIn: -10 })}`],
    ["sem sub", `Bearer ${jwt.sign({ nome: "Marlon" }, secret)}`]
  ])("retorna 401 para token %s sem chamar o controller", async (_caso, header) => {
    const { app, controller } = makeApp();

    const pending = request(app).get("/protegida");
    const response = await (header ? pending.set("Authorization", header) : pending);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message");
    expect(controller).not.toHaveBeenCalled();
  });
});
