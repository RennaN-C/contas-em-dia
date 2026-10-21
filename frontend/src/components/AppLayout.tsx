import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { useAuth } from "../features/auth/useAuth";
import { navigationItems } from "./navigation";

export function AppLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="layout">
      <header className="layout-header">
        <span className="layout-brand">ContasEmDia</span>
        <button
          className="layout-menu-toggle"
          type="button"
          aria-controls="main-navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Fechar" : "Menu"}
        </button>
      </header>

      <aside className={`layout-sidebar${menuOpen ? " is-open" : ""}`}>
        <nav id="main-navigation" aria-label="Navegação principal">
          <ul className="layout-nav">
            {navigationItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  className="layout-nav-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="layout-user">
          <span className="layout-user-name">{user?.nome}</span>
          <span className="layout-user-email">{user?.email}</span>
          <button className="button button-secondary" type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  );
}
