// src/utils/apiResponse.ts

import { Response } from 'express';

export interface ApiMeta {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
}

export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    meta?: ApiMeta;
}

export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(
    res: Response,
    data: T,
    statusCode = 200,
    meta?: ApiMeta,
): Response {
    const body: ApiSuccessResponse<T> = { success: true, data };
    if (meta !== undefined) body.meta = meta;
    return res.status(statusCode).json(body);
}

export function errorResponse(
    res: Response,
    code: string,
    message: string,
    statusCode = 400,
    details?: unknown,
): Response {
    const body: ApiErrorResponse = {
        success: false,
        error: {
            code,
            message,
            ...(details !== undefined ? { details } : {}),
        },
    };
    return res.status(statusCode).json(body);
}

export function paginatedResponse<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
): Response {
    return successResponse(res, data, 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
}