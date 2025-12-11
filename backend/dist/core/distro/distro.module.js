"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistroModule = void 0;
const common_1 = require("@nestjs/common");
const distro_detector_service_js_1 = require("./distro-detector.service.js");
const path_resolver_service_js_1 = require("./path-resolver.service.js");
let DistroModule = class DistroModule {
};
exports.DistroModule = DistroModule;
exports.DistroModule = DistroModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [distro_detector_service_js_1.DistroDetectorService, path_resolver_service_js_1.PathResolverService],
        exports: [distro_detector_service_js_1.DistroDetectorService, path_resolver_service_js_1.PathResolverService],
    })
], DistroModule);
//# sourceMappingURL=distro.module.js.map