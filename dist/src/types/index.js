"use strict";
// smartquote_backend/src/types/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIORITIES = exports.FOLLOW_UP_STATUSES = exports.FOLLOW_UP_TYPES = void 0;
// Stałe dla walidacji - muszą być zgodne z Prisma enum
exports.FOLLOW_UP_TYPES = ['CALL', 'EMAIL', 'MEETING', 'TASK', 'REMINDER', 'OTHER'];
exports.FOLLOW_UP_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED', 'OVERDUE'];
exports.PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
