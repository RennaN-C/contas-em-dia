import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes.js";

export const routes = Router();

routes.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "contas-em-dia-api"
  });
});

routes.use("/auth", authRoutes);
