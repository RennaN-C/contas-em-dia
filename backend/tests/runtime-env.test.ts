import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { parse } from 'dotenv';
import { prepareRuntimeEnv } from '../src/config/runtime-env.js';

const directories: string[] = [];
function directory() {
  const path = mkdtempSync(join(tmpdir(), 'saldo-runtime-test-'));
  directories.push(path);
  return path;
}
afterEach(() => {
  for (const path of directories.splice(0)) {
    if (!resolve(path).startsWith(resolve(tmpdir()) + sep)) throw new Error('Diretório de teste inválido');
    rmSync(path, { recursive: true });
  }
});
it('gera uma chave aleatória em .env e preserva nas próximas inicializações', () => {
  const path = directory();
  prepareRuntimeEnv(path, '');
  const initial = readFileSync(join(path, '.env'), 'utf8');
  expect(parse(initial).JWT_SECRET).toMatch(/^[a-f0-9]{64}$/);
  prepareRuntimeEnv(path, '');
  expect(readFileSync(join(path, '.env'), 'utf8')).toBe(initial);
});
it('instalações independentes recebem chaves diferentes', () => {
  const first = directory(), second = directory();
  prepareRuntimeEnv(first, '');
  prepareRuntimeEnv(second, '');
  expect(readFileSync(join(first, '.env'), 'utf8')).not.toBe(readFileSync(join(second, '.env'), 'utf8'));
});
it('respeita a chave fornecida no ambiente', () => {
  const path = directory();
  prepareRuntimeEnv(path, 'minha-chave-configurada-manualmente');
  expect(() => readFileSync(join(path, '.env'))).toThrow();
});
it('recusa arquivo corrompido sem substituir a chave silenciosamente', () => {
  const path = directory();
  writeFileSync(join(path, '.env'), 'JWT_SECRET=invalida');
  expect(() => prepareRuntimeEnv(path, '')).toThrow('Configuração persistida inválida');
  expect(readFileSync(join(path, '.env'), 'utf8')).toBe('JWT_SECRET=invalida');
});
