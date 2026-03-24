"use strict";
// smartquote_backend/src/controllers/auth.controller.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const config_1 = require("@/config");
const apiResponse_1 = require("@/utils/apiResponse");
class AuthController {
    async register(req, res) {
        try {
            const { email, password, name } = req.body;
            const existingUser = await prisma_1.default.user.findUnique({
                where: { email: email.toLowerCase() },
            });
            if (existingUser) {
                return (0, apiResponse_1.errorResponse)(res, 'USER_EXISTS', 'Użytkownik z tym adresem email już istnieje', 409);
            }
            const hashedPassword = await bcrypt_1.default.hash(password, config_1.config.saltRounds);
            const user = await prisma_1.default.user.create({
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
                },
            });
            console.log(`[AUTH] Nowy użytkownik: ${user.email}`);
            return (0, apiResponse_1.successResponse)(res, { user, message: 'Konto utworzone pomyślnie' }, 201);
        }
        catch (error) {
            console.error('[AUTH] Register error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'REGISTER_FAILED', 'Błąd rejestracji', 500);
        }
    }
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const user = await prisma_1.default.user.findUnique({
                where: { email: email.toLowerCase() },
            });
            if (!user) {
                return (0, apiResponse_1.errorResponse)(res, 'INVALID_CREDENTIALS', 'Nieprawidłowy email lub hasło', 401);
            }
            const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
            if (!isPasswordValid) {
                console.log(`[AUTH] Nieudane logowanie: ${email}`);
                return (0, apiResponse_1.errorResponse)(res, 'INVALID_CREDENTIALS', 'Nieprawidłowy email lub hasło', 401);
            }
            const signOptions = {
                expiresIn: '24h',
            };
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, config_1.config.jwtSecret, signOptions);
            console.log(`[AUTH] Zalogowano: ${user.email}`);
            return (0, apiResponse_1.successResponse)(res, {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
                token,
            });
        }
        catch (error) {
            console.error('[AUTH] Login error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'LOGIN_FAILED', 'Błąd logowania', 500);
        }
    }
    async me(req, res) {
        try {
            const user = await prisma_1.default.user.findUnique({
                where: { id: req.user.id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    avatar: true,
                    role: true,
                    createdAt: true,
                    companyInfo: {
                        select: {
                            name: true,
                            nip: true,
                            address: true,
                            city: true,
                            postalCode: true,
                        },
                    },
                },
            });
            if (!user) {
                return (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', 'Użytkownik nie znaleziony', 404);
            }
            // Zwróć dane z company z companyInfo dla kompatybilności wstecznej
            const response = {
                ...user,
                company: user.companyInfo?.name || null,
            };
            return (0, apiResponse_1.successResponse)(res, response);
        }
        catch (error) {
            console.error('[AUTH] Me error:', error);
            return (0, apiResponse_1.errorResponse)(res, 'FETCH_FAILED', 'Błąd pobierania danych', 500);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
