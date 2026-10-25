import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRES_IN = "8h";

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
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      algorithm: 'HS256'
    }
  );
}

export function verifyAccessToken(token: string, secret: string): string {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });

    if (typeof payload !== "object" || typeof payload.sub !== "string" || !payload.sub) {
      throw new InvalidTokenError();
    }

    return payload.sub;
  } catch {
    throw new InvalidTokenError();
  }
}
