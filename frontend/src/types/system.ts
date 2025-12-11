export const FirewallRuleType = {
  PORT_ALLOW: 'PORT_ALLOW',
  PORT_DENY: 'PORT_DENY',
  IP_ALLOW: 'IP_ALLOW',
  IP_DENY: 'IP_DENY',
  IP_TEMP_BLOCK: 'IP_TEMP_BLOCK',
} as const;
export type FirewallRuleType = typeof FirewallRuleType[keyof typeof FirewallRuleType];

export const FirewallProtocol = {
  TCP: 'TCP',
  UDP: 'UDP',
  BOTH: 'BOTH',
} as const;
export type FirewallProtocol = typeof FirewallProtocol[keyof typeof FirewallProtocol];

export const FirewallDirection = {
  IN: 'IN',
  OUT: 'OUT',
  BOTH: 'BOTH',
} as const;
export type FirewallDirection = typeof FirewallDirection[keyof typeof FirewallDirection];

export interface FirewallRule {
  id: string;
  type: FirewallRuleType;
  port?: number;
  protocol: FirewallProtocol;
  direction: FirewallDirection;
  ipAddress?: string;
  comment?: string;
  enabled: boolean;
  expiresAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CSFStatus {
  isRunning: boolean;
  isEnabled: boolean;
  version: string | null;
  testingMode: boolean;
}

export interface LFDStatus {
  isRunning: boolean;
  isEnabled: boolean;
}

export interface FirewallStatus {
  isInstalled: boolean;
  version: string | null;
  csf: CSFStatus;
  lfd: LFDStatus;
}

export interface AllowedPorts {
  tcpIn: number[];
  tcpOut: number[];
  udpIn: number[];
  udpOut: number[];
}

export interface IPEntry {
  ip: string;
  comment?: string;
  addedAt?: string;
  expiresAt?: string;
}

export interface IPLists {
  allowed: IPEntry[];
  blocked: IPEntry[];
  tempBlocks: IPEntry[];
}

export interface LFDSettings {
  loginFailureTrigger: number;
  loginFailureInterval: number;
  sshFailureLimit: number;
  ftpFailureLimit: number;
  smtpAuthFailureLimit: number;
  imapFailureLimit: number;
  pop3FailureLimit: number;
  htaccessFailureLimit: number;
  modsecFailureLimit: number;
  directAdminFailureLimit: number;
}

export interface LFDBlockedLogin {
  ip: string;
  service: string;
  blockedAt: string;
  reason: string;
}

export interface LFDInfo {
  status: LFDStatus;
  settings: LFDSettings;
  blockedLogins: LFDBlockedLogin[];
  ignoredIps: { ip: string; comment?: string }[];
}

// SSH Types
export interface SSHConfig {
  port: number;
  permitRootLogin: 'yes' | 'no' | 'prohibit-password' | 'without-password';
  passwordAuthentication: boolean;
  pubkeyAuthentication: boolean;
  maxAuthTries: number;
  loginGraceTime: number;
  x11Forwarding: boolean;
  allowTcpForwarding: boolean;
  usePAM: boolean;
}

export interface SSHSecuritySettings {
  permitRootLogin: 'yes' | 'no' | 'prohibit-password';
  passwordAuthentication: boolean;
  pubkeyAuthentication: boolean;
  maxAuthTries: number;
  loginGraceTime: number;
}

export interface SSHConnectionInfo {
  hostname: string;
  port: number;
  command: string;
}

// System Info Types
export interface OsInfo {
  platform: string;
  distro: string;
  distroVersion: string;
  kernel: string;
  arch: string;
  hostname: string;
}

export interface SystemUptime {
  seconds: number;
  formatted: string;
  bootTime: string;
}

export interface LoadAverage {
  load1: number;
  load5: number;
  load15: number;
}

export interface MemoryInfo {
  total: number;
  used: number;
  free: number;
  usedPercent: number;
}

export interface DiskInfo {
  total: number;
  used: number;
  free: number;
  usedPercent: number;
}

export interface SystemInfo {
  os: OsInfo;
  uptime: SystemUptime;
  load: LoadAverage;
  memory: MemoryInfo;
  disk: DiskInfo | null;
}

export interface InstalledVersion {
  version: string;
  default?: boolean;
}

export interface InstalledVersions {
  php: InstalledVersion[];
  node: InstalledVersion[];
}

export interface ServiceStatus {
  name: string;
  displayName: string;
  status: 'running' | 'stopped' | 'failed' | 'unknown';
  enabled: boolean;
  memory?: number;
  cpu?: number;
}

export interface PackageUpdate {
  name: string;
  currentVersion: string;
  availableVersion: string;
  type: 'security' | 'regular';
}

export interface PackageUpdates {
  count: number;
  securityCount: number;
  updates: PackageUpdate[];
}

// Settings Types
export interface SettingValue {
  key: string;
  value: string | number | boolean | object;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  isSecret: boolean;
}

// DTOs
export interface AllowPortDto {
  port: number;
  protocol?: FirewallProtocol;
  direction?: FirewallDirection;
  comment?: string;
}

export interface BlockIpDto {
  ip: string;
  comment?: string;
}

export interface TempBlockIpDto {
  ip: string;
  ttlSeconds: number;
  comment?: string;
}

export interface UpdateLFDSettingsDto {
  loginFailureTrigger?: number;
  loginFailureInterval?: number;
  sshFailureLimit?: number;
  ftpFailureLimit?: number;
  smtpAuthFailureLimit?: number;
  imapFailureLimit?: number;
  pop3FailureLimit?: number;
}

export interface ConfigureCSFDto {
  tcpIn?: string;
  tcpOut?: string;
  udpIn?: string;
  udpOut?: string;
  testing?: boolean;
}

export interface ChangeSSHPortDto {
  port: number;
}

export interface UpdateSSHSecurityDto {
  permitRootLogin?: 'yes' | 'no' | 'prohibit-password';
  passwordAuthentication?: boolean;
  pubkeyAuthentication?: boolean;
  maxAuthTries?: number;
  loginGraceTime?: number;
}

export interface UpdateSettingDto {
  key: string;
  value: string | number | boolean | object;
  valueType?: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  isSecret?: boolean;
}

export interface OperationResult {
  success: boolean;
  message: string;
  newConnectionInfo?: string;
}
