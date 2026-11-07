import { z } from 'zod';

export const discordEnvSchema = z.object({
  DISCORD_ENABLED: z.enum(['true', 'false']).default('false'),
  DISCORD_BOT_TOKEN: z.string().default(''),
  DISCORD_APPLICATION_ID: z.string().default(''),
  DISCORD_PUBLIC_KEY: z.string().default(''),
  DISCORD_GUILD_ID: z.string().default(''),
  DISCORD_ENCRYPTION_KEY: z.string().default('')
}).superRefine((v, ctx) => {
  if (v.DISCORD_ENABLED !== 'true') return;
  const required = {
    DISCORD_BOT_TOKEN: v.DISCORD_BOT_TOKEN.length >= 20,
    DISCORD_APPLICATION_ID: /^\d{17,20}$/.test(v.DISCORD_APPLICATION_ID),
    DISCORD_PUBLIC_KEY: /^[a-f\d]{64}$/i.test(v.DISCORD_PUBLIC_KEY),
    DISCORD_ENCRYPTION_KEY: /^[a-f\d]{64}$/i.test(v.DISCORD_ENCRYPTION_KEY)
  };
  for (const [key, valid] of Object.entries(required)) if (!valid) ctx.addIssue({ code: 'custom', path: [key], message: 'Configuração Discord obrigatória inválida' });
  if (v.DISCORD_GUILD_ID && !/^\d{17,20}$/.test(v.DISCORD_GUILD_ID)) ctx.addIssue({ code: 'custom', path: ['DISCORD_GUILD_ID'], message: 'Servidor inválido' });
});

// Called after dotenv initialization by config/env; no secrets in validation errors.
export const discordConfig = () => {
  const result = discordEnvSchema.safeParse(process.env);
  if (!result.success) throw new Error(`Configuração Discord inválida: ${result.error.issues.map(i => i.path.join('.')).join(', ')}`);
  return { ...result.data, enabled: result.data.DISCORD_ENABLED === 'true' };
};
