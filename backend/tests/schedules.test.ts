import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('node-cron', () => ({ default: { schedule: vi.fn() } }));
vi.mock('../src/modules/notifications/notifications.service.js', () => ({ processNotifications: vi.fn() }));
vi.mock('../src/modules/messages/messages.service.js', () => ({ processWeeklySummaries: vi.fn() }));
vi.mock('../src/modules/accounts/recurrence.service.js', () => ({ materializeRecurrences: vi.fn() }));
vi.mock('../src/jobs/recovery.js', () => ({ recoverJobs: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/jobs/discord.js', () => ({ runDiscord: vi.fn().mockResolvedValue(undefined) }));
import cron from 'node-cron';
import { processNotifications } from '../src/modules/notifications/notifications.service.js';
import { processWeeklySummaries } from '../src/modules/messages/messages.service.js';
import { runDaily, runWeekly, runNotificationScan, startSchedules } from '../src/jobs/schedules.js';
import { runDiscord } from '../src/jobs/discord.js';
import { materializeRecurrences } from '../src/modules/accounts/recurrence.service.js';
beforeEach(() => vi.clearAllMocks());
it('não inicializa cron nos testes nem na importação', () => {
  expect(cron.schedule).not.toHaveBeenCalled(); expect(startSchedules()).toEqual([]); expect(cron.schedule).not.toHaveBeenCalled();
});
it('configura horários e timezone explícitos sem sobreposição', () => {
  vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('VITEST', '');
  try {
    startSchedules();
    expect(cron.schedule).toHaveBeenCalledWith('*/10 * * * * *', expect.any(Function), { timezone: 'America/Sao_Paulo', noOverlap: true });
    expect(cron.schedule).toHaveBeenCalledWith('0 6 * * *', expect.any(Function), { timezone: 'America/Sao_Paulo', noOverlap: true });
    expect(cron.schedule).toHaveBeenCalledWith('5 6 * * 1', expect.any(Function), { timezone: 'America/Sao_Paulo', noOverlap: true });
  } finally { vi.unstubAllEnvs(); }
});
it('orquestra reexecução diária e semanal com mesma data', async () => {
  const now = new Date('2026-10-25');
  await runDaily(now); await runDaily(now); await runWeekly(now); await runWeekly(now);
  expect(processNotifications).toHaveBeenCalledTimes(2); expect(processNotifications).toHaveBeenLastCalledWith(now);
  expect(processWeeklySummaries).toHaveBeenCalledTimes(2);
});
it('verificação rápida enfileira avisos antes de enviar, sem materializar contas ou gerar resumo', async () => {
  const now = new Date('2026-11-06');
  const calls: string[] = [];
  vi.mocked(processNotifications).mockImplementationOnce(async () => { calls.push('avisos'); });
  vi.mocked(runDiscord).mockImplementationOnce(async () => { calls.push('envio'); });
  await runNotificationScan(now);
  expect(processNotifications).toHaveBeenCalledWith(now);
  expect(calls).toEqual(['avisos', 'envio']);
  expect(materializeRecurrences).not.toHaveBeenCalled();
  expect(processWeeklySummaries).not.toHaveBeenCalled();
});
it('registra falhas sem derrubar processo', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    vi.mocked(processNotifications).mockRejectedValue(new Error('offline'));
    vi.mocked(processWeeklySummaries).mockRejectedValue(new Error('offline'));
    await expect(runDaily()).resolves.toBeUndefined(); await expect(runWeekly()).resolves.toBeUndefined(); expect(log).toHaveBeenCalledTimes(2);
  } finally { log.mockRestore(); }
});
