import { describe, expect, it } from "vitest";
import { loginSchema } from "../src/modules/auth/auth.schema.js";

describe("loginSchema", () => {
  it("normaliza e-mail no login", () => {
    const result = loginSchema.parse({
      email: "MARLON@EXAMPLE.COM",
      senha: "senha-segura"
    });

    expect(result.email).toBe("marlon@example.com");
  });

  it.each([
    [{ email: "email-invalido", senha: "senha-segura" }],
    [{ email: "marlon@example.com", senha: "" }]
  ])("recusa credenciais em formato inválido", (input) => {
    expect(loginSchema.safeParse(input).success).toBe(false);
  });
});
