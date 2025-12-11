"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaslAbilityFactory = void 0;
const ability_1 = require("@casl/ability");
const common_1 = require("@nestjs/common");
const user_entity_js_1 = require("../users/entities/user.entity.js");
let CaslAbilityFactory = class CaslAbilityFactory {
    createForUser(user) {
        const { can, cannot, build } = new ability_1.AbilityBuilder(ability_1.Ability);
        switch (user.role) {
            case user_entity_js_1.UserRole.ROOT_ADMIN:
                can('manage', 'all');
                break;
            case user_entity_js_1.UserRole.RESELLER:
                can('create', 'User');
                can('read', 'User');
                can('update', 'User', { parentResellerId: user.id });
                can('delete', 'User', { parentResellerId: user.id });
                can('manage', 'Domain');
                can('manage', 'SystemUser');
                can('manage', 'App');
                can('manage', 'Database');
                can('manage', 'DnsZone');
                can('manage', 'DnsRecord');
                can('manage', 'SslCertificate');
                can('manage', 'Mailbox');
                can('manage', 'MailAlias');
                can('manage', 'Backup');
                can('manage', 'CronJob');
                cannot('manage', 'Settings');
                cannot('manage', 'Firewall');
                cannot('manage', 'Service');
                break;
            case user_entity_js_1.UserRole.DOMAIN_OWNER:
                can('read', 'User', { id: user.id });
                can('update', 'User', { id: user.id });
                can('read', 'Domain');
                can('update', 'Domain');
                can('manage', 'App');
                can('manage', 'Database');
                can('manage', 'DnsRecord');
                can('read', 'DnsZone');
                can('manage', 'SslCertificate');
                can('manage', 'Mailbox');
                can('manage', 'MailAlias');
                can('manage', 'Backup');
                can('manage', 'CronJob');
                cannot('create', 'Domain');
                cannot('delete', 'Domain');
                cannot('manage', 'SystemUser');
                cannot('manage', 'Settings');
                cannot('manage', 'Firewall');
                cannot('manage', 'Service');
                break;
            case user_entity_js_1.UserRole.DEVELOPER:
                can('read', 'User', { id: user.id });
                can('read', 'Domain');
                can('read', 'App');
                can('read', 'Database');
                can('read', 'DnsRecord');
                cannot('create', 'Domain');
                cannot('update', 'Domain');
                cannot('delete', 'Domain');
                cannot('manage', 'SystemUser');
                cannot('manage', 'SslCertificate');
                cannot('manage', 'Mailbox');
                cannot('manage', 'Settings');
                cannot('manage', 'Firewall');
                cannot('manage', 'Service');
                break;
            default:
                break;
        }
        return build({
            detectSubjectType: (item) => item.constructor,
        });
    }
};
exports.CaslAbilityFactory = CaslAbilityFactory;
exports.CaslAbilityFactory = CaslAbilityFactory = __decorate([
    (0, common_1.Injectable)()
], CaslAbilityFactory);
//# sourceMappingURL=casl-ability.factory.js.map