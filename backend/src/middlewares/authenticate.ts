import type { NextFunction, Request, RequestHandler, Response } from "express";
import { verifyAccessToken } from "../modules/auth/token.service.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const BEARER_PREFIX = "Bearer ";

export function createAuthenticate(secret: string): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    const header = request.headers.authorization;

    if (!header?.startsWith(BEARER_PREFIX)) {
      response.status(401).json({ message: "Token de autenticação não informado" });
      return;
    }

    const token = header.slice(BEARER_PREFIX.length).trim();

    try {
      request.userId = verifyAccessToken(token, secret);
    } catch {
      response.status(401).json({ message: "Token inválido ou expirado" });
      return;
    }

    next();
  };
}

export function getAuthenticatedUserId(request: Request): string {
  if (!request.userId) {
    throw new Error("Rota protegida acessada sem o middleware de autenticação");
  }

  return request.userId;
}
