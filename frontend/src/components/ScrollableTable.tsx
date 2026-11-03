import { useRef, type ReactNode } from 'react';

type Props = Readonly<{ label: string; children: ReactNode; className?: string }>;

/** Native buttons provide keyboard scrolling without making a static region interactive. */
export function ScrollableTable({ label, children, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  function scroll(direction: -1 | 1) {
    const region = ref.current;
    if (region) region.scrollBy({ left: direction * Math.max(200, region.clientWidth * .75), behavior: 'instant' });
  }
  return <div ref={ref} className={`table-scroll ${className}`} role="region" aria-label={label}>
    <div className="table-scroll-controls no-print">
      <span>Rolar tabela</span>
      <button type="button" aria-label={`Rolar ${label} para a esquerda`} onClick={() => scroll(-1)}>←</button>
      <button type="button" aria-label={`Rolar ${label} para a direita`} onClick={() => scroll(1)}>→</button>
    </div>
    {children}
  </div>;
}
