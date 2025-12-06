import { Response } from 'express';

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}

export function successResponse<T>(res: Response, data: T, statusCode = 200, meta?: ApiResponse['meta']): Response {
    const response: ApiResponse<T> = { success: true, data };
    if (meta) response.meta = meta;
    return res.status(statusCode).json(response);
}

export function errorResponse(
    res: Response,
    code: string,
    message: string,
    statusCode = 400,
    details?: any
): Response {
    const response: ApiResponse = {
        success: false,
        error: { code, message, details },
    };
    return res.status(statusCode).json(response);
}

export function paginatedResponse<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number
): Response {
    return successResponse(res, data, 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
}