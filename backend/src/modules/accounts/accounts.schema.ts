import { z } from 'zod';
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use AAAA-MM-DD').refine(v => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, 'Data inválida');
export const money = z.number().positive().max(9999999999.99).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.0001, 'Use até duas casas decimais');
export const accountSchema = z.object({ descricao: z.string().trim().min(1).max(200), valor: money, vencimento: dateOnly, tipo: z.enum(['AVULSA','RECORRENTE']), recorrencia: z.literal('MENSAL').nullable().optional() }).strict().superRefine((v,c) => {
 if (v.tipo === 'RECORRENTE' && v.recorrencia !== 'MENSAL') c.addIssue({code:'custom',path:['recorrencia'],message:'Informe MENSAL'});
 if (v.tipo === 'AVULSA' && v.recorrencia) c.addIssue({code:'custom',path:['recorrencia'],message:'Conta avulsa não possui recorrência'});
});
export const statusSchema = z.enum(['PENDENTE','PAGA','ATRASADA']).optional();
export const idSchema = z.string().uuid();
export type AccountInput = z.infer<typeof accountSchema>;
