export type AliasType = 'FORWARD' | 'LOCAL' | 'CATCH_ALL' | 'GROUP';

export interface MailDomain {
  id: string;
  domainName: string;
  domain: {
    id: string;
    name: string;
  };
  enabled: boolean;
  maxMailboxes: number;
  maxAliases: number;
  defaultQuotaBytes: number;
  dkimEnabled: boolean;
  dkimSelector?: string;
  dkimPublicKey?: string;
  spamFilterEnabled: boolean;
  virusScanEnabled: boolean;
  catchAllEnabled: boolean;
  catchAllAddress?: string;
  mailboxes?: Mailbox[];
  aliases?: MailAlias[];
  createdAt: string;
  updatedAt: string;
}

export interface Mailbox {
  id: string;
  localPart: string;
  email: string;
  displayName?: string;
  quotaBytes: number;
  usedBytes: number;
  isActive: boolean;
  forwardingEnabled: boolean;
  forwardingAddresses: string[];
  keepLocalCopy: boolean;
  autoReplyEnabled: boolean;
  autoReplySubject?: string;
  autoReplyMessage?: string;
  autoReplyStartDate?: string;
  autoReplyEndDate?: string;
  lastLoginAt?: string;
  mailDomain: MailDomain;
  createdAt: string;
  updatedAt: string;
}

export interface MailAlias {
  id: string;
  source: string;
  destinations: string[];
  type: AliasType;
  enabled: boolean;
  description?: string;
  mailDomain: MailDomain;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMailDomainDto {
  enabled?: boolean;
  maxMailboxes?: number;
  maxAliases?: number;
  defaultQuotaBytes?: number;
  dkimEnabled?: boolean;
  spamFilterEnabled?: boolean;
  virusScanEnabled?: boolean;
  catchAllEnabled?: boolean;
  catchAllAddress?: string;
}

export interface UpdateMailDomainDto {
  enabled?: boolean;
  maxMailboxes?: number;
  maxAliases?: number;
  defaultQuotaBytes?: number;
  dkimEnabled?: boolean;
  spamFilterEnabled?: boolean;
  virusScanEnabled?: boolean;
  catchAllEnabled?: boolean;
  catchAllAddress?: string;
}

export interface CreateMailboxDto {
  localPart: string;
  password: string;
  displayName?: string;
  quotaBytes?: number;
  isActive?: boolean;
  forwardingEnabled?: boolean;
  forwardingAddresses?: string[];
  keepLocalCopy?: boolean;
  autoReplyEnabled?: boolean;
  autoReplySubject?: string;
  autoReplyMessage?: string;
  autoReplyStartDate?: string;
  autoReplyEndDate?: string;
}

export interface UpdateMailboxDto {
  password?: string;
  displayName?: string;
  quotaBytes?: number;
  isActive?: boolean;
  forwardingEnabled?: boolean;
  forwardingAddresses?: string[];
  keepLocalCopy?: boolean;
  autoReplyEnabled?: boolean;
  autoReplySubject?: string;
  autoReplyMessage?: string;
  autoReplyStartDate?: string;
  autoReplyEndDate?: string;
}

export interface CreateMailAliasDto {
  source: string;
  destinations: string[];
  type?: AliasType;
  enabled?: boolean;
  description?: string;
}

export interface UpdateMailAliasDto {
  destinations?: string[];
  type?: AliasType;
  enabled?: boolean;
  description?: string;
}

export interface MailDnsRecords {
  dkim: { name: string; type: string; value: string } | null;
  spf: { name: string; type: string; value: string };
  dmarc: { name: string; type: string; value: string };
}

export interface MailServiceStatus {
  postfix: { running: boolean; enabled: boolean };
  dovecot: { running: boolean; enabled: boolean };
}
