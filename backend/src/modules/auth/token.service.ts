import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRES_IN = "1d";

export class InvalidTokenError extends Error {
  constructor() {
    super("Token inválido ou expirado");
    this.name = "InvalidTokenError";
  }
}

export function createAccessToken(userId: string, secret: string): string {
  return jwt.sign(
    {
      sub: userId
    },
    secret,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN
    }
  );
}

export function verifyAccessToken(token: string, secret: string): string {
  try {
    const payload = jwt.verify(token, secret);

    if (typeof payload !== "object" || typeof payload.sub !== "string" || !payload.sub) {
      throw new InvalidTokenError();
    }

    return payload.sub;
  } catch {
    throw new InvalidTokenError();
  }
}
