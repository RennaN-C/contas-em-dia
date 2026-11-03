// @vitest-environment jsdom
import { act,type ReactNode } from 'react';
import { createRoot,type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import { CalendarPage } from '../src/pages/CalendarPage';
import { ReportsPage } from '../src/pages/ReportsPage';
import { AccountHistory } from '../src/features/accounts/AccountHistory';
import { PersonalDataPanel } from '../src/features/auth/PersonalDataPanel';
import { accountsApi,type Account } from '../src/features/accounts/accounts.api';
import { reportsApi,type MonthlyReport } from '../src/features/accounts/reports.api';
import { api } from '../src/services/api';
import { downloadText } from '../src/services/download';
vi.mock('../src/services/api',async original=>({...await original<typeof import('../src/services/api')>(),api:vi.fn()}));
vi.mock('../src/services/download',()=>({downloadText:vi.fn()}));
vi.mock('../src/services/dates',async original=>({...await original<typeof import('../src/services/dates')>(),todayISO:()=> '2026-11-02'}));
vi.mock('../src/features/accounts/accounts.api',async original=>({...await original<typeof import('../src/features/accounts/accounts.api')>(),accountsApi:{list:vi.fn()}}));
vi.mock('../src/features/accounts/reports.api',()=>({reportsApi:{monthly:vi.fn()}}));
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let container:HTMLDivElement,root:Root;
const account:Account={id:'a',descricao:'Moradia',valor:'100',saldo:60,vencimento:'2026-11-05',status:'PENDENTE',categoria:'MORADIA',tipo:'AVULSA',recorrencia:null};
const report:MonthlyReport={mes:'2026-11',geradoEm:'2026-11-02T12:00:00Z',usuario:{nome:'Teste',email:'t@example.org'},totais:{previsto:100,saldoPendente:60,principalPago:40,encargos:.9,totalPago:40.9},contas:[account],pagamentos:[{id:'p',valor:'40',encargos:'.9',pagoEm:'2026-11-01',conta:{id:'a',descricao:'Moradia'}}],categorias:[{categoria:'MORADIA',previsto:100,principalPago:40,encargos:.9,saldoPendente:60}]};
beforeEach(()=>{vi.resetAllMocks();container=document.createElement('div');document.body.append(container);root=createRoot(container);vi.mocked(accountsApi.list).mockResolvedValue({accounts:[account]});vi.mocked(reportsApi.monthly).mockResolvedValue({report});});
afterEach(()=>{act(()=>root.unmount());container.remove();vi.restoreAllMocks();});
async function render(node:ReactNode){await act(async()=>root.render(<MemoryRouter>{node}</MemoryRouter>));}
async function click(text:string){const button=[...container.querySelectorAll('button')].find(button=>button.textContent===text||button.getAttribute('aria-label')===text)!;expect(button).toBeTruthy();await act(async()=>button.click());}
async function changeMonth(value:string){const input=container.querySelector<HTMLInputElement>('input[type=month]')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});}
it('selecionar dia mostra contas e status sem alterar a data civil',async()=>{
  await render(<CalendarPage/>);await click('05/11/2026, 1 conta(s)');expect(container.querySelector('.calendar-selection')?.textContent).toContain('Moradia');expect(container.querySelector('.calendar-selection')?.textContent).toContain('60,00');
  await click('Próximo mês');expect(container.querySelector<HTMLInputElement>('input[type=month]')?.value).toBe('2026-12');expect(container.querySelector('.calendar-selection')?.textContent).toContain('Nenhuma conta');
});
it('filtrar categoria atualiza contagem e lista de contas do dia',async()=>{
  await render(<CalendarPage/>);await click('05/11/2026, 1 conta(s)');const select=container.querySelector('select')!;await act(async()=>{select.value='SAUDE';select.dispatchEvent(new Event('change',{bubbles:true}));});expect(container.querySelector('.calendar-selection')?.textContent).toContain('Nenhuma conta');
});
it('relatório discrimina principal e encargos e usa impressão nativa',async()=>{
  const print=vi.spyOn(window,'print').mockImplementation(()=>{});await render(<ReportsPage/>);expect(reportsApi.monthly).toHaveBeenCalledWith('2026-11');expect(container.querySelector('.report-total')?.textContent).toContain('40,90');expect(container.textContent).toContain('não representa um fechamento histórico');await click('Imprimir / Salvar PDF');expect(print).toHaveBeenCalledOnce();
  await act(async()=>container.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());expect(container.textContent).not.toContain('Contas com vencimento no mês');expect(container.textContent).toContain('Resumo por categoria');
});
it('mudar mês impede imprimir o relatório anterior enquanto consulta o próximo',async()=>{
  await render(<ReportsPage/>);vi.mocked(reportsApi.monthly).mockReturnValue(new Promise(()=>{}));await changeMonth('2026-12');expect(container.textContent).toContain('Preparando relatório');expect([...container.querySelectorAll('button')].find(button=>button.textContent==='Imprimir / Salvar PDF')!.disabled).toBe(true);
});
it('histórico exibe diferenças e preserva informação de cadastro anterior',async()=>{
  vi.mocked(api).mockResolvedValue({history:[{id:'e',descricao:'Moradia',acao:'CONTA_EDITADA',criadoEm:'2026-11-02T12:00:00Z',detalhes:{antes:{valor:'100',categoria:'MORADIA'},depois:{valor:'120',categoria:'MORADIA'}}},{id:'old',descricao:'Legado',acao:'CADASTRO_ANTERIOR',criadoEm:'2026-11-01',detalhes:{observacao:'Alterações anteriores não estão disponíveis.'}}]});
  await render(<AccountHistory accountId="a"/>);expect(api).toHaveBeenCalledWith('/accounts/a/history');expect(container.querySelector('del')?.textContent).toContain('100,00');expect(container.textContent).toContain('120,00');expect(container.textContent).not.toContain('Categoria');expect(container.textContent).toContain('Alterações anteriores não estão disponíveis');
});
it('perfil mostra resumo e exporta dados retornados pela API autenticada',async()=>{
  vi.mocked(api).mockResolvedValueOnce({summary:{contas:3,quitadas:1,atrasadas:1,saldoPendente:100,pagamentos:2,totalPago:71,mensagensNaoLidas:1}}).mockResolvedValueOnce({usuario:{id:'owner',nome:'Teste'},contas:[]});await render(<PersonalDataPanel/>);expect(container.textContent).toContain('71,00');await click('Baixar meus dados (JSON)');expect(api).toHaveBeenLastCalledWith('/users/me/export');expect(downloadText).toHaveBeenCalledWith(expect.stringContaining('"owner"'),'saldo-plus-meus-dados-2026-11-02.json','application/json;charset=utf-8');expect(container.textContent).toContain('Exportação preparada');
});
it('histórico pagina eventos sem ocultar os registros mais antigos',async()=>{
  vi.mocked(api).mockResolvedValue({history:Array.from({length:13},(_,index)=>({id:String(index),descricao:`Conta ${index}`,acao:'CONTA_CRIADA',criadoEm:'2026-11-02T12:00:00Z',detalhes:{}}))});await render(<AccountHistory/>);expect(container.querySelectorAll('.account-timeline > li')).toHaveLength(12);await click('Próxima');expect(container.querySelectorAll('.account-timeline > li')).toHaveLength(1);expect(container.textContent).toContain('Conta 12');
});
