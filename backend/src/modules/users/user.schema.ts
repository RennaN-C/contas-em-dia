import { z } from "zod";

export const registerUserSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().trim().email("E-mail inválido").transform((value) => value.toLowerCase()),
  senha: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").max(72)
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
