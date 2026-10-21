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
