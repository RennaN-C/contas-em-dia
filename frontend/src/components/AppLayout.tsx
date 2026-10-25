import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { Brand, Icon } from './Icon';
import { useAuth } from "../features/auth/useAuth";
import { navigationItems } from "./navigation";

export function AppLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="layout">
      <header className="layout-header">
        <Brand/>
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
        <Link to="/" className="sidebar-brand" aria-label="Saldo +, início"><Brand/></Link>
        <span className="nav-caption">SEU ESPAÇO FINANCEIRO</span>
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
                  <Icon name={({'/':'home','/contas':'wallet','/pagamentos':'payment','/avisos':'bell','/perfil':'user'} as Record<string,string>)[item.to] ?? 'home'}/>{item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-tip"><Icon name="check"/><strong>Um passo à frente.</strong><p>Organize hoje. Respire melhor amanhã.</p></div>
        <div className="layout-user">
          <span className="user-avatar" aria-hidden="true">{user?.nome.slice(0,1).toUpperCase()}</span>
          <span className="layout-user-name">{user?.nome}</span>
          <span className="layout-user-email">{user?.email}</span>
          <button className="button button-secondary" type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="layout-content">
        <div className="workspace-bar"><span>Suas finanças, com mais clareza.</span><Link to="/avisos"><Icon name="bell"/>Central de avisos</Link></div>
        <Outlet />
      </main>
    </div>
  );
}
