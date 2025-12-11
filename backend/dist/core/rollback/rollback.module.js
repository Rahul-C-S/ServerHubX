"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollbackModule = void 0;
const common_1 = require("@nestjs/common");
const transaction_manager_service_js_1 = require("./transaction-manager.service.js");
let RollbackModule = class RollbackModule {
};
exports.RollbackModule = RollbackModule;
exports.RollbackModule = RollbackModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [transaction_manager_service_js_1.TransactionManagerService],
        exports: [transaction_manager_service_js_1.TransactionManagerService],
    })
], RollbackModule);
//# sourceMappingURL=rollback.module.js.map