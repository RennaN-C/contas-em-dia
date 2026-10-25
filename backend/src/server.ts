import { app } from "./app.js";
import { env } from "./config/env.js";
import { startSchedules } from './jobs/schedules.js';

app.listen(env.PORT, () => {
  startSchedules();
  console.log(`ContasEmDia API executando na porta ${env.PORT}`);
});
