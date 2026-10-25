import { Router } from 'express';
import { env } from '../../config/env.js';
import { createAuthenticate, getAuthenticatedUserId as uid } from '../../middlewares/authenticate.js';
import { handle } from '../accounts/accounts.routes.js';
import { weeklySummary, processWeeklySummaries } from '../messages/messages.service.js';
import { listNotifications, processNotifications } from './notifications.service.js';
import { materializeRecurrences } from '../accounts/recurrence.service.js';
import { businessDay } from './dates.js';
import { listInterestEstimates } from './interest.service.js';

export const notificationsRoutes = Router();
notificationsRoutes.use(createAuthenticate(env.JWT_SECRET));
notificationsRoutes.get('/', handle(async (r, s) => s.json({ notifications: await listNotifications(uid(r)) })));
notificationsRoutes.get('/weekly-summary', handle(async (r, s) => s.json({ summary: await weeklySummary(uid(r)) })));
notificationsRoutes.get('/interest-estimates', handle(async (r, s) => s.json(await listInterestEstimates(uid(r)))));
notificationsRoutes.post('/refresh', handle(async (r, s) => {
  const day = businessDay(), userId = uid(r);
  await materializeRecurrences(day, userId);
  await processNotifications(day, userId);
  await processWeeklySummaries(day, userId);
  s.json({ message: 'Avisos atualizados' });
}));
