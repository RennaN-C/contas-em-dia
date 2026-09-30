import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .transform((value) => value.toLowerCase()),
  senha: z.string().min(1, "Senha é obrigatória").max(72)
});

export type LoginInput = z.infer<typeof loginSchema>;
