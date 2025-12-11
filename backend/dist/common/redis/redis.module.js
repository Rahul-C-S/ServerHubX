"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisModule = exports.REDIS_CLIENT = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
exports.REDIS_CLIENT = 'REDIS_CLIENT';
let RedisModule = class RedisModule {
};
exports.RedisModule = RedisModule;
exports.RedisModule = RedisModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: exports.REDIS_CLIENT,
                useFactory: (configService) => {
                    const redis = new ioredis_1.default({
                        host: configService.get('REDIS_HOST', 'localhost'),
                        port: configService.get('REDIS_PORT', 6379),
                        password: configService.get('REDIS_PASSWORD') || undefined,
                        db: configService.get('REDIS_DB', 0),
                        retryStrategy: (times) => {
                            if (times > 3) {
                                return null;
                            }
                            return Math.min(times * 200, 1000);
                        },
                    });
                    redis.on('error', (err) => {
                        console.error('Redis connection error:', err);
                    });
                    redis.on('connect', () => {
                        console.log('Redis connected successfully');
                    });
                    return redis;
                },
                inject: [config_1.ConfigService],
            },
        ],
        exports: [exports.REDIS_CLIENT],
    })
], RedisModule);
//# sourceMappingURL=redis.module.js.map