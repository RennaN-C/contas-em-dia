import '../../config/env.js';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { discordClient } from './client.js';
import { discordConfig } from './config.js';
import { configureDiscordEndpoint } from './setup.js';
import { registerCommands } from './commands.js';

const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));
function compose(...args: string[]) {
  return execFileSync('docker', ['compose', '--profile', 'discord', ...args], { cwd: repositoryRoot, encoding: 'utf8', timeout: 240_000 });
}
async function waitForTunnel(remaining = 45): Promise<string> {
  const urls = [...compose('logs', '--no-color', 'discord-tunnel').matchAll(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g)];
  const url = urls.at(-1)?.[0];
  if (url) {
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (response.ok) { await response.arrayBuffer(); return url; }
      await response.arrayBuffer();
    } catch { /* DNS/tunnel can take a few seconds to become reachable. */ }
  }
  if (remaining <= 0) throw new Error('Túnel HTTPS não ficou disponível');
  await delay(1000);
  return waitForTunnel(remaining - 1);
}
try {
  if (!discordConfig().enabled) throw new Error('Habilite Discord no .env antes de conectar');
  await discordClient.identity();
  console.log('Identidade validada. Iniciando aplicação e túnel local…');
  compose('up', '-d', '--wait', '--wait-timeout', '180');
  const origin = await waitForTunnel();
  await registerCommands();
  await configureDiscordEndpoint(`${origin}/api/webhook/discord`);
  console.log('Discord conectado por HTTPS e comandos registrados.');
  console.log('Abra http://localhost:5174/perfil e vincule sua conta com o código temporário.');
} catch {
  console.error('Conexão local não concluída. Confira Docker, credenciais e logs do túnel. Nenhum segredo foi exibido.');
  process.exitCode = 1;
}
