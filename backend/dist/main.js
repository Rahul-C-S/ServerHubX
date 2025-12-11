"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_js_1 = require("./app.module.js");
const logger_service_js_1 = require("./common/logger/logger.service.js");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_js_1.AppModule, {
        bufferLogs: true,
    });
    const configService = app.get(config_1.ConfigService);
    const logger = app.get(logger_service_js_1.LoggerService);
    app.useLogger(logger);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.use((0, cookie_parser_1.default)());
    app.enableCors({
        origin: configService.get('APP_URL', 'http://localhost:5173'),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.setGlobalPrefix('api/v1');
    const port = configService.get('PORT', 3000);
    await app.listen(port);
    logger.log(`Application running on port ${port}`, 'Bootstrap');
}
bootstrap();
//# sourceMappingURL=main.js.map