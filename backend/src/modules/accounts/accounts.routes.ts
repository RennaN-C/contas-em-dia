import { Router, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { materializeRecurrences, setRecurrenceActive } from './recurrence.service.js';
import { businessDay } from '../notifications/dates.js';
import { env } from '../../config/env.js';
import { createAuthenticate, getAuthenticatedUserId } from '../../middlewares/authenticate.js';
import { validationError } from '../../lib/validation-error.js';
import { accountSchema, idSchema, statusSchema } from './accounts.schema.js';
import { AccountError, createAccount, getAccount, listAccounts, mutateAccount } from './accounts.service.js';
import { paymentSchema, registerPayment } from '../payments/payments.service.js';
export const accountsRoutes=Router();
accountsRoutes.use(createAuthenticate(env.JWT_SECRET));
export const handle = (fn:(r:Request,s:Response)=>Promise<unknown>) => async(r:Request,s:Response) => {
 try { await fn(r,s); } catch(e) {
  if(e instanceof ZodError) { validationError(s,e); return; }
  if(e instanceof AccountError) {s.status(e.status).json({message:e.message});return;}
  if(e && typeof e==='object' && 'code' in e && (e.code==='P2034'||e.code==='P2002'||(e.code==='P2010' && ['40001','40P01'].includes(String((e as {meta?:{code?:unknown}}).meta?.code))))) {s.status(409).json({message:'Operação concorrente; atualize e tente novamente com a mesma chave'});return;}
  console.error(e); s.status(500).json({message:'Erro interno do servidor'});
 }
};
const uid=getAuthenticatedUserId;
accountsRoutes.get('/',handle(async(r,s)=>s.json({accounts:await listAccounts(uid(r),statusSchema.parse(r.query.status))})));
accountsRoutes.post('/',handle(async(r,s)=>s.status(201).json({account:await createAccount(uid(r),accountSchema.parse(r.body))})));
accountsRoutes.post('/recurrences/sync',handle(async(r,s)=>s.json(await materializeRecurrences(businessDay(),uid(r)))));
accountsRoutes.patch('/:id/recurrence',handle(async(r,s)=>s.json(await setRecurrenceActive(uid(r),idSchema.parse(r.params.id),z.object({ativa:z.boolean()}).strict().parse(r.body).ativa))));
accountsRoutes.get('/:id',handle(async(r,s)=>s.json({account:await getAccount(uid(r),idSchema.parse(r.params.id))})));
accountsRoutes.put('/:id',handle(async(r,s)=>s.json({account:await mutateAccount(uid(r),idSchema.parse(r.params.id),accountSchema.parse(r.body))})));
accountsRoutes.delete('/:id',handle(async(r,s)=>s.json(await mutateAccount(uid(r),idSchema.parse(r.params.id)))));
accountsRoutes.post('/:id/payments',handle(async(r,s)=>s.status(201).json({payment:await registerPayment(uid(r),idSchema.parse(r.params.id),paymentSchema.parse(r.body))})));
