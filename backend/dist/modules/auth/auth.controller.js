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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_js_1 = require("./auth.service.js");
const local_auth_guard_js_1 = require("./guards/local-auth.guard.js");
const public_decorator_js_1 = require("./decorators/public.decorator.js");
const current_user_decorator_js_1 = require("./decorators/current-user.decorator.js");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async login(req, res, _loginDto) {
        const user = req.user;
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.get('user-agent');
        const result = await this.authService.login(user, ipAddress, userAgent);
        res.cookie('refreshToken', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return result;
    }
    async logout(userId, req, res) {
        const refreshToken = req.cookies?.refreshToken || '';
        const ipAddress = req.ip || req.socket.remoteAddress;
        await this.authService.logout(userId, refreshToken, ipAddress);
        res.clearCookie('refreshToken');
    }
    async refresh(req, body) {
        const refreshToken = body.refreshToken || req.cookies?.refreshToken;
        if (!refreshToken) {
            throw new Error('Refresh token not provided');
        }
        const authHeader = req.get('authorization');
        let userId = null;
        if (authHeader?.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                userId = decoded.sub;
            }
            catch {
            }
        }
        if (!userId) {
            throw new Error('Unable to identify user');
        }
        return this.authService.refreshAccessToken(userId, refreshToken);
    }
    async forgotPassword(forgotPasswordDto) {
        await this.authService.requestPasswordReset(forgotPasswordDto.email);
    }
    async resetPassword(resetPasswordDto) {
        await this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, common_1.UseGuards)(local_auth_guard_js_1.LocalAuthGuard),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Function]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_js_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map