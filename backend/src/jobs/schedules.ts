import cron from 'node-cron';
import { processNotifications } from '../modules/notifications/notifications.service.js';
import { processWeeklySummaries } from '../modules/messages/messages.service.js';
import { recoverJobs } from './recovery.js';
import { materializeRecurrences } from '../modules/accounts/recurrence.service.js';
import { businessDay } from '../modules/notifications/dates.js';
import { runDiscord } from './discord.js';
import { jobRuns } from '../lib/metrics.js';

export async function runDaily(now = businessDay()) {
  try { await materializeRecurrences(now); await processNotifications(now); jobRuns.inc({ job: 'daily', result: 'ok' }); }
  catch (error) { jobRuns.inc({ job: 'daily', result: 'error' }); console.error('Falha no job diário de avisos', error); }
}
export async function runWeekly(now = businessDay()) {
  try { await processWeeklySummaries(now); jobRuns.inc({ job: 'weekly', result: 'ok' }); }
  catch (error) { jobRuns.inc({ job: 'weekly', result: 'error' }); console.error('Falha no job semanal de mensagens', error); }
}
async function runRecovery() {
  try { await recoverJobs(); jobRuns.inc({ job: 'recovery', result: 'ok' }); }
  catch { jobRuns.inc({ job: 'recovery', result: 'error' }); console.error('Falha na recuperação de jobs'); }
}
export function startSchedules() {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return [];
  void runRecovery();
  return [
    cron.schedule('*/5 * * * * *', () => runDiscord(), { timezone: 'America/Sao_Paulo', noOverlap: true }),
    cron.schedule('0 6 * * *', () => runDaily(), { timezone: 'America/Sao_Paulo', noOverlap: true }),
    cron.schedule('5 6 * * 1', () => runWeekly(), { timezone: 'America/Sao_Paulo', noOverlap: true }),
    cron.schedule('*/15 * * * *', () => runRecovery(), { timezone: 'America/Sao_Paulo', noOverlap: true })
  ];
}
