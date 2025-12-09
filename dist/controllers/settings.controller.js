"use strict";
// smartquote_backend/src/controllers/settings.controller.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllSettings = getAllSettings;
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
const settingsService = __importStar(require("../services/settings.service"));
const apiResponse_1 = require("../utils/apiResponse");
// ============================================
// GET ALL SETTINGS
// ============================================
async function getAllSettings(req, res, next) {
    try {
        const userId = req.user.id;
        const data = await settingsService.getAllSettings(userId);
        (0, apiResponse_1.successResponse)(res, data);
    }
    catch (error) {
        next(error);
    }
}
// ============================================
// PROFILE
// ============================================
async function getProfile(req, res, next) {
    try {
        const userId = req.user.id;
        const profile = await settingsService.getProfile(userId);
        (0, apiResponse_1.successResponse)(res, profile);
    }
    catch (error) {
        next(error);
    }
}
async function updateProfile(req, res, next) {
    try {
        const userId = req.user.id;
        const profile = await settingsService.updateProfile(userId, req.body);
        (0, apiResponse_1.successResponse)(res, profile);
    }
    catch (error) {
        next(error);
    }
}
// ============================================
// PASSWORD
// ============================================
async function changePassword(req, res, next) {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        const result = await settingsService.changePassword(userId, currentPassword, newPassword);
        (0, apiResponse_1.successResponse)(res, result);
    }
    catch (error) {
        next(error);
    }
}
// ============================================
// SETTINGS
// ============================================
async function getSettings(req, res, next) {
    try {
        const userId = req.user.id;
        const settings = await settingsService.getSettings(userId);
        (0, apiResponse_1.successResponse)(res, settings);
    }
    catch (error) {
        next(error);
    }
}
async function updateSettings(req, res, next) {
    try {
        const userId = req.user.id;
        const settings = await settingsService.updateSettings(userId, req.body);
        (0, apiResponse_1.successResponse)(res, settings);
    }
    catch (error) {
        next(error);
    }
}
// ============================================
// COMPANY INFO
// ============================================
async function getCompanyInfo(req, res, next) {
    try {
        const userId = req.user.id;
        const companyInfo = await settingsService.getCompanyInfo(userId);
        (0, apiResponse_1.successResponse)(res, companyInfo);
    }
    catch (error) {
        next(error);
    }
}
async function updateCompanyInfo(req, res, next) {
    try {
        const userId = req.user.id;
        const companyInfo = await settingsService.updateCompanyInfo(userId, req.body);
        (0, apiResponse_1.successResponse)(res, companyInfo);
    }
    catch (error) {
        next(error);
    }
}
// ============================================
// API KEYS
// ============================================
async function getApiKeys(req, res, next) {
    try {
        const userId = req.user.id;
        const apiKeys = await settingsService.getApiKeys(userId);
        (0, apiResponse_1.successResponse)(res, apiKeys);
    }
    catch (error) {
        next(error);
    }
}
async function createApiKey(req, res, next) {
    try {
        const userId = req.user.id;
        const apiKey = await settingsService.createApiKey(userId, req.body);
        (0, apiResponse_1.successResponse)(res, apiKey, 201);
    }
    catch (error) {
        next(error);
    }
}
async function deleteApiKey(req, res, next) {
    try {
        const userId = req.user.id;
        const result = await settingsService.deleteApiKey(userId, req.params.id);
        (0, apiResponse_1.successResponse)(res, result);
    }
    catch (error) {
        next(error);
    }
}
async function toggleApiKey(req, res, next) {
    try {
        const userId = req.user.id;
        const apiKey = await settingsService.toggleApiKey(userId, req.params.id);
        (0, apiResponse_1.successResponse)(res, apiKey);
    }
    catch (error) {
        next(error);
    }
}
