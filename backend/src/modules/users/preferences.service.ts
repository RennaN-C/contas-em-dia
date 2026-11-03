import {z} from 'zod';
import {prisma} from '../../lib/prisma.js';
import {AccountError} from '../accounts/accounts.service.js';
import {categorySchema} from '../accounts/accounts.schema.js';
export const preferencesSchema=z.object({ordenacaoContas:z.enum(['vencimento','valor','descricao']),confirmarPagamento:z.boolean(),reduzirMovimento:z.boolean(),tipoContaPadrao:z.enum(['AVULSA','RECORRENTE']).default('AVULSA'),categoriaPadrao:categorySchema.default('OUTRAS'),inicioSemana:z.union([z.literal(0),z.literal(1)]).default(0),detalhesRelatorio:z.boolean().default(true)}).strict();
export const defaultPreferences={ordenacaoContas:'vencimento' as const,confirmarPagamento:true,reduzirMovimento:false,tipoContaPadrao:'AVULSA' as const,categoriaPadrao:'OUTRAS' as const,inicioSemana:0 as const,detalhesRelatorio:true};
async function ensureUser(usuarioId:string){if(!await prisma.usuario.findUnique({where:{id:usuarioId},select:{id:true}}))throw new AccountError('Usuário não encontrado',404);}
export async function getPreferences(usuarioId:string){await ensureUser(usuarioId);const row=await prisma.preferenciaUsuario.findUnique({where:{usuarioId}});return row?preferencesSchema.parse(rowToPreferences(row)):defaultPreferences;}
function rowToPreferences(row:z.infer<typeof preferencesSchema>|Record<string,unknown>){return preferencesSchema.parse({ordenacaoContas:row.ordenacaoContas,confirmarPagamento:row.confirmarPagamento,reduzirMovimento:row.reduzirMovimento,tipoContaPadrao:row.tipoContaPadrao,categoriaPadrao:row.categoriaPadrao,inicioSemana:row.inicioSemana,detalhesRelatorio:row.detalhesRelatorio});}
export async function savePreferences(usuarioId:string,input:z.infer<typeof preferencesSchema>){await ensureUser(usuarioId);const row=await prisma.preferenciaUsuario.upsert({where:{usuarioId},create:{usuarioId,...input},update:input});return rowToPreferences(row);}
