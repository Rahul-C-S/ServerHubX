"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const domains_service_js_1 = require("./domains.service.js");
const domains_controller_js_1 = require("./domains.controller.js");
const vhost_service_js_1 = require("./services/vhost.service.js");
const php_fpm_service_js_1 = require("./services/php-fpm.service.js");
const domain_entity_js_1 = require("./entities/domain.entity.js");
const subdomain_entity_js_1 = require("./entities/subdomain.entity.js");
const core_module_js_1 = require("../../core/core.module.js");
const system_users_module_js_1 = require("../system-users/system-users.module.js");
let DomainsModule = class DomainsModule {
};
exports.DomainsModule = DomainsModule;
exports.DomainsModule = DomainsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([domain_entity_js_1.Domain, subdomain_entity_js_1.Subdomain]),
            core_module_js_1.CoreModule,
            system_users_module_js_1.SystemUsersModule,
        ],
        providers: [domains_service_js_1.DomainsService, vhost_service_js_1.VhostService, php_fpm_service_js_1.PhpFpmService],
        controllers: [domains_controller_js_1.DomainsController],
        exports: [domains_service_js_1.DomainsService, vhost_service_js_1.VhostService, php_fpm_service_js_1.PhpFpmService],
    })
], DomainsModule);
//# sourceMappingURL=domains.module.js.map