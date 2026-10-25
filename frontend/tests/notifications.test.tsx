// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Notifications } from '../src/features/notifications/Notifications';
import { Messages } from '../src/features/messages/Messages';
import { messagesApi, type Message } from '../src/features/messages/messages.api';
import { notificationsApi } from '../src/features/notifications/notifications.api';
vi.mock('../src/features/messages/messages.api', () => ({ messagesApi: { list: vi.fn(), read: vi.fn() } }));
vi.mock('../src/features/notifications/notifications.api', () => ({ notificationsApi: { summary: vi.fn(), interest: vi.fn() } }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement, root: Root;
const message: Message = { id: 'id', titulo: 'Vencimento hoje', conteudo: 'Saldo de R$ 60,00', lida: false, tipo: 'AVISO', criadoEm: '2026-10-25', conta: { id: 'c', descricao: 'Aluguel', vencimento: '2026-10-25' } };
beforeEach(() => {
  vi.resetAllMocks(); container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  vi.mocked(messagesApi.list).mockResolvedValue({ messages: [] });
  vi.mocked(notificationsApi.summary).mockResolvedValue({ summary: { inicio: '2026-10-25', fimExclusivo: '2026-11-01', accounts: [], total: 0 } });
  vi.mocked(notificationsApi.interest).mockResolvedValue({ aviso: 'Demonstrativo', estimates: [] });
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
async function render(node: ReactNode = <Notifications/>) { await act(async () => root.render(<MemoryRouter>{node}</MemoryRouter>)); }
async function click(text: string) { const button = [...container.querySelectorAll('button')].find(b => b.textContent === text)!; expect(button).toBeTruthy(); await act(async () => button.click()); }
it('mostra todos os estados vazios e aviso demonstrativo', async () => {
  await render(); expect(container.textContent).toContain('Nenhuma mensagem'); expect(container.textContent).toContain('Nenhuma conta a vencer'); expect(container.textContent).toContain('Nenhuma conta atrasada'); expect(container.textContent).toContain('Não é cobrança contratual');
});
it('loading nas três consultas independentes', async () => {
  vi.mocked(messagesApi.list).mockReturnValue(new Promise(() => {})); vi.mocked(notificationsApi.summary).mockReturnValue(new Promise(() => {})); vi.mocked(notificationsApi.interest).mockReturnValue(new Promise(() => {}));
  await render(); expect(container.textContent).toContain('Carregando mensagens'); expect(container.textContent).toContain('Carregando resumo'); expect(container.textContent).toContain('Consultando estimativas');
});
it('exibe mensagens, conta e destaque textual de não lida', async () => {
  vi.mocked(messagesApi.list).mockResolvedValue({ messages: [message] }); await render();
  expect(container.querySelector('.message-unread')).toBeTruthy(); expect(container.textContent).toContain('Não lida'); expect(container.textContent).toContain('25/10/2026'); expect(container.querySelector('a')?.textContent).toBe('Aluguel');
});
it('marca leitura pela API e anuncia sucesso', async () => {
  vi.mocked(messagesApi.list).mockResolvedValue({ messages: [message] }); vi.mocked(messagesApi.read).mockResolvedValue({ message: { ...message, lida: true } });
  await render(); await click('Marcar como lida'); expect(messagesApi.read).toHaveBeenCalledWith('id'); expect(container.textContent).toContain('Mensagem marcada como lida'); expect(container.querySelector('.message-unread')).toBeNull();
});
it('desabilita botão durante leitura pendente', async () => {
  vi.mocked(messagesApi.list).mockResolvedValue({ messages: [message] }); vi.mocked(messagesApi.read).mockReturnValue(new Promise(() => {}));
  await render(<Messages/>); await click('Marcar como lida'); expect(container.querySelector('button')?.disabled).toBe(true); expect(container.textContent).toContain('Salvando');
});
it('erro de leitura permite nova tentativa sem perder mensagem', async () => {
  vi.mocked(messagesApi.list).mockResolvedValue({ messages: [message] }); vi.mocked(messagesApi.read).mockRejectedValueOnce(new Error('Falha ao salvar')).mockResolvedValue({ message: { ...message, lida: true } });
  await render(); await click('Marcar como lida'); expect(container.querySelector('[role=alert]')?.textContent).toContain('Falha ao salvar'); await click('Marcar como lida'); expect(messagesApi.read).toHaveBeenCalledTimes(2);
});
it('filtra lidas e não lidas', async () => {
  vi.mocked(messagesApi.list).mockResolvedValue({ messages: [message, { ...message, id: 'read', titulo: 'Resumo anterior', lida: true, tipo: 'RESUMO_SEMANAL' }] });
  await render(<Messages/>); const select = container.querySelector('select')!;
  await act(async () => { select.value = 'unread'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(container.textContent).not.toContain('Resumo anterior');
  await act(async () => { select.value = 'read'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(container.textContent).toContain('Resumo anterior'); expect(container.textContent).not.toContain('Vencimento hoje');
});
it('erro nas mensagens permite retry', async () => {
  vi.mocked(messagesApi.list).mockRejectedValueOnce(new Error('Sem conexão')); await render(); expect(container.textContent).toContain('Sem conexão'); await click('Tentar novamente'); expect(messagesApi.list).toHaveBeenCalledTimes(2); expect(container.textContent).toContain('Nenhuma mensagem');
});
it('resumo exibe saldo parcial e vencimento', async () => {
  vi.mocked(notificationsApi.summary).mockResolvedValue({ summary: { inicio: '2026-10-25', fimExclusivo: '2026-11-01', total: 60, accounts: [{ ...message.conta!, saldo: 60 }] } });
  await render(); expect(container.textContent).toContain('60,00'); expect(container.textContent).toContain('Aluguel'); expect(container.textContent).toContain('25/10/2026');
});
it('falha no resumo não impede mensagens e retry recupera', async () => {
  vi.mocked(notificationsApi.summary).mockRejectedValueOnce(new Error('Falha no resumo')); vi.mocked(messagesApi.list).mockResolvedValue({ messages: [message] });
  await render(); expect(container.textContent).toContain('Vencimento hoje'); await click('Recarregar resumo'); expect(notificationsApi.summary).toHaveBeenCalledTimes(2);
});
it('apresenta dias, Selic, juros e total estimado', async () => {
  vi.mocked(notificationsApi.interest).mockResolvedValue({ aviso: 'Demonstrativo', estimates: [{ conta: message.conta!, dias: 30, saldo: '60.00', status: 'disponivel', taxaAnual: 15, juros: '0.74', valorEstimado: '60.74' }] });
  await render(); expect(container.textContent).toContain('30 dia(s)'); expect(container.textContent).toContain('15% ao ano'); expect(container.textContent).toContain('0,74'); expect(container.textContent).toContain('60,74');
});
it('indisponibilidade Selic não quebra tela e oferece retry', async () => {
  vi.mocked(notificationsApi.interest).mockResolvedValue({ aviso: 'Demonstrativo', estimates: [{ conta: message.conta!, dias: 30, saldo: '60.00', status: 'indisponivel' }] });
  await render(); expect(container.textContent).toContain('Selic indisponível'); expect(container.textContent).not.toContain('Total estimado:'); await click('Consultar taxa novamente'); expect(notificationsApi.interest).toHaveBeenCalledTimes(2);
});
it('erro HTTP nas estimativas permite retry', async () => {
  vi.mocked(notificationsApi.interest).mockRejectedValueOnce(new Error('Falha de estimativas')); await render(); expect(container.textContent).toContain('Falha de estimativas'); await click('Recarregar estimativas'); expect(notificationsApi.interest).toHaveBeenCalledTimes(2);
});
it('ignora resposta de mensagem após desmontagem', async () => {
  let resolve!: (value: { messages: Message[] }) => void;
  vi.mocked(messagesApi.list).mockReturnValue(new Promise(r => { resolve = r; }));
  await render(<Messages/>); await act(async () => root.render(<div>Outra página</div>)); await act(async () => resolve({ messages: [message] })); expect(container.textContent).toBe('Outra página');
});
