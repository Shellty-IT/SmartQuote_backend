// src/errors/domain.errors.ts

export class DomainError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly statusCode: number = 400,
    ) {
        super(message);
        this.name = 'DomainError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class NotFoundError extends DomainError {
    constructor(resource: string) {
        super('NOT_FOUND', `${resource} nie znaleziony/a`, 404);
        this.name = 'NotFoundError';
    }
}

export class ValidationError extends DomainError {
    constructor(message: string) {
        super('VALIDATION_ERROR', message, 400);
        this.name = 'ValidationError';
    }
}

export class ConflictError extends DomainError {
    constructor(message: string) {
        super('CONFLICT', message, 409);
        this.name = 'ConflictError';
    }
}

export class UnauthorizedError extends DomainError {
    constructor(message = 'Brak autoryzacji') {
        super('UNAUTHORIZED', message, 401);
        this.name = 'UnauthorizedError';
    }
}

export class ExternalServiceError extends DomainError {
    constructor(service: string, message: string) {
        super(`${service}_ERROR`, message, 502);
        this.name = 'ExternalServiceError';
    }
}