import '../../config/env.js';
import { discordClient, DiscordError } from './client.js';
import { registerCommands } from './commands.js';
import { configureDiscordEndpoint } from './setup.js';
try {
  if (process.argv[2] === 'register') {
    await registerCommands(process.argv.includes('--global'));
    console.log('Comandos Saldo+ registrados na aplicação configurada.');
  } else if (process.argv[2] === 'endpoint') {
    await configureDiscordEndpoint(process.argv[3] ?? '');
    console.log('Endpoint HTTPS registrado e confirmado pelo Discord.');
  } else {
    await discordClient.request('/users/@me');
    const result = await discordClient.identity();
    console.log(`Identidade Discord validada. Transporte configurado: ${result.transport}.`);
  }
} catch (error) {
  const detail = error instanceof DiscordError ? ` HTTP ${error.status}.` : '';
  console.error(`Não foi possível validar/configurar o Discord.${detail} Confira habilitação, credenciais, servidor e URL HTTPS. Nenhum segredo foi exibido.`);
  process.exitCode = 1;
}
