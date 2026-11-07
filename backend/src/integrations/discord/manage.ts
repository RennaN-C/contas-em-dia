import '../../config/env.js';
import { discordClient } from './client.js';
import { registerCommands } from './commands.js';
try {
  if (process.argv[2] === 'register') {
    await registerCommands(process.argv.includes('--global'));
    console.log('Comandos Saldo+ registrados na aplicação configurada.');
  } else {
    await discordClient.request('/users/@me');
    const result = await discordClient.identity();
    console.log(`Identidade Discord validada. Transporte configurado: ${result.transport}.`);
  }
} catch {
  console.error('Não foi possível validar/configurar o Discord. Confira habilitação, credenciais e servidor. Nenhum segredo foi exibido.');
  process.exitCode = 1;
}
