// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Accounts } from '../src/features/accounts/Accounts';
import { PaymentHistory, PaymentForm } from '../src/features/payments/Payments';
import { AccountForm } from '../src/features/accounts/AccountForm';
import { accountsApi } from '../src/features/accounts/accounts.api';
import { api, ApiError } from '../src/services/api';
vi.mock('../src/features/accounts/accounts.api',async original=>({...await original<typeof import('../src/features/accounts/accounts.api')>(),accountsApi:{list:vi.fn(),save:vi.fn(),remove:vi.fn()}}));
vi.mock('../src/services/api',async original=>({...await original<typeof import('../src/services/api')>(),api:vi.fn()}));
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let container:HTMLDivElement,root:Root;
const account={id:'id',descricao:'Aluguel',valor:'100.00',vencimento:'2026-01-31T00:00:00Z',tipo:'AVULSA' as const,recorrencia:null,status:'PENDENTE',saldo:100};
beforeEach(()=>{vi.resetAllMocks();container=document.createElement('div');document.body.append(container);root=createRoot(container);vi.mocked(accountsApi.list).mockResolvedValue({accounts:[]});vi.mocked(api).mockResolvedValue({payments:[]});});
afterEach(()=>{act(()=>root.unmount());container.remove();});
async function render(node:React.ReactNode){await act(async()=>root.render(node));}
async function click(text:string){const b=[...container.querySelectorAll('button')].find(b=>b.textContent===text||b.getAttribute('aria-label')===text)!;expect(b).toBeTruthy();await act(async()=>b.click());}
it('exibe vazio com API real vazia',async()=>{await render(<Accounts/>);expect(container.textContent).toContain('Nenhuma conta encontrada');});
it('exibe carregamento enquanto consulta',async()=>{vi.mocked(accountsApi.list).mockReturnValue(new Promise(()=>{}));await render(<Accounts/>);expect(container.querySelector('[role=status]')?.textContent).toContain('Carregando');});
it('exibe erro e permite nova tentativa',async()=>{vi.mocked(accountsApi.list).mockRejectedValueOnce(new Error('Sem conexão'));await render(<Accounts/>);expect(container.querySelector('[role=alert]')?.textContent).toContain('Sem conexão');await click('Tentar novamente');expect(accountsApi.list).toHaveBeenCalledTimes(2);});
it('lista dados, aplica filtro e exige confirmação antes de excluir',async()=>{vi.mocked(accountsApi.list).mockResolvedValue({accounts:[account]});await render(<Accounts/>);expect(container.textContent).toContain('31/01/2026');const select=container.querySelector('select')!;await act(async()=>{select.value='PAGA';select.dispatchEvent(new Event('change',{bubbles:true}));});expect(accountsApi.list).toHaveBeenLastCalledWith('PAGA');await click('Excluir Aluguel');expect(accountsApi.remove).not.toHaveBeenCalled();await click('Cancelar');expect(container.querySelector('[role=alertdialog]')).toBeNull();await click('Excluir Aluguel');await click('Confirmar exclusão');expect(accountsApi.remove).toHaveBeenCalledWith('id');});
it('reutiliza formulário e envia edição à API',async()=>{const saved=vi.fn();await render(<AccountForm account={account} onSaved={saved} onCancel={()=>{}}/>);await act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(accountsApi.save).toHaveBeenCalledWith({descricao:'Aluguel',valor:100,vencimento:'2026-01-31',tipo:'AVULSA',recorrencia:null},'id');expect(saved).toHaveBeenCalledOnce();});
it('apresenta validações do backend',async()=>{vi.mocked(accountsApi.save).mockRejectedValue(new ApiError('Dados inválidos',400,[{path:'valor',message:'Valor inválido'}]));await render(<AccountForm account={account} onSaved={()=>{}} onCancel={()=>{}}/>);await act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(container.querySelector('[role=alert]')?.textContent).toContain('Valor inválido');});
it('histórico contém valor, conta e data',async()=>{vi.mocked(api).mockResolvedValue({payments:[{id:'p',valor:'25',pagoEm:'2026-01-01',conta:{id:'id',descricao:'Aluguel'}}]});await render(<PaymentHistory accountId="id"/>);expect(api).toHaveBeenCalledWith('/payments?contaId=id');expect(container.textContent).toContain('01/01/2026');expect(container.textContent).toContain('Aluguel');});
it('pagamento envia chave e atualiza interface após sucesso',async()=>{vi.mocked(api).mockResolvedValue({payment:{id:'p',valor:'100',encargos:'0',pagoEm:'2026-01-01'}});const saved=vi.fn();await render(<PaymentForm account={account} onSaved={saved} onCancel={()=>{}}/>);await act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await click('Confirmar pagamento');const call=vi.mocked(api).mock.calls[0]!;expect(call[0]).toBe('/accounts/id/payments');expect(JSON.parse(call[1]!.body as string)).toMatchObject({valor:100,chave:expect.any(String)});expect(saved).toHaveBeenCalledOnce();});
