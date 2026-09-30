import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRES_IN = "1d";

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
