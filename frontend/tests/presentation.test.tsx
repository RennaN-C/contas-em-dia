// @vitest-environment jsdom
import {act,type ReactNode} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
const {login}=vi.hoisted(()=>({login:vi.fn()}));
vi.mock('../src/features/auth/useAuth',()=>({useAuth:()=>({user:{id:'user',nome:'Rennan',email:'rennan@example.org'},login,logout:vi.fn()})}));
vi.mock('../src/features/auth/auth.service',()=>({updateCurrentUser:vi.fn(),registerUser:vi.fn()}));
vi.mock('../src/features/messages/messages.api',()=>({messagesApi:{list:vi.fn(),read:vi.fn(),readAll:vi.fn()}}));
import {ProfilePage} from '../src/pages/ProfilePage';
import {RegisterForm} from '../src/features/auth/RegisterForm';
import {Messages} from '../src/features/messages/Messages';
import {updateCurrentUser,registerUser} from '../src/features/auth/auth.service';
import {saveSession} from '../src/features/auth/session';
import {messagesApi,type Message} from '../src/features/messages/messages.api';
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let container:HTMLDivElement,root:Root;
beforeEach(()=>{vi.resetAllMocks();localStorage.clear();container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(()=>{act(()=>root.unmount());container.remove();});
async function render(node:ReactNode){await act(async()=>root.render(<MemoryRouter>{node}</MemoryRouter>));}
async function submit(){await act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));}
async function click(text:string){const button=[...container.querySelectorAll('button')].find(b=>b.textContent===text)!;expect(button).toBeTruthy();await act(async()=>button.click());}
async function input(id:string,value:string){const element=container.querySelector<HTMLInputElement>(id)!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));});}
it('perfil salva alterações reais e preserva o token da sessão',async()=>{saveSession({token:'jwt-existente',user:{id:'user',nome:'Rennan',email:'rennan@example.org'}});vi.mocked(updateCurrentUser).mockResolvedValue({id:'user',nome:'Rennan Atualizado',email:'rennan@example.org'});await render(<ProfilePage/>);await click('Editar perfil');container.querySelector<HTMLInputElement>('[name=nome]')!.value='Rennan Atualizado';await submit();expect(updateCurrentUser).toHaveBeenCalledWith({nome:'Rennan Atualizado',email:'rennan@example.org'});expect(login).toHaveBeenCalledWith({token:'jwt-existente',user:expect.objectContaining({nome:'Rennan Atualizado'})});expect(container.textContent).toContain('Perfil atualizado com sucesso');});
it('erro ao salvar perfil mantém formulário e oferece feedback',async()=>{vi.mocked(updateCurrentUser).mockRejectedValue(new Error('E-mail em uso'));await render(<ProfilePage/>);await click('Editar perfil');await submit();expect(container.querySelector('[role=alert]')?.textContent).toContain('E-mail em uso');expect(container.querySelector('button')?.disabled).toBe(false);});
it('cadastro pede confirmação e permite alternar visibilidade',async()=>{await render(<RegisterForm/>);expect(container.querySelector('#register-confirmation')).toBeTruthy();await click('Mostrar senhas');expect(container.querySelector<HTMLInputElement>('#register-senha')?.type).toBe('text');await click('Ocultar senhas');expect(container.querySelector<HTMLInputElement>('#register-confirmation')?.type).toBe('password');});
it('senhas divergentes impedem chamada de cadastro',async()=>{await render(<RegisterForm/>);await input('#register-nome','Rennan');await input('#register-email','r@example.org');await input('#register-senha','SenhaTeste2026');await input('#register-confirmation','outra-senha');await submit();expect(registerUser).not.toHaveBeenCalled();expect(container.textContent).toContain('As senhas devem ser iguais');});
const message:Message={id:'m',titulo:'Conta',conteudo:'Aviso',lida:false,tipo:'AVISO',criadoEm:'2026-10-25',conta:null};
it('marca todas como lidas e atualiza o contador',async()=>{vi.mocked(messagesApi.list).mockResolvedValue({messages:[message]});vi.mocked(messagesApi.readAll).mockResolvedValue({updated:1});await render(<Messages/>);await click('Marcar todas como lidas');expect(messagesApi.readAll).toHaveBeenCalledOnce();expect(container.textContent).toContain('0 não lida(s)');expect(container.textContent).toContain('Todas as mensagens foram marcadas');});
it('falha na leitura em lote preserva mensagens não lidas',async()=>{vi.mocked(messagesApi.list).mockResolvedValue({messages:[message]});vi.mocked(messagesApi.readAll).mockRejectedValue(new Error('Sem conexão'));await render(<Messages/>);await click('Marcar todas como lidas');expect(container.textContent).toContain('1 não lida(s)');expect(container.querySelector('[role=alert]')?.textContent).toContain('Sem conexão');});
