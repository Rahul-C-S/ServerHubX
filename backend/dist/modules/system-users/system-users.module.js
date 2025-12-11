"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemUsersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const system_users_service_js_1 = require("./system-users.service.js");
const system_users_controller_js_1 = require("./system-users.controller.js");
const system_user_entity_js_1 = require("./entities/system-user.entity.js");
const ssh_key_entity_js_1 = require("./entities/ssh-key.entity.js");
const core_module_js_1 = require("../../core/core.module.js");
let SystemUsersModule = class SystemUsersModule {
};
exports.SystemUsersModule = SystemUsersModule;
exports.SystemUsersModule = SystemUsersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([system_user_entity_js_1.SystemUser, ssh_key_entity_js_1.SSHKey]),
            core_module_js_1.CoreModule,
        ],
        providers: [system_users_service_js_1.SystemUsersService],
        controllers: [system_users_controller_js_1.SystemUsersController],
        exports: [system_users_service_js_1.SystemUsersService],
    })
], SystemUsersModule);
//# sourceMappingURL=system-users.module.js.map