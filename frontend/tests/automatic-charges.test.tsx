// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PaymentForm } from '../src/features/payments/Payments';
import { api } from '../src/services/api';
vi.mock('../src/services/api', async original => ({ ...await original<typeof import('../src/services/api')>(), api: vi.fn() }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement, root: Root;
const account = { id: 'a', descricao: 'Aluguel', valor: '100', saldo: 60, status: 'ATRASADA', vencimento: '2026-10-01', tipo: 'AVULSA' as const, recorrencia: null };
const preview = { status: 'disponivel', valor: 60, pagoEm: '2026-11-02', encargos: '.74', total: '60.74', dias: 30, taxaAnual: 15, fonte: 'Teste' };
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  vi.mocked(api).mockResolvedValue({ preview });
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.useRealTimers(); });
async function render(confirmPayment = true) { await act(async () => root.render(<PaymentForm account={account} estimate={{status:'disponivel',conta:{id:'a',descricao:'Aluguel',vencimento:account.vencimento},dias:30,saldo:'60.00',taxaAnual:15,juros:'.74',valorEstimado:'60.74'}} confirmPayment={confirmPayment} onSaved={() => {}} onCancel={() => {}} />)); }
async function click(text: string) { const button = [...container.querySelectorAll('button')].find(b => b.textContent === text)!; expect(button).toBeTruthy(); await act(async () => button.click()); }
async function selectCharges() { await act(async () => container.querySelector<HTMLInputElement>('input[type=checkbox]')!.click()); }
async function calculate() { await act(async () => { await vi.advanceTimersByTimeAsync(300); }); }
async function input(name: string, value: string) {
  const field = container.querySelector<HTMLInputElement>(`[name=${name}]`)!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value); field.dispatchEvent(new Event('input', { bubbles: true })); field.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function submit() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
it('marcar encargos preenche o cálculo sem digitação e soma ao total', async () => {
  await render(); await selectCharges(); await calculate();
  expect(container.querySelector('[aria-label="Estimativa de juros de atraso"]')).toBeNull();
  expect(container.querySelector('[name=encargos]')).toBeNull();
  expect(container.textContent).toContain('60,74');
  expect(api).toHaveBeenCalledWith('/accounts/a/payments/preview', expect.objectContaining({ body: expect.stringContaining('"valor":60') }));
  await submit(); expect(container.textContent).toContain('Encargos calculados');
  vi.mocked(api).mockResolvedValue({ payment: { id: 'p', valor: '60', encargos: '.74', pagoEm: '2026-11-02' } });
  await click('Confirmar pagamento');
  expect(JSON.parse(vi.mocked(api).mock.calls.at(-1)![1]!.body as string)).toMatchObject({ valor: 60, encargos: .74 });
});
it('mudar valor e data invalida a cotação anterior e solicita novo cálculo', async () => {
  await render(); await selectCharges(); await calculate();
  await input('valor', '30');
  expect([...container.querySelectorAll('button')].find(b => b.textContent === 'Registrar pagamento')!.disabled).toBe(true);
  vi.mocked(api).mockResolvedValue({ preview: { ...preview, valor: 30, encargos: '.37', total: '30.37' } });
  await calculate(); expect(container.textContent).toContain('30,37');
  await input('pagoEm', '2026-10-10'); await calculate();
  expect(JSON.parse(vi.mocked(api).mock.calls.at(-1)![1]!.body as string)).toEqual({ valor: 30, pagoEm: '2026-10-10' });
});
it('indisponibilidade não inclui zero silenciosamente e permite ajuste manual', async () => {
  vi.mocked(api).mockResolvedValue({ preview: { status: 'indisponivel', message: 'Taxa indisponível' } });
  await render(); await selectCharges(); await calculate();
  expect(container.querySelector('[role=alert]')?.textContent).toContain('Taxa indisponível');
  expect([...container.querySelectorAll('button')].find(b => b.textContent === 'Registrar pagamento')!.disabled).toBe(true);
  await click('Informar outro valor'); await input('encargos', '1.25'); await submit();
  expect(container.textContent).toContain('61,25');
});
it('encargos sempre passam por revisão mesmo se revisão geral estiver desativada', async () => {
  await render(false); await selectCharges(); await calculate(); await submit();
  expect(container.textContent).toContain('Revisar pagamento');
  expect(api).toHaveBeenCalledTimes(1);
});
it('desmarcar a opção remove os encargos do total e do envio', async () => {
  await render(false); await selectCharges(); await calculate(); await selectCharges();
  expect(container.querySelector('.payment-total-preview')?.textContent).toContain('60,00');
  vi.mocked(api).mockResolvedValue({ payment: { id: 'p', valor: '60', pagoEm: '2026-11-02' } });
  await submit();
  expect(JSON.parse(vi.mocked(api).mock.calls.at(-1)![1]!.body as string)).not.toHaveProperty('encargos');
});
it('falha no pagamento permite repetição com a mesma chave e mesmos encargos', async () => {
  await render(); await selectCharges(); await calculate(); await submit();
  vi.mocked(api).mockRejectedValueOnce(new Error('Sem conexão'));
  await click('Confirmar pagamento');
  const first = vi.mocked(api).mock.calls.at(-1)![1]!.body;
  vi.mocked(api).mockResolvedValue({ payment: { id: 'p', valor: '60', encargos: '.74', pagoEm: '2026-11-02' } });
  await click('Confirmar pagamento');
  expect(vi.mocked(api).mock.calls.at(-1)![1]!.body).toBe(first);
});
