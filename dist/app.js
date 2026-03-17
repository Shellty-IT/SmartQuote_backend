"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// smartquote_backend/app.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const apiResponse_1 = require("./utils/apiResponse");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
const allowedOrigins = [config_1.config.clientUrl].filter(Boolean);
if (config_1.isDev) {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
}
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
if (config_1.isDev) {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
app.use('/api', routes_1.default);
app.use((req, res) => {
    (0, apiResponse_1.errorResponse)(res, 'NOT_FOUND', `Endpoint ${req.method} ${req.path} nie istnieje`, 404);
});
app.use(errorHandler_1.errorHandler);
exports.default = app;
