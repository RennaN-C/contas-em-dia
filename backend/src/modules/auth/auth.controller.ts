import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  EmailAlreadyInUseError,
  registerUser
} from "../users/register-user.service.js";
import { registerUserSchema } from "../users/user.schema.js";

export async function register(request: Request, response: Response) {
  try {
    const input = registerUserSchema.parse(request.body);
    const user = await registerUser(input);

    return response.status(201).json({ user });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    if (error instanceof EmailAlreadyInUseError) {
      return response.status(409).json({ message: error.message });
    }

    console.error("Erro ao cadastrar usuário", error);
    return response.status(500).json({ message: "Erro interno do servidor" });
  }
}
