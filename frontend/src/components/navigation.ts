export type NavigationItem = {
  to: string;
  label: string;
};

// Cada área do sistema entra aqui para aparecer no menu do layout principal.
export const navigationItems: NavigationItem[] = [
  { to: "/", label: "Início" },
  { to: "/contas", label: "Contas" },
  { to: "/pagamentos", label: "Pagamentos" },
  { to: "/calendario", label: "Calendário" },
  { to: "/relatorios", label: "Relatórios" },
  { to: "/avisos", label: "Avisos" },
  { to: "/perfil", label: "Perfil" },
  { to: "/configuracoes", label: "Configurações" }
];
