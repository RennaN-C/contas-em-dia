import { Router } from 'express';
import { env } from '../../config/env.js';
import { createAuthenticate, getAuthenticatedUserId as uid } from '../../middlewares/authenticate.js';
import { handle } from '../accounts/accounts.routes.js';
import { weeklySummary } from '../messages/messages.service.js';
import { listNotifications } from './notifications.service.js';
import { listInterestEstimates } from './interest.service.js';

export const notificationsRoutes = Router();
notificationsRoutes.use(createAuthenticate(env.JWT_SECRET));
notificationsRoutes.get('/', handle(async (r, s) => s.json({ notifications: await listNotifications(uid(r)) })));
notificationsRoutes.get('/weekly-summary', handle(async (r, s) => s.json({ summary: await weeklySummary(uid(r)) })));
notificationsRoutes.get('/interest-estimates', handle(async (r, s) => s.json(await listInterestEstimates(uid(r)))));
