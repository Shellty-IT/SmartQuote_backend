// smartquote_backend/src/services/settings.service.ts

import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

// ============================================
// PROFILE
// ============================================

export async function getProfile(userId: string) {
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
        },
    });

    if (!user) {
        throw new Error('Użytkownik nie znaleziony');
    }

    return user;
}

export async function updateProfile(
    userId: string,
    data: { name?: string; phone?: string; avatar?: string }
) {
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            name: data.name,
            phone: data.phone,
            avatar: data.avatar,
        },
        select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            avatar: true,
            role: true,
            createdAt: true,
        },
    });

    return user;
}

// ============================================
// PASSWORD
// ============================================

export async function changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new Error('Użytkownik nie znaleziony');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
        throw new Error('Nieprawidłowe obecne hasło');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    return { message: 'Hasło zostało zmienione' };
}

// ============================================
// USER SETTINGS
// ============================================

export async function getSettings(userId: string) {
    let settings = await prisma.userSettings.findUnique({
        where: { userId },
    });

    // Jeśli nie ma ustawień, utwórz domyślne
    if (!settings) {
        settings = await prisma.userSettings.create({
            data: { userId },
        });
    }

    return settings;
}

export async function updateSettings(
    userId: string,
    data: {
        theme?: string;
        language?: string;
        emailNotifications?: boolean;
        offerNotifications?: boolean;
        followUpReminders?: boolean;
        weeklyReport?: boolean;
        aiTone?: string;
        aiAutoSuggestions?: boolean;
    }
) {
    const settings = await prisma.userSettings.upsert({
        where: { userId },
        update: data,
        create: {
            userId,
            ...data,
        },
    });

    return settings;
}

// ============================================
// COMPANY INFO
// ============================================

export async function getCompanyInfo(userId: string) {
    let companyInfo = await prisma.companyInfo.findUnique({
        where: { userId },
    });

    // Jeśli nie ma danych firmy, zwróć puste
    if (!companyInfo) {
        companyInfo = await prisma.companyInfo.create({
            data: { userId },
        });
    }

    return companyInfo;
}

export async function updateCompanyInfo(
    userId: string,
    data: {
        name?: string;
        nip?: string;
        regon?: string;
        address?: string;
        city?: string;
        postalCode?: string;
        country?: string;
        phone?: string;
        email?: string;
        website?: string;
        bankName?: string;
        bankAccount?: string;
        logo?: string;
        defaultPaymentDays?: number;
        defaultTerms?: string;
        defaultNotes?: string;
    }
) {
    const companyInfo = await prisma.companyInfo.upsert({
        where: { userId },
        update: data,
        create: {
            userId,
            ...data,
        },
    });

    return companyInfo;
}

// ============================================
// API KEYS
// ============================================

import crypto from 'crypto';

export async function getApiKeys(userId: string) {
    const apiKeys = await prisma.apiKey.findMany({
        where: { userId },
        select: {
            id: true,
            name: true,
            key: true,
            lastUsedAt: true,
            expiresAt: true,
            isActive: true,
            permissions: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    // Maskuj klucze (pokaż tylko pierwsze i ostatnie 4 znaki)
    return apiKeys.map((key) => ({
        ...key,
        key: `${key.key.slice(0, 8)}...${key.key.slice(-4)}`,
    }));
}

export async function createApiKey(
    userId: string,
    data: {
        name: string;
        permissions?: string[];
        expiresAt?: Date;
    }
) {
    const key = `sq_${crypto.randomBytes(32).toString('hex')}`;

    const apiKey = await prisma.apiKey.create({
        data: {
            userId,
            name: data.name,
            key,
            permissions: data.permissions || ['read'],
            expiresAt: data.expiresAt,
        },
    });

    // Zwróć pełny klucz tylko przy tworzeniu
    return {
        ...apiKey,
        key, // Pełny klucz - pokaż tylko raz!
    };
}

export async function deleteApiKey(userId: string, keyId: string) {
    const apiKey = await prisma.apiKey.findFirst({
        where: { id: keyId, userId },
    });

    if (!apiKey) {
        throw new Error('Klucz API nie znaleziony');
    }

    await prisma.apiKey.delete({
        where: { id: keyId },
    });

    return { message: 'Klucz API został usunięty' };
}

export async function toggleApiKey(userId: string, keyId: string) {
    const apiKey = await prisma.apiKey.findFirst({
        where: { id: keyId, userId },
    });

    if (!apiKey) {
        throw new Error('Klucz API nie znaleziony');
    }

    const updated = await prisma.apiKey.update({
        where: { id: keyId },
        data: { isActive: !apiKey.isActive },
    });

    return updated;
}

// ============================================
// GET ALL SETTINGS (combined)
// ============================================

export async function getAllSettings(userId: string) {
    const [profile, settings, companyInfo, apiKeys] = await Promise.all([
        getProfile(userId),
        getSettings(userId),
        getCompanyInfo(userId),
        getApiKeys(userId),
    ]);

    return {
        profile,
        settings,
        companyInfo,
        apiKeys,
    };
}