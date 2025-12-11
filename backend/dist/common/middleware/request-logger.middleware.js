"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestLoggerMiddleware = void 0;
const common_1 = require("@nestjs/common");
const logger_service_js_1 = require("../logger/logger.service.js");
let RequestLoggerMiddleware = class RequestLoggerMiddleware {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    use(req, res, next) {
        const startTime = Date.now();
        const { method, originalUrl, ip } = req;
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const { statusCode } = res;
            const userId = req.user?.id || 'anonymous';
            this.logger.logWithMeta('info', `${method} ${originalUrl}`, {
                context: 'HTTP',
                method,
                url: originalUrl,
                statusCode,
                duration: `${duration}ms`,
                ip,
                userId,
            });
        });
        next();
    }
};
exports.RequestLoggerMiddleware = RequestLoggerMiddleware;
exports.RequestLoggerMiddleware = RequestLoggerMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_js_1.LoggerService])
], RequestLoggerMiddleware);
//# sourceMappingURL=request-logger.middleware.js.map