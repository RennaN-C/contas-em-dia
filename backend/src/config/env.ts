import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5174,http://127.0.0.1:5175'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0)
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === 'production' && (value.JWT_SECRET.length < 32 || /troque|example|teste|test|desenvolvimento/i.test(value.JWT_SECRET))) ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'Produção exige um segredo aleatório de pelo menos 32 caracteres' });
  if (value.CORS_ORIGINS.includes('*')) ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'Informe origens explícitas, sem wildcard' });
});

export const env = envSchema.parse(process.env);
