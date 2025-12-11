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
exports.DistroDetectorService = void 0;
const common_1 = require("@nestjs/common");
const promises_1 = require("fs/promises");
const logger_service_js_1 = require("../../common/logger/logger.service.js");
let DistroDetectorService = class DistroDetectorService {
    logger;
    distroInfo = null;
    constructor(logger) {
        this.logger = logger;
    }
    async onModuleInit() {
        await this.detectDistro();
    }
    async detectDistro() {
        if (this.distroInfo) {
            return this.distroInfo;
        }
        try {
            this.distroInfo = await this.parseOsRelease();
        }
        catch {
            this.distroInfo = await this.fallbackDetection();
        }
        this.logger.log(`Detected OS: ${this.distroInfo.name} ${this.distroInfo.version} (${this.distroInfo.family})`, 'DistroDetector');
        return this.distroInfo;
    }
    async parseOsRelease() {
        const content = await (0, promises_1.readFile)('/etc/os-release', 'utf-8');
        const lines = content.split('\n');
        const data = {};
        for (const line of lines) {
            const match = line.match(/^([A-Z_]+)=(.*)$/);
            if (match) {
                const key = match[1];
                let value = match[2];
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                data[key] = value;
            }
        }
        const id = (data['ID'] || 'unknown').toLowerCase();
        const family = this.determineFamily(id);
        return {
            id,
            name: data['NAME'] || data['PRETTY_NAME'] || 'Unknown',
            version: data['VERSION'] || data['VERSION_ID'] || 'Unknown',
            versionId: data['VERSION_ID'] || 'Unknown',
            family,
            packageManager: family === 'debian' ? 'apt' : family === 'rhel' ? 'dnf' : 'unknown',
            codename: data['VERSION_CODENAME'],
        };
    }
    async fallbackDetection() {
        try {
            const content = await (0, promises_1.readFile)('/etc/debian_version', 'utf-8');
            return {
                id: 'debian',
                name: 'Debian',
                version: content.trim(),
                versionId: content.trim().split('.')[0],
                family: 'debian',
                packageManager: 'apt',
            };
        }
        catch {
        }
        try {
            const content = await (0, promises_1.readFile)('/etc/redhat-release', 'utf-8');
            const match = content.match(/(\w+).*release\s+([\d.]+)/i);
            if (match) {
                const name = match[1].toLowerCase();
                return {
                    id: name,
                    name: match[1],
                    version: match[2],
                    versionId: match[2].split('.')[0],
                    family: 'rhel',
                    packageManager: 'dnf',
                };
            }
        }
        catch {
        }
        this.logger.warn('Could not detect Linux distribution', 'DistroDetector');
        return {
            id: 'unknown',
            name: 'Unknown',
            version: 'Unknown',
            versionId: 'Unknown',
            family: 'unknown',
            packageManager: 'unknown',
        };
    }
    determineFamily(id) {
        const debianFamily = ['debian', 'ubuntu', 'linuxmint', 'pop', 'elementary', 'kali'];
        const rhelFamily = ['rhel', 'centos', 'rocky', 'almalinux', 'fedora', 'ol', 'amzn'];
        if (debianFamily.includes(id)) {
            return 'debian';
        }
        if (rhelFamily.includes(id)) {
            return 'rhel';
        }
        return 'unknown';
    }
    getDistroInfo() {
        if (!this.distroInfo) {
            throw new Error('Distribution not yet detected. Call detectDistro() first.');
        }
        return this.distroInfo;
    }
    isDebian() {
        return this.getDistroInfo().family === 'debian';
    }
    isRHEL() {
        return this.getDistroInfo().family === 'rhel';
    }
    getPackageManager() {
        return this.getDistroInfo().packageManager;
    }
};
exports.DistroDetectorService = DistroDetectorService;
exports.DistroDetectorService = DistroDetectorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_js_1.LoggerService])
], DistroDetectorService);
//# sourceMappingURL=distro-detector.service.js.map