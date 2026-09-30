import { Router } from "express";

export const routes = Router();

routes.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "contas-em-dia-api"
  });
});
