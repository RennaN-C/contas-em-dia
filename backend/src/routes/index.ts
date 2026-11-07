import { accountsRoutes } from "../modules/accounts/accounts.routes.js";
import { paymentsRoutes } from "../modules/payments/payments.routes.js";
import { notificationsRoutes } from '../modules/notifications/notifications.routes.js';
import { messagesRoutes } from '../modules/messages/messages.routes.js';
import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { usersRoutes } from "../modules/users/users.routes.js";
import { prisma } from '../lib/prisma.js';
import { discordRoutes } from '../modules/messages/discord.routes.js';

export const routes = Router();

routes.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "contas-em-dia-api"
  });
});

routes.get('/ready', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: 'ok', service: 'contas-em-dia-api', database: 'connected' });
  } catch {
    response.status(503).json({ status: 'unavailable', service: 'contas-em-dia-api' });
  }
});

routes.use("/auth", authRoutes);
routes.use("/users", usersRoutes);

routes.use("/accounts", accountsRoutes);
routes.use("/payments", paymentsRoutes);
routes.use('/notifications', notificationsRoutes);
routes.use('/messages', messagesRoutes);
routes.use('/integrations/discord', discordRoutes);
