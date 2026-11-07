import { createPublicKey, verify, createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { discordConfig } from './config.js';

export const hashCode = (value: string) => createHash('sha256').update(value).digest('hex');
export function verifyDiscord(raw: Buffer, signature: string | undefined, timestamp: string | undefined, key: string, now = Date.now()) {
  if (!signature || !/^[a-f\d]{128}$/i.test(signature) || !timestamp || !/^\d{10}$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  try {
    const publicKey = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(key, 'hex')]), format: 'der', type: 'spki' });
    return verify(null, Buffer.concat([Buffer.from(timestamp), raw]), publicKey, Buffer.from(signature, 'hex'));
  } catch { return false; }
}
export function seal(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', Buffer.from(discordConfig().DISCORD_ENCRYPTION_KEY, 'hex'), iv);
  const bytes = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString('base64');
}
export function unseal(value: string) {
  const bytes = Buffer.from(value, 'base64');
  const cipher = createDecipheriv('aes-256-gcm', Buffer.from(discordConfig().DISCORD_ENCRYPTION_KEY, 'hex'), bytes.subarray(0, 12));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString('utf8');
}
