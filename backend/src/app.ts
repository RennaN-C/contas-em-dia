import cors from "cors";
import express from "express";
import { routes } from "./routes/index.js";
import helmet from 'helmet';
import { env } from './config/env.js';
import { apiErrorHandler, apiRateLimit, authRateLimit, noStore } from './middlewares/security.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY_HOPS);
app.use(helmet({ strictTransportSecurity: env.NODE_ENV === 'production' ? undefined : false }));
const allowedOrigins = env.CORS_ORIGINS.split(',').map(value => value.trim());
app.use(cors({ origin(origin, callback) { callback(origin && !allowedOrigins.includes(origin) ? new Error('Origem não permitida') : null, true); } }));
app.use(noStore);
app.use(express.json({ limit: '16kb' }));
app.use('/api', apiRateLimit());
app.use('/api/auth', authRateLimit());
app.use("/api", routes);
app.use((_r, s) => { s.status(404).json({ message: 'Rota não encontrada' }); });
app.use(apiErrorHandler);
