"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const apiResponse_1 = require("../utils/apiResponse");
const prisma_1 = __importDefault(require("../lib/prisma"));
function authenticate(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                (0, apiResponse_1.errorResponse)(res, 'UNAUTHORIZED', 'Brak tokenu autoryzacji', 401);
                return;
            }
            const token = authHeader.substring(7);
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
            const user = yield prisma_1.default.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, email: true, name: true, role: true, isActive: true },
            });
            if (!user || !user.isActive) {
                (0, apiResponse_1.errorResponse)(res, 'UNAUTHORIZED', 'Użytkownik nie istnieje lub jest nieaktywny', 401);
                return;
            }
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            };
            next();
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                (0, apiResponse_1.errorResponse)(res, 'INVALID_TOKEN', 'Nieprawidłowy token', 401);
                return;
            }
            (0, apiResponse_1.errorResponse)(res, 'UNAUTHORIZED', 'Błąd autoryzacji', 401);
        }
    });
}
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return (0, apiResponse_1.errorResponse)(res, 'UNAUTHORIZED', 'Nie zalogowano', 401);
        }
        if (roles.length && !roles.includes(req.user.role)) {
            return (0, apiResponse_1.errorResponse)(res, 'FORBIDDEN', 'Brak uprawnień', 403);
        }
        next();
    };
}
