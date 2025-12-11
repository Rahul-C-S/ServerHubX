export type DomainStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'ERROR';
export type RuntimeType = 'PHP' | 'NODEJS' | 'STATIC';
export type WebServer = 'APACHE' | 'NGINX';

export interface Domain {
  id: string;
  name: string;
  status: DomainStatus;
  documentRoot: string;
  webServer: WebServer;
  runtimeType: RuntimeType;
  phpVersion?: string;
  nodeVersion?: string;
  sslEnabled: boolean;
  forceHttps: boolean;
  wwwRedirect: boolean;
  diskUsageMb: number;
  bandwidthUsedMb: number;
  ownerId: string;
  systemUserId: string;
  createdAt: string;
  updatedAt: string;
  systemUser?: SystemUser;
}

export interface Subdomain {
  id: string;
  name: string;
  fullName: string;
  documentRoot: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  runtimeType: RuntimeType;
  phpVersion?: string;
  nodeVersion?: string;
  sslEnabled: boolean;
  domainId: string;
  appPort?: number;
  createdAt: string;
}

export interface SystemUser {
  id: string;
  username: string;
  uid: number;
  gid: number;
  homeDirectory: string;
  shell: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  diskQuotaMb: number;
  diskUsedMb: number;
  sshEnabled: boolean;
  sftpOnly: boolean;
  createdAt: string;
}

export interface SSHKey {
  id: string;
  name: string;
  fingerprint: string;
  keyType: 'RSA' | 'ED25519' | 'ECDSA' | 'DSA';
  keyBits?: number;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateDomainRequest {
  name: string;
  webServer?: WebServer;
  runtimeType?: RuntimeType;
  phpVersion?: string;
  nodeVersion?: string;
  wwwRedirect?: boolean;
}

export interface UpdateDomainRequest {
  status?: DomainStatus;
  runtimeType?: RuntimeType;
  phpVersion?: string;
  nodeVersion?: string;
  sslEnabled?: boolean;
  forceHttps?: boolean;
  wwwRedirect?: boolean;
}

export interface DomainStats {
  diskUsageMb: number;
  bandwidthUsedMb: number;
  subdomainCount: number;
}

export interface CreateSystemUserRequest {
  username: string;
  password?: string;
  shell?: string;
  diskQuotaMb?: number;
  inodeQuota?: number;
  sshEnabled?: boolean;
  sftpOnly?: boolean;
}

export interface AddSSHKeyRequest {
  name: string;
  publicKey: string;
  expiresAt?: string;
}
