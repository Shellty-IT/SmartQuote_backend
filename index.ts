import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z, ZodIssue } from 'zod';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8080;
const SALT_ROUNDS = 12;

// ===========================================
// MIDDLEWARE
// ===========================================

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ===========================================
// VALIDATION SCHEMAS (Zod)
// ===========================================

const registerSchema = z.object({
    email: z
        .string()
        .min(1, 'Email jest wymagany')
        .email('Nieprawidłowy format email'),
    password: z
        .string()
        .min(8, 'Hasło musi mieć minimum 8 znaków')
        .regex(/[A-Z]/, 'Hasło musi zawierać przynajmniej jedną wielką literę')
        .regex(/[a-z]/, 'Hasło musi zawierać przynajmniej jedną małą literę')
        .regex(/[0-9]/, 'Hasło musi zawierać przynajmniej jedną cyfrę'),
    name: z
        .string()
        .min(2, 'Imię musi mieć minimum 2 znaki')
        .max(50, 'Imię może mieć maksymalnie 50 znaków')
        .optional(),
});

const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'Email jest wymagany')
        .email('Nieprawidłowy format email'),
    password: z
        .string()
        .min(1, 'Hasło jest wymagane'),
});

// ===========================================
// HELPER FUNCTIONS
// ===========================================

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

function successResponse<T>(data: T): ApiResponse<T> {
    return { success: true, data };
}

function errorResponse(code: string, message: string, details?: any): ApiResponse {
    return {
        success: false,
        error: { code, message, details }
    };
}

// ===========================================
// ROUTES: Health Check
// ===========================================

app.get('/api/health', async (req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json(successResponse({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        }));
    } catch (error) {
        res.status(503).json(errorResponse(
            'SERVICE_UNAVAILABLE',
            'Serwis tymczasowo niedostępny'
        ));
    }
});

// ===========================================
// ROUTES: Authentication
// ===========================================

/**
 * POST /api/auth/register
 * Rejestracja nowego użytkownika
 */
app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
// 1. Walidacja danych wejściowych
        const validationResult = registerSchema.safeParse(req.body);

        if (!validationResult.success) {
            const errors = validationResult.error.issues.map((issue: ZodIssue) => ({
                field: issue.path.join('.'),
                message: issue.message
            }));

            return res.status(400).json(errorResponse(
                'VALIDATION_ERROR',
                'Dane nie przeszły walidacji',
                errors
            ));
        }

        const { email, password, name } = validationResult.data;

        // 2. Sprawdź czy użytkownik już istnieje
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return res.status(409).json(errorResponse(
                'USER_EXISTS',
                'Użytkownik z tym adresem email już istnieje'
            ));
        }

        // 3. Hashuj hasło
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // 4. Utwórz użytkownika
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                name: name || null,
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            }
        });

        console.log(`[AUTH] Nowy użytkownik zarejestrowany: ${user.email}`);

        // 5. Zwróć sukces
        res.status(201).json(successResponse({
            user,
            message: 'Konto zostało utworzone pomyślnie'
        }));

    } catch (error) {
        console.error('[AUTH] Błąd rejestracji:', error);
        res.status(500).json(errorResponse(
            'INTERNAL_ERROR',
            'Wystąpił błąd podczas rejestracji'
        ));
    }
});

/**
 * POST /api/auth/login
 * Logowanie użytkownika
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
        // 1. Walidacja danych wejściowych
        const validationResult = loginSchema.safeParse(req.body);

        if (!validationResult.success) {
            return res.status(400).json(errorResponse(
                'VALIDATION_ERROR',
                'Nieprawidłowe dane logowania'
            ));
        }

        const { email, password } = validationResult.data;

        // 2. Znajdź użytkownika
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            // Celowo używamy tego samego komunikatu dla bezpieczeństwa
            return res.status(401).json(errorResponse(
                'INVALID_CREDENTIALS',
                'Nieprawidłowy email lub hasło'
            ));
        }

        // 3. Weryfikuj hasło
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            console.log(`[AUTH] Nieudana próba logowania: ${email}`);
            return res.status(401).json(errorResponse(
                'INVALID_CREDENTIALS',
                'Nieprawidłowy email lub hasło'
            ));
        }

        // 4. Logowanie udane
        console.log(`[AUTH] Użytkownik zalogowany: ${user.email}`);

        res.status(200).json(successResponse({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            }
        }));

    } catch (error) {
        console.error('[AUTH] Błąd logowania:', error);
        res.status(500).json(errorResponse(
            'INTERNAL_ERROR',
            'Wystąpił błąd podczas logowania'
        ));
    }
});

/**
 * GET /api/auth/me
 * Pobierz dane aktualnego użytkownika (wymaga autoryzacji - do implementacji później)
 */
app.get('/api/auth/me', async (req: Request, res: Response) => {
    // TODO: Implementacja z JWT middleware
    res.status(501).json(errorResponse(
        'NOT_IMPLEMENTED',
        'Endpoint w trakcie implementacji'
    ));
});

// ===========================================
// ROUTES: Users (Admin)
// ===========================================

/**
 * GET /api/users
 * Lista użytkowników (do celów deweloperskich)
 */
app.get('/api/users', async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json(errorResponse(
            'FORBIDDEN',
            'Endpoint niedostępny w produkcji'
        ));
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(successResponse({ users, count: users.length }));
    } catch (error) {
        console.error('[USERS] Błąd pobierania:', error);
        res.status(500).json(errorResponse(
            'INTERNAL_ERROR',
            'Błąd pobierania użytkowników'
        ));
    }
});

// ===========================================
// ERROR HANDLING
// ===========================================

// 404 Handler
app.use((req: Request, res: Response) => {
    res.status(404).json(errorResponse(
        'NOT_FOUND',
        `Endpoint ${req.method} ${req.path} nie istnieje`
    ));
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[ERROR]', err);
    res.status(500).json(errorResponse(
        'INTERNAL_ERROR',
        'Wewnętrzny błąd serwera'
    ));
});

// ===========================================
// SERVER START
// ===========================================

async function main() {
    try {
        await prisma.$connect();
        console.log('✅ Połączono z bazą danych');

        app.listen(PORT, () => {
            console.log(`🚀 Serwer działa na http://localhost:${PORT}`);
            console.log(`📝 Endpoints:`);
            console.log(`   POST /api/auth/register`);
            console.log(`   POST /api/auth/login`);
            console.log(`   GET  /api/health`);
        });
    } catch (error) {
        console.error('❌ Błąd startu serwera:', error);
        process.exit(1);
    }
}

main();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Zamykanie serwera...');
    await prisma.$disconnect();
    process.exit(0);
});