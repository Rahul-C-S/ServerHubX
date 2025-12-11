import { LoggerService } from '../../common/logger/logger.service.js';
export type RollbackAction = () => Promise<void>;
export declare class TransactionManagerService {
    private readonly logger;
    private activeTransactions;
    private readonly snapshotDir;
    constructor(logger: LoggerService);
    startTransaction(): Promise<string>;
    addRollbackAction(transactionId: string, action: RollbackAction): void;
    snapshotFile(transactionId: string, filePath: string): Promise<void>;
    commit(transactionId: string): Promise<void>;
    rollback(transactionId: string): Promise<void>;
    withTransaction<T>(operation: (transactionId: string) => Promise<T>): Promise<T>;
    isTransactionActive(transactionId: string): boolean;
    getActiveTransactionCount(): number;
    private getTransaction;
    cleanupStaleTransactions(maxAgeMs?: number): Promise<number>;
}
