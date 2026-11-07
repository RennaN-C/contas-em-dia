// Runs only against a dedicated, explicitly named migration-test database.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';

const url = new URL(process.env.MIGRATION_DATABASE_URL ?? '');
assert.match(url.pathname, /\/saldo_migration_test$/);
process.env.DATABASE_URL = url.toString();
const { prisma } = await import('../dist/src/lib/prisma.js');
const cli = resolve('node_modules/prisma/build/index.js');
const baseline = mkdtempSync(join(tmpdir(), 'saldo-migrations-'));
copyFileSync('prisma/schema.prisma', join(baseline, 'schema.prisma'));
mkdirSync(join(baseline, 'migrations'));
copyFileSync('prisma/migrations/migration_lock.toml', join(baseline, 'migrations/migration_lock.toml'));
for (const name of readdirSync('prisma/migrations').filter(name => /^\d/.test(name) && name < '20261107000000')) {
  mkdirSync(join(baseline, 'migrations', name));
  copyFileSync(join('prisma/migrations', name, 'migration.sql'), join(baseline, 'migrations', name, 'migration.sql'));
}
function migrate(schema) { execFileSync(process.execPath, [cli, 'migrate', 'deploy', '--schema', schema], { stdio: 'inherit', env: process.env }); }
try {
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  assert.equal(tables.length, 0, 'Use um banco vazio e exclusivo de migrações');
  migrate(join(baseline, 'schema.prisma'));
  await prisma.$executeRaw`INSERT INTO usuarios (id,nome,email,senha_hash,atualizado_em) VALUES ('migration-owner','Preservar','migration@invalid.example','sem-login',now())`;
  await prisma.$executeRaw`INSERT INTO mensagens (id,usuario_id,titulo,conteudo) VALUES ('migration-message','migration-owner','Anterior','Dado anterior preservado')`;
  migrate(resolve('prisma/schema.prisma'));
  const message = await prisma.mensagem.findUniqueOrThrow({ where: { id: 'migration-message' } });
  assert.equal(message.conteudo, 'Dado anterior preservado'); assert.equal(message.plataforma, 'INTERNA');
  await prisma.mensagem.create({ data: { titulo: 'Sem vínculo', conteudo: 'Comando Discord', plataforma: 'DISCORD', direcao: 'entrada' } });
  await assert.rejects(() => prisma.mensagem.create({ data: { titulo: 'Inválida', conteudo: 'Sem proprietário interno' } }));
  await assert.rejects(() => prisma.$executeRaw`UPDATE mensagens SET status = 'lida' WHERE id = 'migration-message'`);
  const count = await prisma.mensagem.count(); assert.equal(count, 2);
  console.log('MIGRATIONS OK: banco vazio → baseline populado → Discord; dados preservados e constraints verificadas.');
} finally { await prisma.$disconnect(); }
