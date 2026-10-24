import { Router } from 'express';
import { env } from '../../config/env.js';
import { createAuthenticate, getAuthenticatedUserId } from '../../middlewares/authenticate.js';
import { handle } from '../accounts/accounts.routes.js';
import { idSchema } from '../accounts/accounts.schema.js';
import { listPayments } from './payments.service.js';
export const paymentsRoutes=Router();
paymentsRoutes.use(createAuthenticate(env.JWT_SECRET));
paymentsRoutes.get('/',handle(async(r,s)=>s.json({payments:await listPayments(getAuthenticatedUserId(r),r.query.contaId===undefined?undefined:idSchema.parse(r.query.contaId))})));
