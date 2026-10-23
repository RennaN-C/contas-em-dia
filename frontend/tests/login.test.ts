// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loginUser } from "../src/features/auth/auth.service";
import { loginErrorMessage, validateLoginForm } from "../src/features/auth/login-validation";
import { clearSession, loadSession, saveSession } from "../src/features/auth/session";
import { ApiError } from "../src/services/api";

const session = {
  token: "jwt-token",
  user: { id: "user-1", nome: "Marlon", email: "marlon@example.com" }
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("validateLoginForm", () => {
  it("aceita credenciais preenchidas", () => {
    expect(validateLoginForm({ email: "marlon@example.com", senha: "qualquer" })).toEqual({});
  });

  it("aponta campos vazios ou e-mail inválido", () => {
    expect(validateLoginForm({ email: "", senha: "" })).toEqual({
      email: "Informe seu e-mail",
      senha: "Informe sua senha"
    });
    expect(validateLoginForm({ email: "email-invalido", senha: "x" })).toEqual({
      email: "E-mail inválido"
    });
  });
});

describe("loginErrorMessage", () => {
  it("usa mensagem genérica para credenciais inválidas", () => {
    expect(loginErrorMessage(new ApiError("E-mail ou senha inválidos", 401))).toBe(
      "E-mail ou senha inválidos"
    );
  });

  it("repassa falha de conexão e erros inesperados sem quebrar", () => {
    expect(loginErrorMessage(new ApiError("Não foi possível conectar ao servidor", 0))).toBe(
      "Não foi possível conectar ao servidor"
    );
    expect(loginErrorMessage(new Error("boom"))).toBe("Não foi possível entrar. Tente novamente.");
  });
});

describe("loginUser", () => {
  it("envia credenciais para POST /auth/login e retorna token e usuário", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(session), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(loginUser({ email: "marlon@example.com", senha: "senha-segura" })).resolves.toEqual(
      session
    );

    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/auth\/login$/);
    expect(options.method).toBe("POST");
  });
});

describe("session", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("salva, recupera e remove a sessão", () => {
    saveSession(session);
    expect(loadSession()).toEqual(session);

    clearSession();
    expect(loadSession()).toBeNull();
  });

  it("descarta sessão corrompida", () => {
    localStorage.setItem("contasemdia:session", "{nao-e-json");
    expect(loadSession()).toBeNull();
    expect(localStorage.getItem("contasemdia:session")).toBeNull();

    localStorage.setItem("contasemdia:session", JSON.stringify({ user: session.user }));
    expect(loadSession()).toBeNull();
  });
});
