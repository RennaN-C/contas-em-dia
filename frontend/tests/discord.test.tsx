// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/services/api', () => ({ api: vi.fn() }));
import { api } from '../src/services/api';
import { DiscordConnection } from '../src/features/messages/DiscordConnection';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement, root: Root;
const disconnected = { configured: true, ativo: false, pendente: false, expiraEm: null, erro: null };
beforeEach(() => { vi.resetAllMocks(); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
async function render() { await act(async () => root.render(<DiscordConnection />)); }
async function click(text: string) { const b = [...container.querySelectorAll('button')].find(b => b.textContent === text)!; expect(b).toBeTruthy(); await act(async () => b.click()); }
it('desabilitado informa configuração sem oferecer opt-in', async () => {
  vi.mocked(api).mockResolvedValue({ ...disconnected, configured: false }); await render();
  expect(container.textContent).toContain('ainda não configurada'); expect(container.textContent).not.toContain('Conectar Discord');
});
it('gera convite, orienta comando e confirma vínculo consultando o backend', async () => {
  vi.mocked(api).mockResolvedValueOnce(disconnected); await render();
  vi.mocked(api).mockResolvedValueOnce({ codigo: 'codigo-de-uso-unico', expiraEm: '2026-11-07T12:00:00Z' }).mockResolvedValueOnce({ ...disconnected, pendente: true });
  await click('Conectar Discord'); expect(container.textContent).toContain('/vincular codigo:codigo-de-uso-unico'); expect(api).toHaveBeenCalledWith('/integrations/discord/invite', { method: 'POST' });
  vi.mocked(api).mockResolvedValueOnce({ ...disconnected, ativo: true }); await click('Atualizar conexão');
  expect(container.textContent).toContain('conectado com sucesso'); expect(container.textContent).not.toContain('codigo-de-uso-unico');
});
it('desconecta e remove o código da tela', async () => {
  vi.mocked(api).mockResolvedValueOnce({ ...disconnected, ativo: true }); await render();
  vi.mocked(api).mockResolvedValueOnce({ ativo: false }).mockResolvedValueOnce(disconnected); await click('Desconectar Discord');
  expect(api).toHaveBeenCalledWith('/integrations/discord', { method: 'DELETE' }); expect(container.textContent).toContain('Discord desconectado');
});
it('expõe falha de DM e permite reconectar após corrigir permissões', async () => {
  vi.mocked(api).mockResolvedValueOnce({ ...disconnected, erro: 'DM bloqueada' }); await render();
  expect(container.querySelector('[role=alert]')?.textContent).toContain('DM bloqueada'); expect(container.textContent).toContain('Conectar Discord');
});
it('falha de rede tem feedback e recuperação', async () => {
  vi.mocked(api).mockRejectedValueOnce(new Error('offline')); await render(); expect(container.querySelector('[role=alert]')).toBeTruthy();
  vi.mocked(api).mockResolvedValueOnce(disconnected); await click('Atualizar conexão'); expect(container.querySelector('[role=alert]')).toBeNull();
});
