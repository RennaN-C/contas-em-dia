import { z } from "zod";

const nomeSchema = z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100);
const emailSchema = z.string().trim().email("E-mail inválido").transform((value) => value.toLowerCase());

export const registerUserSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").max(72).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Senha deve ter no máximo 72 bytes UTF-8')
}).strict();

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const updateProfileSchema = z
  .object({
    nome: nomeSchema.optional(),
    email: emailSchema.optional()
  })
  .strict()
  .refine((data) => data.nome !== undefined || data.email !== undefined, {
    message: "Informe nome ou e-mail para atualizar"
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
