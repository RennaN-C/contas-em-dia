import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'dotenv';

/** Keeps the generated signing key across container rebuilds and restarts. */
export function prepareRuntimeEnv(directory: string, suppliedSecret = process.env.JWT_SECRET) {
  if (suppliedSecret) return;
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, '.env');
  try {
    const persisted = parse(readFileSync(path));
    if (!/^[a-f0-9]{64}$/.test(persisted.JWT_SECRET ?? '')) {
      throw new Error('Configuração persistida inválida. Verifique o volume runtime_config.');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    // Exclusive creation prevents replacing a key if two processes start together.
    writeFileSync(path, `JWT_SECRET=${randomBytes(32).toString('hex')}\n`, { mode: 0o600, flag: 'wx' });
  }
}
