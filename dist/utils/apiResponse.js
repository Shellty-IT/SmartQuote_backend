"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
exports.paginatedResponse = paginatedResponse;
function successResponse(res, data, statusCode = 200, meta) {
    const response = { success: true, data };
    if (meta)
        response.meta = meta;
    return res.status(statusCode).json(response);
}
function errorResponse(res, code, message, statusCode = 400, details) {
    const response = {
        success: false,
        error: { code, message, details },
    };
    return res.status(statusCode).json(response);
}
function paginatedResponse(res, data, total, page, limit) {
    return successResponse(res, data, 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
}
