// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../src/features/auth/AuthProvider";
import { GuestRoute, ProtectedRoute } from "../src/features/auth/ProtectedRoute";
import { saveSession } from "../src/features/auth/session";
import { useAuth } from "../src/features/auth/useAuth";
import { api, setAuthToken, setUnauthorizedHandler } from "../src/services/api";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const session = {
  token: "jwt-token",
  user: { id: "user-1", nome: "Marlon", email: "marlon@example.com" }
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function PrivatePage() {
  const { user, logout } = useAuth();

  return (
    <div>
      <p>Privada de {user?.nome}</p>
      <button type="button" onClick={logout}>
        Sair
      </button>
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;

async function renderApp(path: string) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<PrivatePage />} />
            </Route>
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<p>Tela de login</p>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  });
}

beforeEach(() => {
  localStorage.clear();
  setAuthToken(null);
  setUnauthorizedHandler(null);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("api autenticada", () => {
  it("anexa o token às chamadas e avisa quando a API retorna 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, { message: "Token inválido ou expirado" }));
    vi.stubGlobal("fetch", fetchMock);
    const onUnauthorized = vi.fn();
    setAuthToken("jwt-token");
    setUnauthorizedHandler(onUnauthorized);

    await expect(api("/users/me")).rejects.toMatchObject({ status: 401 });

    expect(fetchMock.mock.calls[0]![1].headers).toMatchObject({ Authorization: "Bearer jwt-token" });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("não encerra sessão em 401 de chamada sem token, como login inválido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { message: "E-mail ou senha inválidos" })));
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(api("/auth/login", { method: "POST" })).rejects.toMatchObject({ status: 401 });

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe("rotas protegidas", () => {
  it("redireciona para o login sem sessão", async () => {
    vi.stubGlobal("fetch", vi.fn());

    await renderApp("/");

    expect(container.textContent).toContain("Tela de login");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("recupera a sessão salva ao abrir a aplicação", async () => {
    saveSession(session);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { user: { ...session.user, nome: "Marlon M." } })));

    await renderApp("/");

    expect(container.textContent).toContain("Privada de Marlon M.");
  });

  it("leva usuário autenticado do login para a área privada", async () => {
    saveSession(session);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { user: session.user })));

    await renderApp("/login");

    expect(container.textContent).toContain("Privada de Marlon");
  });

  it("encerra a sessão quando o token salvo não é mais aceito", async () => {
    saveSession(session);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { message: "Token inválido ou expirado" })));

    await renderApp("/");

    expect(container.textContent).toContain("Tela de login");
    expect(localStorage.getItem("contasemdia:session")).toBeNull();
  });

  it("logout remove a sessão e bloqueia a área privada", async () => {
    saveSession(session);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { user: session.user })));
    await renderApp("/");

    await act(async () => {
      container.querySelector("button")!.click();
    });

    expect(container.textContent).toContain("Tela de login");
    expect(localStorage.getItem("contasemdia:session")).toBeNull();
  });
});
