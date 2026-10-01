import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { createAccessToken } from "../src/modules/auth/token.service.js";

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
