export const PAGE_SIZE = 12;

export function Pagination({ page, total, onChange, label }: {
  page: number; total: number; onChange: (page: number) => void; label: string;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return <nav className="pagination" aria-label={label}>
    <span aria-live="polite">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total} · Página {page} de {pages}</span>
    <div><button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>Anterior</button>
      <button type="button" disabled={page === pages} onClick={() => onChange(page + 1)}>Próxima</button></div>
  </nav>;
}
