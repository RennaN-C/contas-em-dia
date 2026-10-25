import cron from 'node-cron';
import { processNotifications } from '../modules/notifications/notifications.service.js';
import { processWeeklySummaries } from '../modules/messages/messages.service.js';
import { recoverJobs } from './recovery.js';
import { materializeRecurrences } from '../modules/accounts/recurrence.service.js';
import { businessDay } from '../modules/notifications/dates.js';

export async function runDaily(now = businessDay()) {
  try { await materializeRecurrences(now); await processNotifications(now); }
  catch (error) { console.error('Falha no job diário de avisos', error); }
}
export async function runWeekly(now = businessDay()) {
  try { await processWeeklySummaries(now); }
  catch (error) { console.error('Falha no job semanal de mensagens', error); }
}
export function startSchedules() {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return [];
  void recoverJobs().catch(error => console.error('Falha na recuperação de jobs', error));
  return [
    cron.schedule('0 6 * * *', () => runDaily(), { timezone: 'America/Sao_Paulo', noOverlap: true }),
    cron.schedule('5 6 * * 1', () => runWeekly(), { timezone: 'America/Sao_Paulo', noOverlap: true }),
    cron.schedule('*/15 * * * *', async () => { try { await recoverJobs(); } catch(error) { console.error('Falha na recuperação de jobs', error); } }, { timezone: 'America/Sao_Paulo', noOverlap: true })
  ];
}
