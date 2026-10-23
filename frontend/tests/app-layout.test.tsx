// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { AuthProvider } from "../src/features/auth/AuthProvider";
import { saveSession } from "../src/features/auth/session";
import { setAuthToken, setUnauthorizedHandler } from "../src/services/api";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const user = { id: "user-1", nome: "Marlon", email: "marlon@example.com" };

let container: HTMLDivElement;
let root: Root;

async function renderAt(path: string) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
  });
}

function navLinks() {
  return [...container.querySelectorAll<HTMLAnchorElement>("nav a")];
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.click();
  });
}

beforeEach(() => {
  localStorage.clear();
  setAuthToken(null);
  setUnauthorizedHandler(null);
  saveSession({ token: "jwt-token", user });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    )
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("AppLayout", () => {
  it("mostra a navegação para todas as áreas e o usuário logado", async () => {
    await renderAt("/");

    expect(navLinks().map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Início", "/"],
      ["Contas", "/contas"],
      ["Pagamentos", "/pagamentos"],
      ["Avisos", "/avisos"],
      ["Perfil", "/perfil"]
    ]);
    expect(container.textContent).toContain("marlon@example.com");
  });

  it("troca de área pela navegação e marca o item ativo", async () => {
    await renderAt("/");

    await click(navLinks().find((link) => link.textContent === "Contas")!);

    expect(container.querySelector("h1")?.textContent).toBe("Contas");
    const active = navLinks().filter((link) => link.getAttribute("aria-current") === "page");
    expect(active.map((link) => link.textContent)).toEqual(["Contas"]);
  });

  it("abre e fecha o menu no mobile", async () => {
    await renderAt("/");
    const toggle = container.querySelector<HTMLButtonElement>(".layout-menu-toggle")!;
    const sidebar = container.querySelector(".layout-sidebar")!;

    await click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(sidebar.classList.contains("is-open")).toBe(true);

    await click(navLinks().find((link) => link.textContent === "Perfil")!);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(sidebar.classList.contains("is-open")).toBe(false);
  });

  it("sai da sessão pelo botão do layout", async () => {
    await renderAt("/avisos");

    const logout = [...container.querySelectorAll("button")].find((button) => button.textContent === "Sair")!;
    await click(logout);

    expect(container.querySelector("nav")).toBeNull();
    expect(container.textContent).toContain("Entrar");
    expect(localStorage.getItem("contasemdia:session")).toBeNull();
  });
});
