import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types';
import { config } from '../config';
import { errorResponse } from '../utils/apiResponse';
import prisma from '../lib/prisma';

interface JwtPayload {
    id: string;
    email: string;
}

export async function authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            errorResponse(res, 'UNAUTHORIZED', 'Brak tokenu autoryzacji', 401);
            return;
        }

        const token = authHeader.substring(7);

        const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, name: true, role: true, isActive: true },
        });

        if (!user || !user.isActive) {
            errorResponse(res, 'UNAUTHORIZED', 'Użytkownik nie istnieje lub jest nieaktywny', 401);
            return;
        }

        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            errorResponse(res, 'INVALID_TOKEN', 'Nieprawidłowy token', 401);
            return;
        }
        errorResponse(res, 'UNAUTHORIZED', 'Błąd autoryzacji', 401);
    }
}

export function authorize(...roles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return errorResponse(res, 'UNAUTHORIZED', 'Nie zalogowano', 401);
        }

        if (roles.length && !roles.includes(req.user.role)) {
            return errorResponse(res, 'FORBIDDEN', 'Brak uprawnień', 403);
        }

        next();
    };
}