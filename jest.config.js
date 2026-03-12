// smartquote_backend/jest.config.js
/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    clearMocks: true,
    restoreMocks: true,
    collectCoverageFrom: [
        'src/services/**/*.ts',
        'src/utils/**/*.ts',
        '!src/**/__tests__/**',
    ],
    coverageDirectory: 'coverage',
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
    },
    testTimeout: 15000,
};