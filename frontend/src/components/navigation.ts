export type NavigationItem = {
  to: string;
  label: string;
};

// Cada área do sistema entra aqui para aparecer no menu do layout principal.
export const navigationItems: NavigationItem[] = [
  { to: "/", label: "Início" },
  { to: "/contas", label: "Contas" },
  { to: "/pagamentos", label: "Pagamentos" },
  { to: "/avisos", label: "Avisos" },
  { to: "/perfil", label: "Perfil" }
];
