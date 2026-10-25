import { rateLimit } from 'express-rate-limit';
import type { ErrorRequestHandler, RequestHandler } from 'express';

export function authRateLimit(limit = 30, windowMs = 15 * 60 * 1000) {
  return rateLimit({ windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false, skipSuccessfulRequests: true, message: { message: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' } });
}
export function apiRateLimit() {
  return rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Limite de requisições atingido. Aguarde antes de tentar novamente.' } });
}
export const noStore: RequestHandler = (_r, s, next) => { s.setHeader('Cache-Control', 'no-store'); next(); };
export const apiErrorHandler: ErrorRequestHandler = (error, _r, s, _next) => {
  if (error?.type === 'entity.too.large') { s.status(413).json({ message: 'Requisição excede o tamanho permitido' }); return; }
  if (error instanceof SyntaxError && 'body' in error) { s.status(400).json({ message: 'JSON inválido' }); return; }
  if (error?.message === 'Origem não permitida') { s.status(403).json({ message: 'Origem não permitida' }); return; }
  console.error('Erro interno da API', error instanceof Error ? error.message : 'Erro desconhecido');
  s.status(500).json({ message: 'Erro interno do servidor' });
};
