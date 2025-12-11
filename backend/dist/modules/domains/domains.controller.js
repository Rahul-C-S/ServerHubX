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
exports.DomainsController = void 0;
const common_1 = require("@nestjs/common");
const domains_service_js_1 = require("./domains.service.js");
const create_domain_dto_js_1 = require("./dto/create-domain.dto.js");
const update_domain_dto_js_1 = require("./dto/update-domain.dto.js");
const create_subdomain_dto_js_1 = require("./dto/create-subdomain.dto.js");
const jwt_auth_guard_js_1 = require("../auth/guards/jwt-auth.guard.js");
const policies_guard_js_1 = require("../authorization/guards/policies.guard.js");
const check_policies_decorator_js_1 = require("../authorization/decorators/check-policies.decorator.js");
const current_user_decorator_js_1 = require("../auth/decorators/current-user.decorator.js");
const user_entity_js_1 = require("../users/entities/user.entity.js");
let DomainsController = class DomainsController {
    domainsService;
    constructor(domainsService) {
        this.domainsService = domainsService;
    }
    async create(dto, user) {
        if (!dto.ownerId) {
            dto.ownerId = user.id;
        }
        return this.domainsService.create(dto, user.id);
    }
    async findAll(ownerId, user) {
        const filterOwnerId = user?.role === user_entity_js_1.UserRole.ROOT_ADMIN ? ownerId : user?.id;
        return this.domainsService.findAll(filterOwnerId);
    }
    async findOne(id) {
        return this.domainsService.findOne(id);
    }
    async update(id, dto, user) {
        return this.domainsService.update(id, dto, user.id);
    }
    async delete(id, user) {
        await this.domainsService.delete(id, user.id);
    }
    async suspend(id, user) {
        return this.domainsService.suspend(id, user.id);
    }
    async unsuspend(id, user) {
        return this.domainsService.unsuspend(id, user.id);
    }
    async getStats(id) {
        return this.domainsService.getStats(id);
    }
    async listSubdomains(id) {
        return this.domainsService.listSubdomains(id);
    }
    async createSubdomain(id, dto, user) {
        dto.domainId = id;
        return this.domainsService.createSubdomain(dto, user.id);
    }
    async deleteSubdomain(subdomainId) {
        await this.domainsService.deleteSubdomain(subdomainId);
    }
};
exports.DomainsController = DomainsController;
__decorate([
    (0, common_1.Post)(),
    (0, check_policies_decorator_js_1.CheckPolicies)((ability) => ability.can('create', 'Domain')),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_domain_dto_js_1.CreateDomainDto,
        user_entity_js_1.User]),
    __metadata("design:returntype", Promise)
], DomainsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, check_policies_decorator_js_1.CheckPolicies)((ability) => ability.can('read', 'Domain')),
    __param(0, (0, common_1.Query)('ownerId')),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_js_1.User]),
    __metadata("design:returntype", Promise)
], DomainsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, check_policies_decorator_js_1.CheckPolicies)((ability) => ability.can('read', 'Domain')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DomainsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, check_policies_decorator_js_1.CheckPolicies)((ability) => ability.can('update', 'Domain')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_domain_dto_js_1.UpdateDomainDto,
        user_entity_js_1.User]),
    __metadata("design:returntype", Promise)
], DomainsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, check_policies_decorator_js_1.CheckPolicies)((ability) => ability.can('delete', 'Domain')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_js_1.User]),
    __metadata("design:returntype", Promise)
], DomainsController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/suspend'),
    (0, check_policies_decorator_js_1.CheckPolicies)((ability) => ability.can('update', 'Domain')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_js_1.User]),
    __metadata("design:returntype", Promise)
], DomainsController.prototype, "suspend", null);
__decorate([
    (0, common_1.Post)(':id/unsuspend'),
    (0, check_policies_decorator_js_1.CheckPolicies)((ability) => ability.can('update', 'Domain')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_js_1.User]),
    __metadata("design:returntype", Promise)
], DomainsController.prototype, "unsuspend", null);
__decorate([
    (0, common_1.Get)(':id/stats'),
    (0, check_policies_decorator_js_1.CheckPolicies)((ability) => ability.can('read', 'Domain')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DomainsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id/subdomains'),
    (0, check_policies_decorator_js_1.CheckPolicies)((ability) => ability.can('read', 'Domain')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DomainsController.prototype, "listSubdomains", null);
__decorate([
    (0, common_1.Post)(':id/subdomains'),
    (0, check_policies_decorator_js_1.CheckPolicies)((ability) => ability.can('update', 'Domain')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_subdomain_dto_js_1.CreateSubdomainDto,
        user_entity_js_1.User]),
    __metadata("design:returntype", Promise)
], DomainsController.prototype, "createSubdomain", null);
__decorate([
    (0, common_1.Delete)(':id/subdomains/:subdomainId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, check_policies_decorator_js_1.CheckPolicies)((ability) => ability.can('update', 'Domain')),
    __param(0, (0, common_1.Param)('subdomainId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DomainsController.prototype, "deleteSubdomain", null);
exports.DomainsController = DomainsController = __decorate([
    (0, common_1.Controller)('domains'),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard, policies_guard_js_1.PoliciesGuard),
    __metadata("design:paramtypes", [domains_service_js_1.DomainsService])
], DomainsController);
//# sourceMappingURL=domains.controller.js.map