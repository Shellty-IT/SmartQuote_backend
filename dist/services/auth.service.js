"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getMe = getMe;
// src/services/auth.service.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
function generateToken(userId, email) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jsonwebtoken_1.default.sign({ userId, email }, secret, { expiresIn: '7d' });
}
async function register(data) {
    const existingUser = await prisma_1.default.user.findUnique({
        where: { email: data.email.toLowerCase() },
    });
    if (existingUser) {
        throw new Error('EMAIL_EXISTS');
    }
    const hashedPassword = await bcryptjs_1.default.hash(data.password, 12);
    const user = await prisma_1.default.user.create({
        data: {
            email: data.email.toLowerCase(),
            password: hashedPassword,
            name: data.name,
        },
    });
    await prisma_1.default.userSettings.create({
        data: { userId: user.id },
    });
    const token = generateToken(user.id, user.email);
    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
        token,
    };
}
async function login(data) {
    const user = await prisma_1.default.user.findUnique({
        where: { email: data.email.toLowerCase() },
    });
    if (!user) {
        throw new Error('INVALID_CREDENTIALS');
    }
    const isValid = await bcryptjs_1.default.compare(data.password, user.password);
    if (!isValid) {
        throw new Error('INVALID_CREDENTIALS');
    }
    const token = generateToken(user.id, user.email);
    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
        token,
    };
}
async function getMe(userId) {
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
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
                    phone: true,
                    email: true,
                    website: true,
                    logo: true,
                    primaryColor: true,
                },
            },
        },
    });
    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }
    return user;
}
