"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationModule = void 0;
const common_1 = require("@nestjs/common");
const casl_ability_factory_js_1 = require("./casl-ability.factory.js");
const policies_guard_js_1 = require("./guards/policies.guard.js");
let AuthorizationModule = class AuthorizationModule {
};
exports.AuthorizationModule = AuthorizationModule;
exports.AuthorizationModule = AuthorizationModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [casl_ability_factory_js_1.CaslAbilityFactory, policies_guard_js_1.PoliciesGuard],
        exports: [casl_ability_factory_js_1.CaslAbilityFactory, policies_guard_js_1.PoliciesGuard],
    })
], AuthorizationModule);
//# sourceMappingURL=authorization.module.js.map