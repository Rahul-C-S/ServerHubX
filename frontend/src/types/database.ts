export type DatabaseType = 'MARIADB' | 'MYSQL';
export type DatabaseStatus = 'ACTIVE' | 'CREATING' | 'ERROR' | 'SUSPENDED';

export interface Database {
  id: string;
  name: string;
  type: DatabaseType;
  status: DatabaseStatus;
  sizeBytes: number;
  charset: string;
  collation: string;
  description?: string;
  lastBackupAt?: string;
  tableCount: number;
  ownerId: string;
  domainId?: string;
  domain?: {
    id: string;
    name: string;
  };
  users: DatabaseUser[];
  createdAt: string;
  updatedAt: string;
}

export type DatabasePrivilege =
  | 'ALL'
  | 'SELECT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'CREATE'
  | 'DROP'
  | 'ALTER'
  | 'INDEX'
  | 'REFERENCES'
  | 'CREATE TEMPORARY TABLES'
  | 'LOCK TABLES'
  | 'EXECUTE'
  | 'CREATE VIEW'
  | 'SHOW VIEW'
  | 'CREATE ROUTINE'
  | 'ALTER ROUTINE'
  | 'EVENT'
  | 'TRIGGER';

export interface DatabaseUser {
  id: string;
  username: string;
  host: string;
  privileges: DatabasePrivilege[];
  canGrant: boolean;
  maxConnections: number;
  maxQueriesPerHour: number;
  maxUpdatesPerHour: number;
  maxConnectionsPerHour: number;
  databaseId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDatabaseDto {
  name: string;
  type?: DatabaseType;
  charset?: string;
  collation?: string;
  description?: string;
  domainId?: string;
  initialUsername?: string;
  initialPassword?: string;
}

export interface CreateDatabaseUserDto {
  username: string;
  password: string;
  host?: string;
  privileges?: DatabasePrivilege[];
  canGrant?: boolean;
  maxConnections?: number;
  maxQueriesPerHour?: number;
  maxUpdatesPerHour?: number;
  maxConnectionsPerHour?: number;
}

export interface UpdateDatabaseUserDto {
  password?: string;
  privileges?: DatabasePrivilege[];
  canGrant?: boolean;
  maxConnections?: number;
  maxQueriesPerHour?: number;
  maxUpdatesPerHour?: number;
  maxConnectionsPerHour?: number;
}
