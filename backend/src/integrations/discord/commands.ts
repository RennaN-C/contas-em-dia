import { discordClient } from './client.js';
import { discordConfig } from './config.js';

export const discordCommands = [
  { name: 'vincular', description: 'Conecta sua conta ao Saldo+', options: [{ type: 3, name: 'codigo', description: 'Código temporário gerado no Perfil do Saldo+', required: true, min_length: 32, max_length: 32 }] },
  { name: 'status', description: 'Consulta seu vínculo com o Saldo+' },
  { name: 'proximas-contas', description: 'Consulta suas despesas dos próximos 7 dias em resposta privada' },
  { name: 'desvincular', description: 'Solicita confirmação para desconectar o Discord' }
];
export async function registerCommands(global = false) {
  const config = discordConfig();
  if (!config.enabled) throw new Error('Habilite e configure o Discord antes de registrar comandos');
  if (!global && !config.DISCORD_GUILD_ID) throw new Error('Informe DISCORD_GUILD_ID do servidor privado de testes');
  await discordClient.identity();
  const scope = global ? `/applications/${config.DISCORD_APPLICATION_ID}/commands` : `/applications/${config.DISCORD_APPLICATION_ID}/guilds/${config.DISCORD_GUILD_ID}/commands`;
  // POST upserts each command by name, preserving unrelated commands.
  for (const command of discordCommands) await discordClient.request(scope, 'POST', { type: 1, ...command });
}
