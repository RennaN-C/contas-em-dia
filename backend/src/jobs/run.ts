import { prisma } from '../lib/prisma.js';
import { dateOnly } from '../modules/accounts/accounts.schema.js';
import { processNotifications } from '../modules/notifications/notifications.service.js';
import { processWeeklySummaries } from '../modules/messages/messages.service.js';
import { materializeRecurrences } from '../modules/accounts/recurrence.service.js';
import { recoverJobs } from './recovery.js';
import { businessDay } from '../modules/notifications/dates.js';

// One-shot entry point for recovery; imports never register cron schedules.
try {
  const [job, date] = process.argv.slice(2);
  const now = date ? new Date(dateOnly.parse(date)) : businessDay();
  if (job === 'daily') { await materializeRecurrences(now); await processNotifications(now); }
  else if (job === 'weekly') await processWeeklySummaries(now);
  else if (job === 'recover') await recoverJobs(now);
  else throw new Error('Informe daily, weekly ou recover e, opcionalmente, uma data AAAA-MM-DD');
  console.log(`Job ${job} concluído para ${now.toISOString().slice(0, 10)}`);
} catch (error) {
  console.error('Falha na execução manual do job', error);
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
