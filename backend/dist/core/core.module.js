"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreModule = void 0;
const common_1 = require("@nestjs/common");
const executor_module_js_1 = require("./executor/executor.module.js");
const validators_module_js_1 = require("./validators/validators.module.js");
const distro_module_js_1 = require("./distro/distro.module.js");
const rollback_module_js_1 = require("./rollback/rollback.module.js");
const audit_module_js_1 = require("./audit/audit.module.js");
let CoreModule = class CoreModule {
};
exports.CoreModule = CoreModule;
exports.CoreModule = CoreModule = __decorate([
    (0, common_1.Module)({
        imports: [
            executor_module_js_1.ExecutorModule,
            validators_module_js_1.ValidatorsModule,
            distro_module_js_1.DistroModule,
            rollback_module_js_1.RollbackModule,
            audit_module_js_1.AuditModule,
        ],
        exports: [
            executor_module_js_1.ExecutorModule,
            validators_module_js_1.ValidatorsModule,
            distro_module_js_1.DistroModule,
            rollback_module_js_1.RollbackModule,
            audit_module_js_1.AuditModule,
        ],
    })
], CoreModule);
//# sourceMappingURL=core.module.js.map