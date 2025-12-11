import { Ability, InferSubjects } from '@casl/ability';
import { User, UserRole } from '../users/entities/user.entity.js';
export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';
type Subjects = InferSubjects<typeof User> | 'User' | 'Domain' | 'SystemUser' | 'App' | 'Database' | 'DnsZone' | 'DnsRecord' | 'SslCertificate' | 'Mailbox' | 'MailAlias' | 'Backup' | 'CronJob' | 'Service' | 'Firewall' | 'Settings' | 'all';
export type AppAbility = Ability<[Action, Subjects]>;
interface UserContext {
    id: string;
    role: UserRole;
    parentResellerId?: string;
}
export declare class CaslAbilityFactory {
    createForUser(user: UserContext): AppAbility;
}
export {};
