// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Accounts } from '../src/features/accounts/Accounts';
import { accountsApi } from '../src/features/accounts/accounts.api';
import { notificationsApi } from '../src/features/notifications/notifications.api';
import { PaymentHistory } from '../src/features/payments/Payments';
import { api } from '../src/services/api';
import { downloadCsv } from '../src/services/csv';

vi.mock('../src/features/accounts/accounts.api', async original => ({ ...await original<typeof import('../src/features/accounts/accounts.api')>(), accountsApi: { list: vi.fn() } }));
vi.mock('../src/features/notifications/notifications.api', () => ({ notificationsApi: { interest: vi.fn() } }));
vi.mock('../src/services/api', async original => ({ ...await original<typeof import('../src/services/api')>(), api: vi.fn() }));
vi.mock('../src/services/csv', async original => ({ ...await original<typeof import('../src/services/csv')>(), downloadCsv: vi.fn() }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement, root: Root;
const rows = Array.from({ length: 13 }, (_, i) => ({ id: `a${i}`, descricao: `Conta ${String(i + 1).padStart(2, '0')}`, valor: '100.00', saldo: 60, vencimento: i === 12 ? '2026-12-01' : '2026-11-01', tipo: 'AVULSA' as const, recorrencia: null, status: 'PENDENTE' }));
beforeEach(() => {
  vi.resetAllMocks();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  vi.mocked(accountsApi.list).mockResolvedValue({ accounts: rows });
  vi.mocked(notificationsApi.interest).mockResolvedValue({ aviso: '', estimates: [] });
  vi.mocked(api).mockResolvedValue({ payments: rows.map((row, i) => ({ id: `p${i}`, valor: '40.00', encargos: '.90', pagoEm: row.vencimento, conta: { id: row.id, descricao: row.descricao } })) });
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
async function render(node: ReactNode) { await act(async () => root.render(node)); }
async function click(text: string) {
  const button = [...container.querySelectorAll('button')].find(b => b.textContent === text)!;
  expect(button).toBeTruthy(); await act(async () => button.click());
}
async function month(value: string) {
  const input = container.querySelector<HTMLInputElement>('input[type=month]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
it('pagina contas e exporta todos os resultados do filtro, inclusive outras páginas', async () => {
  await render(<Accounts />);
  expect(container.querySelectorAll('.account-card')).toHaveLength(12);
  expect(container.querySelector('[aria-label="Resumo das contas filtradas"]')?.textContent).toContain('780,00');
  await click('Próxima');
  expect(container.querySelectorAll('.account-card')).toHaveLength(1);
  expect(container.querySelector('.account-card')?.textContent).toContain('Conta 13');
  await click('Exportar contas CSV');
  const csv = vi.mocked(downloadCsv).mock.calls[0]![0];
  expect(csv).toContain('Conta 01'); expect(csv).toContain('Conta 13');
  await month('2026-11');
  expect(container.querySelectorAll('.account-card')).toHaveLength(12);
  expect(container.textContent).not.toContain('Conta 13');
  await click('Limpar filtros');
  expect(container.querySelector('[aria-label="Paginação de contas"]')?.textContent).toContain('Página 1 de 2');
});
it('histórico resume principal e encargos de todas as páginas e recalcula no filtro', async () => {
  await render(<PaymentHistory />);
  expect(container.querySelectorAll('tbody tr')).toHaveLength(12);
  const summary = () => container.querySelector('[aria-label="Resumo dos pagamentos filtrados"]')!.textContent;
  expect(summary()).toContain('531,70');
  await click('Próxima');
  expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
  await month('2026-12');
  expect(summary()).toContain('40,90');
  await click('Exportar CSV');
  expect(vi.mocked(downloadCsv).mock.calls[0]![0]).toContain('Conta 13');
  expect(vi.mocked(downloadCsv).mock.calls[0]![0]).not.toContain('Conta 01');
});
