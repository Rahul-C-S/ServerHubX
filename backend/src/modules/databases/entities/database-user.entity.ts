import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Database } from './database.entity.js';

export enum DatabasePrivilege {
  ALL = 'ALL',
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  CREATE = 'CREATE',
  DROP = 'DROP',
  ALTER = 'ALTER',
  INDEX = 'INDEX',
  REFERENCES = 'REFERENCES',
  CREATE_TEMPORARY_TABLES = 'CREATE TEMPORARY TABLES',
  LOCK_TABLES = 'LOCK TABLES',
  EXECUTE = 'EXECUTE',
  CREATE_VIEW = 'CREATE VIEW',
  SHOW_VIEW = 'SHOW VIEW',
  CREATE_ROUTINE = 'CREATE ROUTINE',
  ALTER_ROUTINE = 'ALTER ROUTINE',
  EVENT = 'EVENT',
  TRIGGER = 'TRIGGER',
}

@Entity('database_users')
@Index(['username', 'host'], { unique: true })
@Index(['databaseId'])
export class DatabaseUser extends BaseEntity {
  @Column({ length: 32 })
  username!: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({ length: 60, default: 'localhost' })
  host!: string;

  @Column({
    type: 'simple-array',
    default: 'ALL',
  })
  privileges!: string[];

  @Column({ name: 'can_grant', default: false })
  canGrant!: boolean;

  @Column({ name: 'database_id' })
  databaseId!: string;

  @ManyToOne(() => Database, (db) => db.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'database_id' })
  database!: Database;

  @Column({ name: 'max_connections', type: 'int', default: 0 })
  maxConnections!: number;

  @Column({ name: 'max_queries_per_hour', type: 'int', default: 0 })
  maxQueriesPerHour!: number;

  @Column({ name: 'max_updates_per_hour', type: 'int', default: 0 })
  maxUpdatesPerHour!: number;

  @Column({ name: 'max_connections_per_hour', type: 'int', default: 0 })
  maxConnectionsPerHour!: number;

  getFullUsername(): string {
    return `'${this.username}'@'${this.host}'`;
  }

  hasPrivilege(privilege: DatabasePrivilege): boolean {
    return this.privileges.includes('ALL') || this.privileges.includes(privilege);
  }
}
