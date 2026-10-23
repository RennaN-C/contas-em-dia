import { afterEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "../src/features/auth/auth.service";
import {
  registerErrorsFromApi,
  validateRegisterForm
} from "../src/features/auth/register-validation";
import { ApiError } from "../src/services/api";

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("validateRegisterForm", () => {
  it("aceita dados válidos", () => {
    expect(
      validateRegisterForm({ nome: "Marlon", email: "marlon@example.com", senha: "senha-segura" })
    ).toEqual({});
  });

  it("aponta cada campo inválido", () => {
    expect(validateRegisterForm({ nome: " ", email: "email-invalido", senha: "123" })).toEqual({
      nome: "Informe seu nome",
      email: "E-mail inválido",
      senha: "Senha deve ter pelo menos 8 caracteres"
    });
  });
});

describe("registerUser", () => {
  it("envia o cadastro para POST /auth/register", async () => {
    const fetchMock = mockFetch(201, {
      user: { id: "user-1", nome: "Marlon", email: "marlon@example.com" }
    });

    const user = await registerUser({
      nome: "Marlon",
      email: "marlon@example.com",
      senha: "senha-segura"
    });

    expect(user.nome).toBe("Marlon");
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/auth\/register$/);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      nome: "Marlon",
      email: "marlon@example.com",
      senha: "senha-segura"
    });
  });

  it("transforma erro da API em ApiError com status e mensagem", async () => {
    mockFetch(409, { message: "E-mail já cadastrado" });

    const error = await registerUser({
      nome: "Marlon",
      email: "marlon@example.com",
      senha: "senha-segura"
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, message: "E-mail já cadastrado" });
  });
});

describe("registerErrorsFromApi", () => {
  it("mostra e-mail já cadastrado no campo de e-mail", () => {
    expect(registerErrorsFromApi(new ApiError("E-mail já cadastrado", 409))).toEqual({
      email: "E-mail já cadastrado"
    });
  });

  it("associa erros de validação da API aos campos", () => {
    const error = new ApiError("Dados inválidos", 400, [
      { path: "senha", message: "Senha deve ter pelo menos 8 caracteres" },
      { path: "outro", message: "Ignorado" }
    ]);

    expect(registerErrorsFromApi(error)).toEqual({
      senha: "Senha deve ter pelo menos 8 caracteres"
    });
  });

  it("não associa erro genérico a campos", () => {
    expect(registerErrorsFromApi(new ApiError("Erro interno do servidor", 500))).toEqual({});
  });
});
