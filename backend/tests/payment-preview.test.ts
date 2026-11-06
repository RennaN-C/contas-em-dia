import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/modules/accounts/accounts.service.js', async original => ({
  ...await original<typeof import('../src/modules/accounts/accounts.service.js')>(), getAccount: vi.fn()
}));
vi.mock('../src/integrations/brasil-api/rate.service.js', () => ({ getAnnualSelic: vi.fn() }));
import { getAccount, AccountError } from '../src/modules/accounts/accounts.service.js';
import { getAnnualSelic } from '../src/integrations/brasil-api/rate.service.js';
import { previewPayment, paymentPreviewSchema } from '../src/modules/payments/payments.service.js';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAccount).mockResolvedValue({ saldo: 60, vencimento: new Date('2026-10-01') } as Awaited<ReturnType<typeof getAccount>>);
  vi.mocked(getAnnualSelic).mockResolvedValue({ status: 'disponivel', taxaAnual: 15, fonte: 'Taxa fictícia de teste', consultadaEm: '2026-11-02', emCache: true, desatualizada: false });
});
it('calcula encargos em centavos para o principal e a data informados', async () => {
  expect(await previewPayment('owner', 'account', { valor: 60, pagoEm: '2026-10-31' })).toMatchObject({ status: 'disponivel', encargos: '0.74', total: '60.74', dias: 30 });
  expect(getAccount).toHaveBeenCalledWith('owner', 'account');
});
it('pagamento parcial inclui apenas juros proporcionais ao principal amortizado', async () => {
  expect(await previewPayment('owner', 'account', { valor: 30, pagoEm: '2026-10-31' })).toMatchObject({ encargos: '0.37', total: '30.37', dias: 30 });
});
it('data retroativa altera os dias sem usar o dia atual', async () => {
  expect(await previewPayment('owner', 'account', { valor: 60, pagoEm: '2026-10-11' })).toMatchObject({ encargos: '0.25', dias: 10 });
});
it.each(['2026-09-30', '2026-10-01'])('até o vencimento %s não consulta taxa nem acrescenta encargos', async pagoEm => {
  expect(await previewPayment('owner', 'account', { valor: 60, pagoEm })).toMatchObject({ encargos: '0.00', total: '60.00', dias: 0 });
  expect(getAnnualSelic).not.toHaveBeenCalled();
});
it('taxa indisponível não vira encargo zero nem valor inventado', async () => {
  vi.mocked(getAnnualSelic).mockResolvedValue({ status: 'indisponivel' });
  const result = await previewPayment('owner', 'account', { valor: 60, pagoEm: '2026-10-31' });
  expect(result.status).toBe('indisponivel'); expect(result).not.toHaveProperty('encargos');
});
it('preserva aviso de taxa antiga', async () => {
  vi.mocked(getAnnualSelic).mockResolvedValue({ status: 'disponivel', taxaAnual: 15, fonte: 'Teste', consultadaEm: '2026-10-30', emCache: true, desatualizada: true });
  expect(await previewPayment('owner', 'account', { valor: 60, pagoEm: '2026-10-31' })).toMatchObject({ desatualizada: true });
});
it('rejeita valor acima do saldo antes de consultar taxa', async () => {
  await expect(previewPayment('owner', 'account', { valor: 61, pagoEm: '2026-10-31' })).rejects.toThrow('Pagamento excede');
  expect(getAnnualSelic).not.toHaveBeenCalled();
});
it('propaga acesso negado sem consultar taxas', async () => {
  vi.mocked(getAccount).mockRejectedValue(new AccountError('Conta não encontrada', 404));
  await expect(previewPayment('foreign', 'account', { valor: 60, pagoEm: '2026-10-31' })).rejects.toThrow('Conta não encontrada');
  expect(getAnnualSelic).not.toHaveBeenCalled();
});
it('valida datas, valor positivo e campos extras', () => {
  for (const input of [{ valor: 0, pagoEm: '2026-10-31' }, { valor: 10, pagoEm: '2100-01-01' }, { valor: 10, pagoEm: '2026-02-30' }, { valor: 10, pagoEm: '2026-10-31', usuarioId: 'foreign' }]) {
    expect(paymentPreviewSchema.safeParse(input).success).toBe(false);
  }
});
