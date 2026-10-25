import { accountsRoutes } from "../modules/accounts/accounts.routes.js";
import { paymentsRoutes } from "../modules/payments/payments.routes.js";
import { notificationsRoutes } from '../modules/notifications/notifications.routes.js';
import { messagesRoutes } from '../modules/messages/messages.routes.js';
import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { usersRoutes } from "../modules/users/users.routes.js";

export const routes = Router();

routes.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "contas-em-dia-api"
  });
});

routes.use("/auth", authRoutes);
routes.use("/users", usersRoutes);

routes.use("/accounts", accountsRoutes);
routes.use("/payments", paymentsRoutes);
routes.use('/notifications', notificationsRoutes);
routes.use('/messages', messagesRoutes);
