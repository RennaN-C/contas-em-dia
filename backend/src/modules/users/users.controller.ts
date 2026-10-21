import type { Request, Response } from "express";
import { ZodError } from "zod";
import { validationError } from "../../lib/validation-error.js";
import { getAuthenticatedUserId } from "../../middlewares/authenticate.js";
import { EmailAlreadyInUseError } from "./register-user.service.js";
import {
  getProfile,
  updateProfile,
  UserNotFoundError
} from "./user-profile.service.js";
import { updateProfileSchema } from "./user.schema.js";

export async function showMe(request: Request, response: Response) {
  try {
    const user = await getProfile(getAuthenticatedUserId(request));

    return response.status(200).json({ user });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return response.status(404).json({ message: error.message });
    }

    console.error("Erro ao consultar perfil", error);
    return response.status(500).json({ message: "Erro interno do servidor" });
  }
}

export async function updateMe(request: Request, response: Response) {
  try {
    const input = updateProfileSchema.parse(request.body);
    const user = await updateProfile(getAuthenticatedUserId(request), input);

    return response.status(200).json({ user });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(response, error);
    }

    if (error instanceof UserNotFoundError) {
      return response.status(404).json({ message: error.message });
    }

    if (error instanceof EmailAlreadyInUseError) {
      return response.status(409).json({ message: error.message });
    }

    console.error("Erro ao atualizar perfil", error);
    return response.status(500).json({ message: "Erro interno do servidor" });
  }
}
