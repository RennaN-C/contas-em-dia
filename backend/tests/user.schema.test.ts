import { describe, expect, it } from "vitest";
import { registerUserSchema } from "../src/modules/users/user.schema.js";

describe("registerUserSchema", () => {
  it("normaliza e-mail antes do cadastro", () => {
    const result = registerUserSchema.parse({
      nome: "Marlon",
      email: "MARLON@EXAMPLE.COM",
      senha: "senha-segura"
    });

    expect(result.email).toBe("marlon@example.com");
  });

  it.each([
    [{ nome: "M", email: "marlon@example.com", senha: "senha-segura" }],
    [{ nome: "Marlon", email: "email-invalido", senha: "senha-segura" }],
    [{ nome: "Marlon", email: "marlon@example.com", senha: "123" }]
  ])("recusa dados inválidos", (input) => {
    expect(registerUserSchema.safeParse(input).success).toBe(false);
  });
});
