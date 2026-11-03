import { currency } from './accounts.api';
import { categories, categoryLabel } from './categories';

export function CategoryChart({ rows, title, description }: { rows: { categoria: string; valor: number }[]; title: string; description: string }) {
  const total = rows.reduce((sum, row) => sum + Math.round(row.valor * 100), 0) / 100;
  const sorted = [...rows].filter(row => row.valor > 0).sort((a, b) => b.valor - a.valor);
  return <section className="panel category-chart"><h2>{title}</h2><p className="field-hint">{description}</p>
    {!sorted.length ? <p>Nenhum valor neste período.</p> : <ul>{sorted.map(row => <li key={row.categoria}>
      <div><span>{categoryLabel(row.categoria)}</span><strong>{currency(row.valor)} <small>({Math.round(row.valor / total * 100)}%)</small></strong></div>
      <div className="category-track" aria-hidden="true"><span style={{ width: `${row.valor / total * 100}%`, background: categories.find(category => category.value === row.categoria)?.color ?? '#62716a' }}/></div>
    </li>)}</ul>}
  </section>;
}
