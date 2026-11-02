import { app } from "./app.js";
import { env } from "./config/env.js";
import { startSchedules } from './jobs/schedules.js';
import { prisma } from './lib/prisma.js';

let schedules: ReturnType<typeof startSchedules> = [];
const server = app.listen(env.PORT, () => {
  schedules = startSchedules();
  console.log(`Saldo + API executando na porta ${env.PORT}`);
});

let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  console.log('Encerrando API e agendamentos…');
  const timeout = setTimeout(() => process.exit(1), 25_000);
  timeout.unref();
  void Promise.all(schedules.map(task => task.destroy())).catch(error => console.error('Falha ao encerrar agendamentos', error));
  server.close(() => {
    void prisma.$disconnect().then(() => {
      clearTimeout(timeout);
      process.exit(0);
    }).catch(() => process.exit(1));
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
