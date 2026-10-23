import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import {
  createAccessToken,
  InvalidTokenError,
  verifyAccessToken
} from "../src/modules/auth/token.service.js";

describe("createAccessToken", () => {
  it("gera JWT com o usuário no subject", () => {
    const secret = "segredo-de-teste-com-tamanho-seguro";
    const token = createAccessToken("user-1", secret);

    const payload = jwt.verify(token, secret);

    expect(typeof payload).toBe("object");

    if (typeof payload === "object") {
      expect(payload.sub).toBe("user-1");
      expect(payload.exp).toBeTypeOf("number");
    }
  });
});

describe("verifyAccessToken", () => {
  const secret = "segredo-de-teste-com-tamanho-seguro";

  it("retorna o ID do usuário de um token válido", () => {
    const token = createAccessToken("user-1", secret);

    expect(verifyAccessToken(token, secret)).toBe("user-1");
  });

  it("recusa token assinado com outro segredo", () => {
    const token = createAccessToken("user-1", "outro-segredo-com-tamanho-seguro");

    expect(() => verifyAccessToken(token, secret)).toThrow(InvalidTokenError);
  });

  it("recusa token expirado", () => {
    const token = jwt.sign({ sub: "user-1" }, secret, { expiresIn: -10 });

    expect(() => verifyAccessToken(token, secret)).toThrow(InvalidTokenError);
  });
});
