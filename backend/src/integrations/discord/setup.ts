import { discordClient } from './client.js';

export async function configureDiscordEndpoint(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/api/webhook/discord') {
    throw new Error('Informe uma URL HTTPS terminando em /api/webhook/discord, sem credenciais ou parâmetros');
  }
  await discordClient.identity();
  await discordClient.request('/applications/@me', 'PATCH', { interactions_endpoint_url: url.href });
  const identity = await discordClient.identity();
  if (identity.endpoint !== url.href) throw new Error('Discord não confirmou o endpoint informado');
  return identity;
}
