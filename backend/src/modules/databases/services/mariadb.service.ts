import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandExecutorService, CommandResult } from '../../../core/executor/command-executor.service.js';
import { LoggerService } from '../../../common/logger/logger.service.js';
import { DatabasePrivilege } from '../entities/database-user.entity.js';

export interface DatabaseInfo {
  name: string;
  sizeBytes: number;
  tableCount: number;
  charset: string;
  collation: string;
}

export interface DatabaseUserInfo {
  username: string;
  host: string;
  privileges: string[];
}

@Injectable()
export class MariaDBService {
  private readonly mysqlUser: string;
  private readonly mysqlPassword: string;
  private readonly mysqlHost: string;
  private readonly mysqlPort: number;

  constructor(
    private readonly commandExecutor: CommandExecutorService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.mysqlUser = this.configService.get<string>('DB_USERNAME', 'root');
    this.mysqlPassword = this.configService.get<string>('DB_PASSWORD', '');
    this.mysqlHost = this.configService.get<string>('DB_HOST', 'localhost');
    this.mysqlPort = this.configService.get<number>('DB_PORT', 3306);
  }

  private buildMysqlArgs(additionalArgs: string[] = []): string[] {
    const args = [
      `-u${this.mysqlUser}`,
      `-h${this.mysqlHost}`,
      `-P${this.mysqlPort}`,
    ];
    if (this.mysqlPassword) {
      args.push(`-p${this.mysqlPassword}`);
    }
    return [...args, ...additionalArgs];
  }

  private async executeQuery(sql: string, database?: string): Promise<CommandResult> {
    const args = this.buildMysqlArgs(['-N', '-B']);
    if (database) {
      args.push(database);
    }
    args.push('-e', sql);

    return this.commandExecutor.execute('mysql', args);
  }

  async createDatabase(
    name: string,
    charset: string = 'utf8mb4',
    collation: string = 'utf8mb4_unicode_ci',
  ): Promise<{ success: boolean; error?: string }> {
    const sql = `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET ${charset} COLLATE ${collation}`;
    const result = await this.executeQuery(sql);

    if (!result.success) {
      this.logger.error(`Failed to create database ${name}: ${result.stderr}`, undefined, 'MariaDBService');
      return { success: false, error: result.stderr };
    }

    this.logger.log(`Created database: ${name}`, 'MariaDBService');
    return { success: true };
  }

  async dropDatabase(name: string): Promise<{ success: boolean; error?: string }> {
    const sql = `DROP DATABASE IF EXISTS \`${name}\``;
    const result = await this.executeQuery(sql);

    if (!result.success) {
      this.logger.error(`Failed to drop database ${name}: ${result.stderr}`, undefined, 'MariaDBService');
      return { success: false, error: result.stderr };
    }

    this.logger.log(`Dropped database: ${name}`, 'MariaDBService');
    return { success: true };
  }

  async getDatabaseInfo(name: string): Promise<DatabaseInfo | null> {
    // Get size and table count
    const sizeQuery = `
      SELECT
        SUM(data_length + index_length) as size,
        COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = '${name}'
    `;
    const sizeResult = await this.executeQuery(sizeQuery);

    if (!sizeResult.success) {
      return null;
    }

    // Get charset and collation
    const charsetQuery = `
      SELECT default_character_set_name, default_collation_name
      FROM information_schema.schemata
      WHERE schema_name = '${name}'
    `;
    const charsetResult = await this.executeQuery(charsetQuery);

    if (!charsetResult.success) {
      return null;
    }

    const [size, tableCount] = sizeResult.stdout.trim().split('\t');
    const [charset, collation] = charsetResult.stdout.trim().split('\t');

    return {
      name,
      sizeBytes: parseInt(size) || 0,
      tableCount: parseInt(tableCount) || 0,
      charset: charset || 'utf8mb4',
      collation: collation || 'utf8mb4_unicode_ci',
    };
  }

  async getDatabaseSize(name: string): Promise<number> {
    const query = `
      SELECT SUM(data_length + index_length) as size
      FROM information_schema.tables
      WHERE table_schema = '${name}'
    `;
    const result = await this.executeQuery(query);

    if (!result.success) {
      return 0;
    }

    return parseInt(result.stdout.trim()) || 0;
  }

  async listDatabases(): Promise<string[]> {
    const result = await this.executeQuery('SHOW DATABASES');

    if (!result.success) {
      return [];
    }

    return result.stdout
      .trim()
      .split('\n')
      .filter((db) => !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(db));
  }

  async createUser(
    username: string,
    password: string,
    host: string = 'localhost',
  ): Promise<{ success: boolean; error?: string }> {
    const sql = `CREATE USER IF NOT EXISTS '${username}'@'${host}' IDENTIFIED BY '${password}'`;
    const result = await this.executeQuery(sql);

    if (!result.success) {
      this.logger.error(`Failed to create user ${username}@${host}: ${result.stderr}`, undefined, 'MariaDBService');
      return { success: false, error: result.stderr };
    }

    this.logger.log(`Created database user: ${username}@${host}`, 'MariaDBService');
    return { success: true };
  }

  async dropUser(
    username: string,
    host: string = 'localhost',
  ): Promise<{ success: boolean; error?: string }> {
    const sql = `DROP USER IF EXISTS '${username}'@'${host}'`;
    const result = await this.executeQuery(sql);

    if (!result.success) {
      this.logger.error(`Failed to drop user ${username}@${host}: ${result.stderr}`, undefined, 'MariaDBService');
      return { success: false, error: result.stderr };
    }

    this.logger.log(`Dropped database user: ${username}@${host}`, 'MariaDBService');
    return { success: true };
  }

  async grantPrivileges(
    username: string,
    host: string,
    database: string,
    privileges: DatabasePrivilege[] = [DatabasePrivilege.ALL],
    canGrant: boolean = false,
  ): Promise<{ success: boolean; error?: string }> {
    const privString = privileges.join(', ');
    const grantOption = canGrant ? ' WITH GRANT OPTION' : '';
    const sql = `GRANT ${privString} ON \`${database}\`.* TO '${username}'@'${host}'${grantOption}`;

    const result = await this.executeQuery(sql);

    if (!result.success) {
      this.logger.error(`Failed to grant privileges: ${result.stderr}`, undefined, 'MariaDBService');
      return { success: false, error: result.stderr };
    }

    // Flush privileges
    await this.executeQuery('FLUSH PRIVILEGES');

    this.logger.log(`Granted ${privString} to ${username}@${host} on ${database}`, 'MariaDBService');
    return { success: true };
  }

  async revokePrivileges(
    username: string,
    host: string,
    database: string,
    privileges: DatabasePrivilege[] = [DatabasePrivilege.ALL],
  ): Promise<{ success: boolean; error?: string }> {
    const privString = privileges.join(', ');
    const sql = `REVOKE ${privString} ON \`${database}\`.* FROM '${username}'@'${host}'`;

    const result = await this.executeQuery(sql);

    if (!result.success) {
      this.logger.error(`Failed to revoke privileges: ${result.stderr}`, undefined, 'MariaDBService');
      return { success: false, error: result.stderr };
    }

    await this.executeQuery('FLUSH PRIVILEGES');

    this.logger.log(`Revoked ${privString} from ${username}@${host} on ${database}`, 'MariaDBService');
    return { success: true };
  }

  async resetPassword(
    username: string,
    host: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    const sql = `ALTER USER '${username}'@'${host}' IDENTIFIED BY '${newPassword}'`;
    const result = await this.executeQuery(sql);

    if (!result.success) {
      this.logger.error(`Failed to reset password for ${username}@${host}: ${result.stderr}`, undefined, 'MariaDBService');
      return { success: false, error: result.stderr };
    }

    await this.executeQuery('FLUSH PRIVILEGES');

    this.logger.log(`Reset password for ${username}@${host}`, 'MariaDBService');
    return { success: true };
  }

  async setUserLimits(
    username: string,
    host: string,
    limits: {
      maxConnections?: number;
      maxQueriesPerHour?: number;
      maxUpdatesPerHour?: number;
      maxConnectionsPerHour?: number;
    },
  ): Promise<{ success: boolean; error?: string }> {
    const limitParts: string[] = [];

    if (limits.maxConnections !== undefined) {
      limitParts.push(`MAX_USER_CONNECTIONS ${limits.maxConnections}`);
    }
    if (limits.maxQueriesPerHour !== undefined) {
      limitParts.push(`MAX_QUERIES_PER_HOUR ${limits.maxQueriesPerHour}`);
    }
    if (limits.maxUpdatesPerHour !== undefined) {
      limitParts.push(`MAX_UPDATES_PER_HOUR ${limits.maxUpdatesPerHour}`);
    }
    if (limits.maxConnectionsPerHour !== undefined) {
      limitParts.push(`MAX_CONNECTIONS_PER_HOUR ${limits.maxConnectionsPerHour}`);
    }

    if (limitParts.length === 0) {
      return { success: true };
    }

    const sql = `ALTER USER '${username}'@'${host}' WITH ${limitParts.join(' ')}`;
    const result = await this.executeQuery(sql);

    if (!result.success) {
      return { success: false, error: result.stderr };
    }

    return { success: true };
  }

  async getUserPrivileges(
    username: string,
    host: string,
    database: string,
  ): Promise<string[]> {
    const sql = `SHOW GRANTS FOR '${username}'@'${host}'`;
    const result = await this.executeQuery(sql);

    if (!result.success) {
      return [];
    }

    // Parse grants to extract privileges for the specific database
    const grants = result.stdout.trim().split('\n');
    const privileges: string[] = [];

    for (const grant of grants) {
      if (grant.includes(`\`${database}\``) || grant.includes('*.*')) {
        const match = grant.match(/GRANT (.+?) ON/);
        if (match) {
          privileges.push(...match[1].split(', '));
        }
      }
    }

    return privileges;
  }

  async backupDatabase(
    name: string,
    outputPath: string,
  ): Promise<{ success: boolean; error?: string }> {
    const args = this.buildMysqlArgs([
      '--single-transaction',
      '--routines',
      '--triggers',
      '--events',
      `--result-file=${outputPath}`,
      name,
    ]);

    const result = await this.commandExecutor.execute('mysqldump', args, {
      timeout: 300000, // 5 minutes for large databases
    });

    if (!result.success) {
      this.logger.error(`Failed to backup database ${name}: ${result.stderr}`, undefined, 'MariaDBService');
      return { success: false, error: result.stderr };
    }

    this.logger.log(`Backed up database ${name} to ${outputPath}`, 'MariaDBService');
    return { success: true };
  }

  async restoreDatabase(
    name: string,
    inputPath: string,
  ): Promise<{ success: boolean; error?: string }> {
    const args = this.buildMysqlArgs([name]);

    const result = await this.commandExecutor.execute('mysql', args, {
      timeout: 300000,
      stdin: `source ${inputPath}`,
    });

    if (!result.success) {
      this.logger.error(`Failed to restore database ${name}: ${result.stderr}`, undefined, 'MariaDBService');
      return { success: false, error: result.stderr };
    }

    this.logger.log(`Restored database ${name} from ${inputPath}`, 'MariaDBService');
    return { success: true };
  }

  async importSQL(
    database: string,
    sql: string,
  ): Promise<{ success: boolean; error?: string }> {
    const args = this.buildMysqlArgs([database]);

    const result = await this.commandExecutor.execute('mysql', args, {
      stdin: sql,
      timeout: 120000,
    });

    if (!result.success) {
      return { success: false, error: result.stderr };
    }

    return { success: true };
  }

  async exportTable(
    database: string,
    table: string,
    format: 'sql' | 'csv' = 'sql',
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    if (format === 'csv') {
      const sql = `SELECT * FROM \`${table}\``;
      const args = this.buildMysqlArgs(['-N', '-B', database, '-e', sql]);

      const result = await this.commandExecutor.execute('mysql', args);

      if (!result.success) {
        return { success: false, error: result.stderr };
      }

      return { success: true, data: result.stdout };
    }

    // SQL format using mysqldump
    const args = this.buildMysqlArgs([
      '--single-transaction',
      '--no-create-info',
      database,
      table,
    ]);

    const result = await this.commandExecutor.execute('mysqldump', args);

    if (!result.success) {
      return { success: false, error: result.stderr };
    }

    return { success: true, data: result.stdout };
  }

  async testConnection(): Promise<boolean> {
    const result = await this.executeQuery('SELECT 1');
    return result.success;
  }
}
