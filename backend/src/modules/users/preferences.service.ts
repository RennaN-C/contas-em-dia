import {z} from 'zod';
import {prisma} from '../../lib/prisma.js';
import {AccountError} from '../accounts/accounts.service.js';
export const preferencesSchema=z.object({ordenacaoContas:z.enum(['vencimento','valor','descricao']),confirmarPagamento:z.boolean(),reduzirMovimento:z.boolean()}).strict();
export const defaultPreferences={ordenacaoContas:'vencimento' as const,confirmarPagamento:true,reduzirMovimento:false};
async function ensureUser(usuarioId:string){if(!await prisma.usuario.findUnique({where:{id:usuarioId},select:{id:true}}))throw new AccountError('Usuário não encontrado',404);}
export async function getPreferences(usuarioId:string){await ensureUser(usuarioId);const row=await prisma.preferenciaUsuario.findUnique({where:{usuarioId}});return row?preferencesSchema.parse(rowToPreferences(row)):defaultPreferences;}
function rowToPreferences(row:{ordenacaoContas:string;confirmarPagamento:boolean;reduzirMovimento:boolean}){return {ordenacaoContas:row.ordenacaoContas,confirmarPagamento:row.confirmarPagamento,reduzirMovimento:row.reduzirMovimento};}
export async function savePreferences(usuarioId:string,input:z.infer<typeof preferencesSchema>){await ensureUser(usuarioId);const row=await prisma.preferenciaUsuario.upsert({where:{usuarioId},create:{usuarioId,...input},update:input});return rowToPreferences(row);}
