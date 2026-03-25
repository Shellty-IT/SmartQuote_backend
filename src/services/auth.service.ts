// src/services/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

interface RegisterInput {
    email: string;
    password: string;
    name: string;
}

interface LoginInput {
    email: string;
    password: string;
}

interface AuthResponse {
    user: {
        id: string;
        email: string;
        name: string | null;
        role: string;
    };
    token: string;
}

function generateToken(userId: string, email: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jwt.sign({ userId, email }, secret, { expiresIn: '7d' });
}

export async function register(data: RegisterInput): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
        throw new Error('EMAIL_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
        data: {
            email: data.email.toLowerCase(),
            password: hashedPassword,
            name: data.name,
        },
    });

    await prisma.userSettings.create({
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

export async function login(data: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
    });

    if (!user) {
        throw new Error('INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(data.password, user.password);
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

export async function getMe(userId: string) {
    const user = await prisma.user.findUnique({
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