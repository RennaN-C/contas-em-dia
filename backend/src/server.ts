import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  console.log(`ContasEmDia API executando na porta ${env.PORT}`);
});
