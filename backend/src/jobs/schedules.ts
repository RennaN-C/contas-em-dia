import cron from 'node-cron';
import { processNotifications } from '../modules/notifications/notifications.service.js';
import { processWeeklySummaries } from '../modules/messages/messages.service.js';

export async function runDaily(now = new Date()) {
  try { await processNotifications(now); }
  catch (error) { console.error('Falha no job diário de avisos', error); }
}
export async function runWeekly(now = new Date()) {
  try { await processWeeklySummaries(now); }
  catch (error) { console.error('Falha no job semanal de mensagens', error); }
}
export function startSchedules() {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return [];
  return [
    cron.schedule('0 9 * * *', () => runDaily(), { timezone: 'UTC', noOverlap: true }),
    cron.schedule('5 9 * * 1', () => runWeekly(), { timezone: 'UTC', noOverlap: true })
  ];
}
