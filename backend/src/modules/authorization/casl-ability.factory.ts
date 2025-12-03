import {
  Ability,
  AbilityBuilder,
  AbilityClass,
  ExtractSubjectType,
  InferSubjects,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { User, UserRole } from '../users/entities/user.entity.js';

// Define action types
export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';

// Define subject types - will grow as we add more entities
type Subjects =
  | InferSubjects<typeof User>
  | 'User'
  | 'Domain'
  | 'SystemUser'
  | 'App'
  | 'Database'
  | 'DnsZone'
  | 'DnsRecord'
  | 'SslCertificate'
  | 'Mailbox'
  | 'MailAlias'
  | 'Backup'
  | 'CronJob'
  | 'Service'
  | 'Firewall'
  | 'Settings'
  | 'all';

export type AppAbility = Ability<[Action, Subjects]>;

interface UserContext {
  id: string;
  role: UserRole;
  parentResellerId?: string;
}

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: UserContext): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      Ability as AbilityClass<AppAbility>,
    );

    switch (user.role) {
      case UserRole.ROOT_ADMIN:
        // Full access to everything
        can('manage', 'all');
        break;

      case UserRole.RESELLER:
        // Resellers can manage their own clients and resources
        can('create', 'User');
        can('read', 'User');
        can('update', 'User', { parentResellerId: user.id });
        can('delete', 'User', { parentResellerId: user.id });

        // Can manage domains owned by their clients
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

        // Cannot access system settings or firewall
        cannot('manage', 'Settings');
        cannot('manage', 'Firewall');
        cannot('manage', 'Service');
        break;

      case UserRole.DOMAIN_OWNER:
        // Can only manage their own resources
        can('read', 'User', { id: user.id });
        can('update', 'User', { id: user.id });

        // Domain management (ownership checked at service level)
        can('read', 'Domain');
        can('update', 'Domain');

        // Full management of resources within their domains
        can('manage', 'App');
        can('manage', 'Database');
        can('manage', 'DnsRecord');
        can('read', 'DnsZone');
        can('manage', 'SslCertificate');
        can('manage', 'Mailbox');
        can('manage', 'MailAlias');
        can('manage', 'Backup');
        can('manage', 'CronJob');

        // Cannot create new domains or access system features
        cannot('create', 'Domain');
        cannot('delete', 'Domain');
        cannot('manage', 'SystemUser');
        cannot('manage', 'Settings');
        cannot('manage', 'Firewall');
        cannot('manage', 'Service');
        break;

      case UserRole.DEVELOPER:
        // Limited read access and terminal/file operations
        can('read', 'User', { id: user.id });
        can('read', 'Domain');
        can('read', 'App');
        can('read', 'Database');
        can('read', 'DnsRecord');

        // Developers cannot modify core settings
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
        // No permissions by default
        break;
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
