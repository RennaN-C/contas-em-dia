const paths: Record<string, string> = {
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  wallet: 'M20 8V5H5a2 2 0 0 0 0 4h15v12H5a2 2 0 0 1-2-2V7m13 7h5m-4 0h.01',
  payment: 'M4 5h16v14H4zM4 10h16M8 15h3',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  trend: 'm3 17 6-6 4 4 8-10m-6 0h6v6',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  logout: 'M9 3H4v18h5m5-14 5 5-5 5m-6-5h13'
};
export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.wallet}/></svg>;
}
export function Brand() {
  return <span className="brand"><span className="brand-symbol" aria-hidden="true">s<span>+</span></span><span>Saldo <span className="brand-plus">+</span></span></span>;
}
