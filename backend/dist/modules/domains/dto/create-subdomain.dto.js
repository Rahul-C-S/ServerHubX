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
exports.CreateSubdomainDto = void 0;
const class_validator_1 = require("class-validator");
const domain_entity_js_1 = require("../entities/domain.entity.js");
class CreateSubdomainDto {
    name;
    domainId;
    runtimeType;
    phpVersion;
    nodeVersion;
    isWildcard;
    appPort;
}
exports.CreateSubdomainDto = CreateSubdomainDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 63),
    (0, class_validator_1.Matches)(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
        message: 'Invalid subdomain name format',
    }),
    __metadata("design:type", String)
], CreateSubdomainDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSubdomainDto.prototype, "domainId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(domain_entity_js_1.RuntimeType),
    __metadata("design:type", String)
], CreateSubdomainDto.prototype, "runtimeType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(7\.4|8\.[0-3])$/, {
        message: 'PHP version must be 7.4, 8.0, 8.1, 8.2, or 8.3',
    }),
    __metadata("design:type", String)
], CreateSubdomainDto.prototype, "phpVersion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(18|20|22|24)$/, {
        message: 'Node version must be 18, 20, 22, or 24',
    }),
    __metadata("design:type", String)
], CreateSubdomainDto.prototype, "nodeVersion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateSubdomainDto.prototype, "isWildcard", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(3000),
    (0, class_validator_1.Max)(65535),
    __metadata("design:type", Number)
], CreateSubdomainDto.prototype, "appPort", void 0);
//# sourceMappingURL=create-subdomain.dto.js.map