import type { Response } from "express";
import type { ZodError } from "zod";

export function validationError(response: Response, error: ZodError) {
  return response.status(400).json({
    message: "Dados inválidos",
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }))
  });
}
