import { Router } from 'express';
import { env } from '../../config/env.js';
import { createAuthenticate, getAuthenticatedUserId } from '../../middlewares/authenticate.js';
import { handle } from '../accounts/accounts.routes.js';
import { connectionStatus, invite, revoke } from './discord-link.service.js';
import { rateLimit } from 'express-rate-limit';

export const discordRoutes = Router();
discordRoutes.use(createAuthenticate(env.JWT_SECRET));
discordRoutes.get('/', handle(async (r, s) => s.json(await connectionStatus(getAuthenticatedUserId(r)))));
discordRoutes.post('/invite', rateLimit({ windowMs: 600_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }), handle(async (r, s) => s.status(201).json(await invite(getAuthenticatedUserId(r)))));
discordRoutes.delete('/', handle(async (r, s) => { await revoke(getAuthenticatedUserId(r)); s.json({ ativo: false }); }));
