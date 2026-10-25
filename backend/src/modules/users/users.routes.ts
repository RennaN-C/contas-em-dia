import { Router } from "express";
import { env } from "../../config/env.js";
import { createAuthenticate } from "../../middlewares/authenticate.js";
import { showMe, updateMe } from "./users.controller.js";
import {getAuthenticatedUserId} from '../../middlewares/authenticate.js';
import {handle} from '../accounts/accounts.routes.js';
import {getPreferences,savePreferences,preferencesSchema} from './preferences.service.js';

export const usersRoutes = Router();

usersRoutes.use(createAuthenticate(env.JWT_SECRET));

usersRoutes.get("/me", showMe);
usersRoutes.put("/me", updateMe);
usersRoutes.get('/me/preferences',handle(async(r,s)=>s.json({preferences:await getPreferences(getAuthenticatedUserId(r))})));
usersRoutes.put('/me/preferences',handle(async(r,s)=>s.json({preferences:await savePreferences(getAuthenticatedUserId(r),preferencesSchema.parse(r.body))})));
