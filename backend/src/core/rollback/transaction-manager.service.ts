import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { copyFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { LoggerService } from '../../common/logger/logger.service.js';

export type RollbackAction = () => Promise<void>;

interface FileSnapshot {
  originalPath: string;
  backupPath: string;
}

interface Transaction {
  id: string;
  startedAt: Date;
  rollbackActions: RollbackAction[];
  fileSnapshots: FileSnapshot[];
  committed: boolean;
}

@Injectable()
export class TransactionManagerService {
  private activeTransactions = new Map<string, Transaction>();
  private readonly snapshotDir = '/tmp/serverhubx-snapshots';

  constructor(private readonly logger: LoggerService) {}

  async startTransaction(): Promise<string> {
    const transactionId = uuidv4();

    // Ensure snapshot directory exists
    if (!existsSync(this.snapshotDir)) {
      await mkdir(this.snapshotDir, { recursive: true });
    }

    const transaction: Transaction = {
      id: transactionId,
      startedAt: new Date(),
      rollbackActions: [],
      fileSnapshots: [],
      committed: false,
    };

    this.activeTransactions.set(transactionId, transaction);
    this.logger.debug(`Transaction started: ${transactionId}`, 'TransactionManager');

    return transactionId;
  }

  addRollbackAction(transactionId: string, action: RollbackAction): void {
    const transaction = this.getTransaction(transactionId);
    transaction.rollbackActions.push(action);
  }

  async snapshotFile(transactionId: string, filePath: string): Promise<void> {
    const transaction = this.getTransaction(transactionId);

    if (!existsSync(filePath)) {
      // File doesn't exist yet, rollback action should delete it
      this.addRollbackAction(transactionId, async () => {
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      });
      return;
    }

    const backupPath = path.join(
      this.snapshotDir,
      `${transactionId}-${path.basename(filePath)}-${Date.now()}`,
    );

    await copyFile(filePath, backupPath);

    transaction.fileSnapshots.push({
      originalPath: filePath,
      backupPath,
    });

    this.logger.debug(`File snapshot created: ${filePath} -> ${backupPath}`, 'TransactionManager');
  }

  async commit(transactionId: string): Promise<void> {
    const transaction = this.getTransaction(transactionId);

    if (transaction.committed) {
      throw new Error(`Transaction ${transactionId} already committed`);
    }

    // Clean up snapshots
    for (const snapshot of transaction.fileSnapshots) {
      try {
        if (existsSync(snapshot.backupPath)) {
          await unlink(snapshot.backupPath);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to cleanup snapshot: ${snapshot.backupPath}`,
          'TransactionManager',
        );
      }
    }

    transaction.committed = true;
    this.activeTransactions.delete(transactionId);

    this.logger.debug(`Transaction committed: ${transactionId}`, 'TransactionManager');
  }

  async rollback(transactionId: string): Promise<void> {
    const transaction = this.getTransaction(transactionId);

    if (transaction.committed) {
      throw new Error(`Transaction ${transactionId} already committed, cannot rollback`);
    }

    this.logger.warn(`Rolling back transaction: ${transactionId}`, 'TransactionManager');

    // Execute rollback actions in reverse order
    const reversedActions = [...transaction.rollbackActions].reverse();
    const errors: Error[] = [];

    for (const action of reversedActions) {
      try {
        await action();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Rollback action failed: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
          'TransactionManager',
        );
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Restore file snapshots
    for (const snapshot of transaction.fileSnapshots) {
      try {
        if (existsSync(snapshot.backupPath)) {
          await copyFile(snapshot.backupPath, snapshot.originalPath);
          await unlink(snapshot.backupPath);
          this.logger.debug(`File restored: ${snapshot.originalPath}`, 'TransactionManager');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to restore file: ${snapshot.originalPath} - ${errorMessage}`,
          undefined,
          'TransactionManager',
        );
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.activeTransactions.delete(transactionId);

    if (errors.length > 0) {
      throw new Error(
        `Rollback completed with ${errors.length} errors: ${errors.map((e) => e.message).join('; ')}`,
      );
    }

    this.logger.log(`Transaction rolled back: ${transactionId}`, 'TransactionManager');
  }

  async withTransaction<T>(
    operation: (transactionId: string) => Promise<T>,
  ): Promise<T> {
    const transactionId = await this.startTransaction();

    try {
      const result = await operation(transactionId);
      await this.commit(transactionId);
      return result;
    } catch (error) {
      await this.rollback(transactionId);
      throw error;
    }
  }

  isTransactionActive(transactionId: string): boolean {
    return this.activeTransactions.has(transactionId);
  }

  getActiveTransactionCount(): number {
    return this.activeTransactions.size;
  }

  private getTransaction(transactionId: string): Transaction {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }
    return transaction;
  }

  async cleanupStaleTransactions(maxAgeMs: number = 3600000): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, transaction] of this.activeTransactions) {
      const age = now - transaction.startedAt.getTime();
      if (age > maxAgeMs && !transaction.committed) {
        this.logger.warn(`Cleaning up stale transaction: ${id}`, 'TransactionManager');
        try {
          await this.rollback(id);
          cleaned++;
        } catch (error) {
          this.logger.error(
            `Failed to cleanup stale transaction: ${id}`,
            undefined,
            'TransactionManager',
          );
        }
      }
    }

    return cleaned;
  }
}
