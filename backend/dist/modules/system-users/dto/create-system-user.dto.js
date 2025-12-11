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
exports.CreateSystemUserDto = void 0;
const class_validator_1 = require("class-validator");
class CreateSystemUserDto {
    username;
    password;
    shell;
    diskQuotaMb;
    inodeQuota;
    sshEnabled;
    sftpOnly;
    ownerId;
}
exports.CreateSystemUserDto = CreateSystemUserDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 32),
    (0, class_validator_1.Matches)(/^[a-z][a-z0-9_-]{2,31}$/, {
        message: 'Username must start with lowercase letter and contain only lowercase letters, numbers, underscore, or hyphen',
    }),
    __metadata("design:type", String)
], CreateSystemUserDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(8, 128),
    __metadata("design:type", String)
], CreateSystemUserDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\/bin\/(bash|sh|false|nologin)|\/usr\/sbin\/nologin$/, {
        message: 'Shell must be a valid shell path',
    }),
    __metadata("design:type", String)
], CreateSystemUserDto.prototype, "shell", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10485760),
    __metadata("design:type", Number)
], CreateSystemUserDto.prototype, "diskQuotaMb", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100000000),
    __metadata("design:type", Number)
], CreateSystemUserDto.prototype, "inodeQuota", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateSystemUserDto.prototype, "sshEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateSystemUserDto.prototype, "sftpOnly", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSystemUserDto.prototype, "ownerId", void 0);
//# sourceMappingURL=create-system-user.dto.js.map