// smartquote_backend/src/controllers/settings.controller.ts

import { Request, Response, NextFunction } from 'express';
import * as settingsService from '../services/settings.service';
import { successResponse } from '../utils/apiResponse';

// ============================================
// GET ALL SETTINGS
// ============================================

export async function getAllSettings(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const data = await settingsService.getAllSettings(userId);
        successResponse(res, data);
    } catch (error) {
        next(error);
    }
}

// ============================================
// PROFILE
// ============================================

export async function getProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const profile = await settingsService.getProfile(userId);
        successResponse(res, profile);
    } catch (error) {
        next(error);
    }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const profile = await settingsService.updateProfile(userId, req.body);
        successResponse(res, profile);
    } catch (error) {
        next(error);
    }
}

// ============================================
// PASSWORD
// ============================================

export async function changePassword(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { currentPassword, newPassword } = req.body;
        const result = await settingsService.changePassword(userId, currentPassword, newPassword);
        successResponse(res, result);
    } catch (error) {
        next(error);
    }
}

// ============================================
// SETTINGS
// ============================================

export async function getSettings(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const settings = await settingsService.getSettings(userId);
        successResponse(res, settings);
    } catch (error) {
        next(error);
    }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const settings = await settingsService.updateSettings(userId, req.body);
        successResponse(res, settings);
    } catch (error) {
        next(error);
    }
}

// ============================================
// COMPANY INFO
// ============================================

export async function getCompanyInfo(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const companyInfo = await settingsService.getCompanyInfo(userId);
        successResponse(res, companyInfo);
    } catch (error) {
        next(error);
    }
}

export async function updateCompanyInfo(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const companyInfo = await settingsService.updateCompanyInfo(userId, req.body);
        successResponse(res, companyInfo);
    } catch (error) {
        next(error);
    }
}

// ============================================
// API KEYS
// ============================================

export async function getApiKeys(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const apiKeys = await settingsService.getApiKeys(userId);
        successResponse(res, apiKeys);
    } catch (error) {
        next(error);
    }
}

export async function createApiKey(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const apiKey = await settingsService.createApiKey(userId, req.body);
        successResponse(res, apiKey, 201);
    } catch (error) {
        next(error);
    }
}

export async function deleteApiKey(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const result = await settingsService.deleteApiKey(userId, req.params.id);
        successResponse(res, result);
    } catch (error) {
        next(error);
    }
}

export async function toggleApiKey(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const apiKey = await settingsService.toggleApiKey(userId, req.params.id);
        successResponse(res, apiKey);
    } catch (error) {
        next(error);
    }
}