"use strict";
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
exports.envValidationSchema = void 0;
const Joi = __importStar(require("joi"));
exports.envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number().default(3000),
    APP_NAME: Joi.string().default('ServerHubX'),
    APP_URL: Joi.string().uri().default('http://localhost:3000'),
    DB_HOST: Joi.string().default('localhost'),
    DB_PORT: Joi.number().default(3306),
    DB_USERNAME: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_DATABASE: Joi.string().required(),
    DB_SYNCHRONIZE: Joi.boolean().default(false),
    DB_LOGGING: Joi.boolean().default(false),
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().allow('').default(''),
    REDIS_DB: Joi.number().default(0),
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
    JWT_REFRESH_EXPIRY: Joi.string().default('7d'),
    SMTP_HOST: Joi.string().optional(),
    SMTP_PORT: Joi.number().default(587),
    SMTP_SECURE: Joi.boolean().default(false),
    SMTP_USER: Joi.string().allow('').optional(),
    SMTP_PASSWORD: Joi.string().allow('').optional(),
    SMTP_FROM: Joi.string().email().optional(),
    TWILIO_ACCOUNT_SID: Joi.string().allow('').optional(),
    TWILIO_AUTH_TOKEN: Joi.string().allow('').optional(),
    TWILIO_FROM_NUMBER: Joi.string().allow('').optional(),
    FIREBASE_PROJECT_ID: Joi.string().allow('').optional(),
    FIREBASE_CLIENT_EMAIL: Joi.string().allow('').optional(),
    FIREBASE_PRIVATE_KEY: Joi.string().allow('').optional(),
    WHATSAPP_PHONE_NUMBER_ID: Joi.string().allow('').optional(),
    WHATSAPP_ACCESS_TOKEN: Joi.string().allow('').optional(),
    LOG_LEVEL: Joi.string()
        .valid('error', 'warn', 'info', 'debug', 'verbose')
        .default('info'),
    LOG_DIR: Joi.string().default('/var/log/serverhubx'),
});
//# sourceMappingURL=env.validation.js.map