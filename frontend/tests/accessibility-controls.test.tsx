// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { ScrollableTable } from '../src/components/ScrollableTable';
import { SettingCheckbox } from '../src/components/SettingCheckbox';
import { Modal } from '../src/components/Modal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement, root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
function CheckboxExample() { const [checked, setChecked] = useState(false); return <SettingCheckbox label="Confirmar pagamento" description="Confira antes de salvar" checked={checked} onChange={setChecked}/>; }

it('rótulo associado permite ativar a preferência e separa a descrição acessível', async () => {
  await act(async () => root.render(<CheckboxExample/>));
  const input = container.querySelector('input')!;
  expect(container.querySelector('label')!.htmlFor).toBe(input.id);
  expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('Confira antes de salvar');
  await act(async () => container.querySelector('label')!.click());
  expect(input.checked).toBe(true);
});
it('controles nativos permitem rolar a tabela por teclado sem submeter formulário', async () => {
  const submit = vi.fn(event => event.preventDefault());
  await act(async () => root.render(<form onSubmit={submit}><ScrollableTable label="Pagamentos"><table><tbody><tr><td>Valor</td></tr></tbody></table></ScrollableTable></form>));
  const region = container.querySelector<HTMLDivElement>('[role=region]')!;
  const scroll = vi.fn(); region.scrollBy = scroll;
  const buttons = container.querySelectorAll('button');
  await act(async () => buttons[0]!.click());
  expect(scroll).toHaveBeenLastCalledWith({ left: -200, behavior: 'instant' });
  await act(async () => buttons[1]!.click());
  expect(scroll).toHaveBeenLastCalledWith({ left: 200, behavior: 'instant' });
  expect(submit).not.toHaveBeenCalled();
  expect(region.hasAttribute('tabindex')).toBe(false);
});
it('abrir modal posiciona foco dentro da janela e fechar devolve ao botão anterior', async () => {
  const opener = document.createElement('button'); document.body.append(opener); opener.focus();
  try {
    await act(async () => root.render(<Modal title="Editar conta" onClose={() => {}}><label>Descrição<input name="descricao"/></label></Modal>));
    expect(document.activeElement).toBe(container.querySelector('input'));
    await act(async () => root.render(null));
    expect(document.activeElement).toBe(opener);
  } finally { opener.remove(); }
});
