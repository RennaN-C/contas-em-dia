import { prisma } from '../lib/prisma.js';
import { transaction } from './transaction.js';
import { processNotifications } from '../modules/notifications/notifications.service.js';
import { processWeeklySummaries } from '../modules/messages/messages.service.js';
import { materializeRecurrences } from '../modules/accounts/recurrence.service.js';
import { addDays, utcDay, weekStart, businessDay } from '../modules/notifications/dates.js';

/** Durable completion markers; failures stay pending. Unique writes in each domain
 * make retry after a crash or across multiple instances safe. */
export async function recoverJobs(now = businessDay()) {
  await materializeRecurrences(now);
  for (let offset = -7; offset <= 0; offset++) {
    const date = addDays(utcDay(now), offset), key = `daily:${date.toISOString().slice(0, 10)}`;
    if (offset < 0 && await prisma.execucaoJob.findUnique({ where: { chave: key } })) continue;
    await processNotifications(date);
    await transaction(tx => tx.execucaoJob.upsert({ where: { chave: key }, update: {}, create: { chave: key, concluidoEm: new Date() } }));
  }
  const week = weekStart(now), key = `weekly:${week.toISOString().slice(0, 10)}`;
  {
    await processWeeklySummaries(now);
    await prisma.execucaoJob.upsert({ where: { chave: key }, update: {}, create: { chave: key, concluidoEm: new Date() } });
  }
}
