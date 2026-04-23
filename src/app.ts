// src/app.ts

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { config, isDev } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import prisma from './lib/prisma';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = new Set<string>(
    [config.clientUrl, config.frontendUrl, isDev ? 'http://localhost:3000' : null]
        .filter((v): v is string => Boolean(v)),
);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.has(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: origin ${origin} nie jest dozwolony`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
    }),
);

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Zbyt wiele żądań. Spróbuj ponownie za 15 minut.',
        },
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.',
        },
    },
});

app.use(globalLimiter);
app.use('/api/auth', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { id: string }).id = randomUUID();
    next();
});

morgan.token('id', (req: Request) => (req as Request & { id: string }).id ?? '-');

const morganFormat = isDev
    ? ':id :method :url :status :response-time ms'
    : ':id :remote-addr :method :url :status :res[content-length] :response-time ms';

app.use(morgan(morganFormat));

app.get('/health', async (_req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: {
                database: 'ok',
            },
        });
    } catch {
        res.status(503).json({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: {
                database: 'error',
            },
        });
    }
});

app.use('/api', routes);

app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Endpoint ${req.method} ${req.path} nie istnieje`,
        },
    });
});

app.use(errorHandler);

export default app;