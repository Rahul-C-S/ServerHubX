"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const core_1 = require("@nestjs/core");
const app_controller_js_1 = require("./app.controller.js");
const app_service_js_1 = require("./app.service.js");
const env_validation_js_1 = require("./config/env.validation.js");
const database_config_js_1 = require("./config/database.config.js");
const redis_config_js_1 = require("./config/redis.config.js");
const jwt_config_js_1 = require("./config/jwt.config.js");
const logger_module_js_1 = require("./common/logger/logger.module.js");
const redis_module_js_1 = require("./common/redis/redis.module.js");
const request_logger_middleware_js_1 = require("./common/middleware/request-logger.middleware.js");
const core_module_js_1 = require("./core/core.module.js");
const users_module_js_1 = require("./modules/users/users.module.js");
const auth_module_js_1 = require("./modules/auth/auth.module.js");
const authorization_module_js_1 = require("./modules/authorization/authorization.module.js");
const jwt_auth_guard_js_1 = require("./modules/auth/guards/jwt-auth.guard.js");
const system_users_module_1 = require("./modules/system-users/system-users.module");
const domains_module_1 = require("./modules/domains/domains.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(request_logger_middleware_js_1.RequestLoggerMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validationSchema: env_validation_js_1.envValidationSchema,
                load: [database_config_js_1.databaseConfig, redis_config_js_1.redisConfig, jwt_config_js_1.jwtConfig],
                envFilePath: ['.env.local', '.env'],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    type: 'mariadb',
                    host: configService.get('database.host'),
                    port: configService.get('database.port'),
                    username: configService.get('database.username'),
                    password: configService.get('database.password'),
                    database: configService.get('database.database'),
                    synchronize: configService.get('database.synchronize'),
                    logging: configService.get('database.logging'),
                    autoLoadEntities: true,
                    entities: [__dirname + '/**/*.entity{.ts,.js}'],
                    migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
                }),
                inject: [config_1.ConfigService],
            }),
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    connection: {
                        host: configService.get('redis.host'),
                        port: configService.get('redis.port'),
                        password: configService.get('redis.password') || undefined,
                        db: configService.get('redis.db'),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            logger_module_js_1.LoggerModule,
            redis_module_js_1.RedisModule,
            core_module_js_1.CoreModule,
            users_module_js_1.UsersModule,
            auth_module_js_1.AuthModule,
            authorization_module_js_1.AuthorizationModule,
            system_users_module_1.SystemUsersModule,
            domains_module_1.DomainsModule,
        ],
        controllers: [app_controller_js_1.AppController],
        providers: [
            app_service_js_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_js_1.JwtAuthGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map