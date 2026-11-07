import express, { type RequestHandler } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { discordConfig } from './config.js';
import { hashCode, seal, verifyDiscord } from './crypto.js';
import { prisma } from '../../lib/prisma.js';

const id = z.string().regex(/^\d{17,20}$/);
const user = z.object({ id, bot: z.boolean().optional() });
export const interactionSchema = z.object({
  id, application_id: id, type: z.union([z.literal(2), z.literal(3)]),
  token: z.string().min(1).max(2048),
  user: user.optional(), member: z.object({ user }).optional(),
  data: z.object({
    name: z.string().max(32).optional(), custom_id: z.string().max(100).optional(),
    options: z.array(z.object({ name: z.string().max(32), type: z.literal(3), value: z.string().max(64) })).max(1).optional()
  }),
  message: z.object({ id }).optional()
}).superRefine((v, ctx) => {
  const actor = v.member?.user ?? v.user;
  if (!actor || actor.bot || (v.member && v.user && v.member.user.id !== v.user.id)) ctx.addIssue({ code: 'custom', message: 'Identidade inválida' });
  if (v.type === 2 && !v.data.name) ctx.addIssue({ code: 'custom', message: 'Comando ausente' });
  if (v.type === 3 && !v.data.custom_id) ctx.addIssue({ code: 'custom', message: 'Botão ausente' });
});
export type Interaction = z.infer<typeof interactionSchema>;

// Keep the received structure, but remove credentials and bearer invitation codes.
export function sanitizedPayload(value: unknown): Prisma.InputJsonValue {
  function clean(node: unknown): unknown {
    if (Array.isArray(node)) return node.map(clean);
    if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      return Object.fromEntries(Object.entries(record).filter(([key]) => !['token', 'authorization', 'secret'].includes(key.toLowerCase())).map(([key, item]) => [key, key === 'value' && record.name === 'codigo' && typeof item === 'string' ? hashCode(item) : clean(item)]));
    }
    return node;
  }
  return clean(value) as Prisma.InputJsonValue;
}

export const discordWebhook: RequestHandler = async (req, res) => {
  const config = discordConfig();
  if (!config.enabled) { res.status(503).json({ message: 'Discord desabilitado' }); return; }
  if (!Buffer.isBuffer(req.body) || !verifyDiscord(req.body, req.get('X-Signature-Ed25519'), req.get('X-Signature-Timestamp'), config.DISCORD_PUBLIC_KEY)) {
    res.status(401).json({ message: 'Assinatura inválida' }); return;
  }
  let payload: unknown;
  try { payload = JSON.parse(req.body.toString('utf8')); } catch { res.status(400).json({ message: 'JSON inválido' }); return; }
  if (payload && typeof payload === 'object' && 'type' in payload && payload.type === 1) {
    if ('application_id' in payload && payload.application_id !== config.DISCORD_APPLICATION_ID) { res.sendStatus(401); return; }
    res.json({ type: 1 }); return;
  }
  const parsed = interactionSchema.safeParse(payload);
  if (!parsed.success) { res.status(400).json({ message: 'Interação inválida' }); return; }
  const interaction = parsed.data;
  if (interaction.application_id !== config.DISCORD_APPLICATION_ID) { res.sendStatus(401); return; }
  try {
    // A bounded transaction persists before acknowledging. No external API on this path.
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SET LOCAL statement_timeout = '1200ms'`;
      await tx.interacaoDiscord.createMany({ data: { id: interaction.id, discordId: (interaction.member?.user ?? interaction.user)!.id, payload: sanitizedPayload(payload), segredo: seal(interaction.token) }, skipDuplicates: true });
      await tx.mensagem.createMany({ data: { plataforma: 'DISCORD', direcao: 'entrada', estado: 'enfileirada', tipo: 'DISCORD_INTERACAO', interacaoId: interaction.id, titulo: 'Interação Discord', conteudo: JSON.stringify(sanitizedPayload(interaction.data)), payloadBruto: sanitizedPayload(payload) }, skipDuplicates: true });
    }, { maxWait: 300, timeout: 1800 });
    res.json({ type: 5, data: { flags: 64 } });
  } catch { res.status(503).json({ message: 'Não foi possível registrar a interação; tente novamente' }); }
};

export const discordRawBody = express.raw({ type: 'application/json', limit: '64kb' });
