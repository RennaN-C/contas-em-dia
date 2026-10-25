// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FinancialOverview } from '../src/features/accounts/FinancialOverview';
import { accountsApi } from '../src/features/accounts/accounts.api';
import { api } from '../src/services/api';
vi.mock('../src/features/accounts/accounts.api', async original => ({ ...await original<typeof import('../src/features/accounts/accounts.api')>(), accountsApi: { list: vi.fn() } }));
vi.mock('../src/services/api', () => ({ api: vi.fn() }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement, root: Root;
beforeEach(() => { vi.resetAllMocks(); container = document.createElement('div'); document.body.append(container); root = createRoot(container); vi.mocked(accountsApi.list).mockResolvedValue({ accounts: [] }); vi.mocked(api).mockResolvedValue({ payments: [] }); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
async function render() { await act(async () => root.render(<MemoryRouter><FinancialOverview/></MemoryRouter>)); }
it('mostra estado inicial sem inventar dados financeiros', async () => {
  await render(); expect(container.textContent).toContain('Cadastre uma conta'); expect(container.textContent).toContain('0%'); expect(container.querySelector('svg[role=img]')).toBeTruthy(); expect(container.querySelector('table caption')?.textContent).toBe('Valores mensais em reais');
});
it('exibe saldos, parcelas pagas e conta a acompanhar', async () => {
  vi.mocked(accountsApi.list).mockResolvedValue({ accounts: [{ id: 'a', descricao: 'Aluguel', valor: '100', saldo: 60, status: 'ATRASADA', vencimento: '2026-10-01', tipo: 'AVULSA', recorrencia: null }] });
  vi.mocked(api).mockResolvedValue({ payments: [{ id: 'p', valor: '40', pagoEm: '2026-10-05', conta: { id: 'a', descricao: 'Aluguel' } }] });
  await render(); expect(container.textContent).toContain('60,00'); expect(container.textContent).toContain('40,00'); expect(container.textContent).toContain('Aluguel'); expect(container.textContent).toContain('40%'); expect(container.textContent).toContain('Em atraso');
});
it('mostra carregamento', async () => { vi.mocked(accountsApi.list).mockReturnValue(new Promise(() => {})); await render(); expect(container.querySelector('[role=status]')?.textContent).toContain('Preparando'); });
it('falha de consulta oferece nova tentativa', async () => {
  vi.mocked(accountsApi.list).mockRejectedValueOnce(new Error('Sem conexão')); await render(); expect(container.querySelector('[role=alert]')?.textContent).toContain('Sem conexão'); await act(async () => container.querySelector('button')!.click()); expect(accountsApi.list).toHaveBeenCalledTimes(2); expect(container.querySelector('[role=alert]')).toBeNull();
});
