import type { Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../../config/env.js";
import {
  EmailAlreadyInUseError,
  registerUser
} from "../users/register-user.service.js";
import { registerUserSchema } from "../users/user.schema.js";
import { loginSchema } from "./auth.schema.js";
import {
  authenticateUser,
  InvalidCredentialsError
} from "./login-user.service.js";
import { createAccessToken } from "./token.service.js";

function validationError(response: Response, error: ZodError) {
  return response.status(400).json({
    message: "Dados inválidos",
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }))
  });
}

export async function register(request: Request, response: Response) {
  try {
    const input = registerUserSchema.parse(request.body);
    const user = await registerUser(input);

    return response.status(201).json({ user });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(response, error);
    }

    if (error instanceof EmailAlreadyInUseError) {
      return response.status(409).json({ message: error.message });
    }

    console.error("Erro ao cadastrar usuário", error);
    return response.status(500).json({ message: "Erro interno do servidor" });
  }
}

export async function login(request: Request, response: Response) {
  try {
    const input = loginSchema.parse(request.body);
    const user = await authenticateUser(input);
    const token = createAccessToken(user.id, env.JWT_SECRET);

    return response.status(200).json({
      token,
      user
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(response, error);
    }

    if (error instanceof InvalidCredentialsError) {
      return response.status(401).json({ message: error.message });
    }

    console.error("Erro ao autenticar usuário", error);
    return response.status(500).json({ message: "Erro interno do servidor" });
  }
}
