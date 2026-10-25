import { Router } from 'express';
import { env } from '../../config/env.js';
import { createAuthenticate, getAuthenticatedUserId as uid } from '../../middlewares/authenticate.js';
import { handle } from '../accounts/accounts.routes.js';
import { idSchema } from '../accounts/accounts.schema.js';
import { listMessages, markRead, messageSummary, markAllRead } from './messages.service.js';

export const messagesRoutes = Router();
messagesRoutes.use(createAuthenticate(env.JWT_SECRET));
messagesRoutes.get('/', handle(async (r, s) => s.json({ messages: await listMessages(uid(r)) })));
messagesRoutes.get('/summary', handle(async (r, s) => s.json(await messageSummary(uid(r)))));
messagesRoutes.patch('/read-all', handle(async (r, s) => s.json(await markAllRead(uid(r)))));
messagesRoutes.patch('/:id/read', handle(async (r, s) => s.json({ message: await markRead(uid(r), idSchema.parse(r.params.id)) })));
