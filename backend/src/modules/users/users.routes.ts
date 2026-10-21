import { Router } from "express";
import { env } from "../../config/env.js";
import { createAuthenticate } from "../../middlewares/authenticate.js";
import { showMe, updateMe } from "./users.controller.js";

export const usersRoutes = Router();

usersRoutes.use(createAuthenticate(env.JWT_SECRET));

usersRoutes.get("/me", showMe);
usersRoutes.put("/me", updateMe);
