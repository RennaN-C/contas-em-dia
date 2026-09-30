import { Router } from "express";
import { register } from "./auth.controller.js";

export const authRoutes = Router();

authRoutes.post("/register", register);
