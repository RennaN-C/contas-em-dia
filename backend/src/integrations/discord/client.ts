import { z } from 'zod';
import { discordConfig } from './config.js';

export class DiscordError extends Error {
  constructor(readonly status: number, readonly retryAfter = 0, readonly uncertain = false) { super(`Discord HTTP ${status}`); }
}
const snowflake = z.string().regex(/^\d{17,20}$/);
export class DiscordClient {
  constructor(private readonly fetcher: typeof fetch = fetch) {}
  async request(path: string, method = 'GET', body?: unknown, authenticated = true) {
    const config = discordConfig();
    let response: Response;
    try {
      response = await this.fetcher(`https://discord.com/api/v10${path}`, { method, headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bot ${config.DISCORD_BOT_TOKEN}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000) });
    } catch { throw new DiscordError(503, 0, method === 'POST' && path.endsWith('/messages')); }
    const json: unknown = response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) {
      const rate = z.object({ retry_after: z.number().nonnegative().optional() }).safeParse(json);
      throw new DiscordError(response.status, Math.max(Number(response.headers.get('retry-after')) || 0, rate.success ? rate.data.retry_after ?? 0 : 0));
    }
    return { json, wait: response.headers.get('x-ratelimit-remaining') === '0' ? Math.max(0, Number(response.headers.get('x-ratelimit-reset-after')) || 0) : 0 };
  }
  async identity() {
    const config = discordConfig();
    const { json } = await this.request('/oauth2/applications/@me');
    const app = z.object({ id: snowflake, verify_key: z.string(), interactions_endpoint_url: z.string().nullish() }).parse(json);
    if (app.id !== config.DISCORD_APPLICATION_ID || app.verify_key.toLowerCase() !== config.DISCORD_PUBLIC_KEY.toLowerCase()) throw new Error('Identidade da aplicação Discord divergente');
    return { configured: true, transport: app.interactions_endpoint_url ? 'HTTP' : 'GATEWAY', endpoint: app.interactions_endpoint_url ?? null };
  }
  async sendDM(discordId: string, id: string, content: string) {
    const dm = await this.request('/users/@me/channels', 'POST', { recipient_id: snowflake.parse(discordId) });
    const channel = z.object({ id: snowflake }).parse(dm.json);
    // Compact UUID is 22 chars: Discord nonce accepts at most 25.
    const nonce = Buffer.from(id.replaceAll('-', ''), 'hex').toString('base64url');
    const sent = await this.request(`/channels/${channel.id}/messages`, 'POST', { content: content.slice(0, 1900), nonce, enforce_nonce: true, allowed_mentions: { parse: [] }, components: [{ type: 1, components: [{ type: 2, style: 1, label: 'Confirmar recebimento', custom_id: `confirmar:${id}` }] }] });
    return { id: z.object({ id: snowflake }).parse(sent.json).id, wait: Math.max(dm.wait, sent.wait) };
  }
  async editResponse(token: string, body: unknown) {
    return this.request(`/webhooks/${discordConfig().DISCORD_APPLICATION_ID}/${encodeURIComponent(token)}/messages/@original`, 'PATCH', body, false);
  }
}
export const discordClient = new DiscordClient();
