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
exports.UpdateDomainDto = void 0;
const class_validator_1 = require("class-validator");
const domain_entity_js_1 = require("../entities/domain.entity.js");
class UpdateDomainDto {
    status;
    runtimeType;
    phpVersion;
    nodeVersion;
    sslEnabled;
    forceHttps;
    wwwRedirect;
    customErrorPages;
    extraApacheConfig;
}
exports.UpdateDomainDto = UpdateDomainDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(domain_entity_js_1.DomainStatus),
    __metadata("design:type", String)
], UpdateDomainDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(domain_entity_js_1.RuntimeType),
    __metadata("design:type", String)
], UpdateDomainDto.prototype, "runtimeType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(7\.4|8\.[0-3])$/, {
        message: 'PHP version must be 7.4, 8.0, 8.1, 8.2, or 8.3',
    }),
    __metadata("design:type", String)
], UpdateDomainDto.prototype, "phpVersion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(18|20|22|24)$/, {
        message: 'Node version must be 18, 20, 22, or 24',
    }),
    __metadata("design:type", String)
], UpdateDomainDto.prototype, "nodeVersion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateDomainDto.prototype, "sslEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateDomainDto.prototype, "forceHttps", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateDomainDto.prototype, "wwwRedirect", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateDomainDto.prototype, "customErrorPages", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDomainDto.prototype, "extraApacheConfig", void 0);
//# sourceMappingURL=update-domain.dto.js.map