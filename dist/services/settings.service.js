"use strict";
// smartquote_backend/src/services/settings.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.changePassword = changePassword;
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
exports.getCompanyInfo = getCompanyInfo;
exports.updateCompanyInfo = updateCompanyInfo;
exports.getApiKeys = getApiKeys;
exports.createApiKey = createApiKey;
exports.deleteApiKey = deleteApiKey;
exports.toggleApiKey = toggleApiKey;
exports.getAllSettings = getAllSettings;
const prisma_1 = __importDefault(require("../lib/prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// ============================================
// PROFILE
// ============================================
async function getProfile(userId) {
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
        },
    });
    if (!user) {
        throw new Error('Użytkownik nie znaleziony');
    }
    return user;
}
async function updateProfile(userId, data) {
    const user = await prisma_1.default.user.update({
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
async function changePassword(userId, currentPassword, newPassword) {
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw new Error('Użytkownik nie znaleziony');
    }
    const isValid = await bcryptjs_1.default.compare(currentPassword, user.password);
    if (!isValid) {
        throw new Error('Nieprawidłowe obecne hasło');
    }
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
    await prisma_1.default.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });
    return { message: 'Hasło zostało zmienione' };
}
// ============================================
// USER SETTINGS
// ============================================
async function getSettings(userId) {
    let settings = await prisma_1.default.userSettings.findUnique({
        where: { userId },
    });
    // Jeśli nie ma ustawień, utwórz domyślne
    if (!settings) {
        settings = await prisma_1.default.userSettings.create({
            data: { userId },
        });
    }
    return settings;
}
async function updateSettings(userId, data) {
    const settings = await prisma_1.default.userSettings.upsert({
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
async function getCompanyInfo(userId) {
    let companyInfo = await prisma_1.default.companyInfo.findUnique({
        where: { userId },
    });
    // Jeśli nie ma danych firmy, zwróć puste
    if (!companyInfo) {
        companyInfo = await prisma_1.default.companyInfo.create({
            data: { userId },
        });
    }
    return companyInfo;
}
async function updateCompanyInfo(userId, data) {
    const companyInfo = await prisma_1.default.companyInfo.upsert({
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
const crypto_1 = __importDefault(require("crypto"));
async function getApiKeys(userId) {
    const apiKeys = await prisma_1.default.apiKey.findMany({
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
async function createApiKey(userId, data) {
    const key = `sq_${crypto_1.default.randomBytes(32).toString('hex')}`;
    const apiKey = await prisma_1.default.apiKey.create({
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
async function deleteApiKey(userId, keyId) {
    const apiKey = await prisma_1.default.apiKey.findFirst({
        where: { id: keyId, userId },
    });
    if (!apiKey) {
        throw new Error('Klucz API nie znaleziony');
    }
    await prisma_1.default.apiKey.delete({
        where: { id: keyId },
    });
    return { message: 'Klucz API został usunięty' };
}
async function toggleApiKey(userId, keyId) {
    const apiKey = await prisma_1.default.apiKey.findFirst({
        where: { id: keyId, userId },
    });
    if (!apiKey) {
        throw new Error('Klucz API nie znaleziony');
    }
    const updated = await prisma_1.default.apiKey.update({
        where: { id: keyId },
        data: { isActive: !apiKey.isActive },
    });
    return updated;
}
// ============================================
// GET ALL SETTINGS (combined)
// ============================================
async function getAllSettings(userId) {
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
