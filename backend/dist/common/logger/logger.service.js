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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const winston = __importStar(require("winston"));
const path = __importStar(require("path"));
let LoggerService = class LoggerService {
    configService;
    logger;
    constructor(configService) {
        this.configService = configService;
        const logLevel = this.configService.get('LOG_LEVEL', 'info');
        const logDir = this.configService.get('LOG_DIR', '/var/log/serverhubx');
        const nodeEnv = this.configService.get('NODE_ENV', 'development');
        const formats = [
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
        ];
        if (nodeEnv === 'development') {
            formats.push(winston.format.colorize(), winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                const ctx = context ? `[${context}] ` : '';
                const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} ${level} ${ctx}${message}${metaStr}`;
            }));
        }
        else {
            formats.push(winston.format.json());
        }
        const transports = [
            new winston.transports.Console(),
        ];
        if (nodeEnv === 'production') {
            transports.push(new winston.transports.File({
                filename: path.join(logDir, 'error.log'),
                level: 'error',
                maxsize: 100 * 1024 * 1024,
                maxFiles: 5,
            }), new winston.transports.File({
                filename: path.join(logDir, 'combined.log'),
                maxsize: 100 * 1024 * 1024,
                maxFiles: 10,
            }));
        }
        this.logger = winston.createLogger({
            level: logLevel,
            format: winston.format.combine(...formats),
            transports,
            defaultMeta: { service: 'serverhubx' },
        });
    }
    log(message, context) {
        this.logger.info(message, { context });
    }
    error(message, trace, context) {
        this.logger.error(message, { trace, context });
    }
    warn(message, context) {
        this.logger.warn(message, { context });
    }
    debug(message, context) {
        this.logger.debug(message, { context });
    }
    verbose(message, context) {
        this.logger.verbose(message, { context });
    }
    logWithMeta(level, message, meta) {
        this.logger.log(level, message, meta);
    }
};
exports.LoggerService = LoggerService;
exports.LoggerService = LoggerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LoggerService);
//# sourceMappingURL=logger.service.js.map