"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionManagerService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const logger_service_js_1 = require("../../common/logger/logger.service.js");
let TransactionManagerService = class TransactionManagerService {
    logger;
    activeTransactions = new Map();
    snapshotDir = '/tmp/serverhubx-snapshots';
    constructor(logger) {
        this.logger = logger;
    }
    async startTransaction() {
        const transactionId = (0, uuid_1.v4)();
        if (!(0, fs_1.existsSync)(this.snapshotDir)) {
            await (0, promises_1.mkdir)(this.snapshotDir, { recursive: true });
        }
        const transaction = {
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
    addRollbackAction(transactionId, action) {
        const transaction = this.getTransaction(transactionId);
        transaction.rollbackActions.push(action);
    }
    async snapshotFile(transactionId, filePath) {
        const transaction = this.getTransaction(transactionId);
        if (!(0, fs_1.existsSync)(filePath)) {
            this.addRollbackAction(transactionId, async () => {
                if ((0, fs_1.existsSync)(filePath)) {
                    await (0, promises_1.unlink)(filePath);
                }
            });
            return;
        }
        const backupPath = path.join(this.snapshotDir, `${transactionId}-${path.basename(filePath)}-${Date.now()}`);
        await (0, promises_1.copyFile)(filePath, backupPath);
        transaction.fileSnapshots.push({
            originalPath: filePath,
            backupPath,
        });
        this.logger.debug(`File snapshot created: ${filePath} -> ${backupPath}`, 'TransactionManager');
    }
    async commit(transactionId) {
        const transaction = this.getTransaction(transactionId);
        if (transaction.committed) {
            throw new Error(`Transaction ${transactionId} already committed`);
        }
        for (const snapshot of transaction.fileSnapshots) {
            try {
                if ((0, fs_1.existsSync)(snapshot.backupPath)) {
                    await (0, promises_1.unlink)(snapshot.backupPath);
                }
            }
            catch (error) {
                this.logger.warn(`Failed to cleanup snapshot: ${snapshot.backupPath}`, 'TransactionManager');
            }
        }
        transaction.committed = true;
        this.activeTransactions.delete(transactionId);
        this.logger.debug(`Transaction committed: ${transactionId}`, 'TransactionManager');
    }
    async rollback(transactionId) {
        const transaction = this.getTransaction(transactionId);
        if (transaction.committed) {
            throw new Error(`Transaction ${transactionId} already committed, cannot rollback`);
        }
        this.logger.warn(`Rolling back transaction: ${transactionId}`, 'TransactionManager');
        const reversedActions = [...transaction.rollbackActions].reverse();
        const errors = [];
        for (const action of reversedActions) {
            try {
                await action();
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`Rollback action failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined, 'TransactionManager');
                errors.push(error instanceof Error ? error : new Error(String(error)));
            }
        }
        for (const snapshot of transaction.fileSnapshots) {
            try {
                if ((0, fs_1.existsSync)(snapshot.backupPath)) {
                    await (0, promises_1.copyFile)(snapshot.backupPath, snapshot.originalPath);
                    await (0, promises_1.unlink)(snapshot.backupPath);
                    this.logger.debug(`File restored: ${snapshot.originalPath}`, 'TransactionManager');
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to restore file: ${snapshot.originalPath} - ${errorMessage}`, undefined, 'TransactionManager');
                errors.push(error instanceof Error ? error : new Error(String(error)));
            }
        }
        this.activeTransactions.delete(transactionId);
        if (errors.length > 0) {
            throw new Error(`Rollback completed with ${errors.length} errors: ${errors.map((e) => e.message).join('; ')}`);
        }
        this.logger.log(`Transaction rolled back: ${transactionId}`, 'TransactionManager');
    }
    async withTransaction(operation) {
        const transactionId = await this.startTransaction();
        try {
            const result = await operation(transactionId);
            await this.commit(transactionId);
            return result;
        }
        catch (error) {
            await this.rollback(transactionId);
            throw error;
        }
    }
    isTransactionActive(transactionId) {
        return this.activeTransactions.has(transactionId);
    }
    getActiveTransactionCount() {
        return this.activeTransactions.size;
    }
    getTransaction(transactionId) {
        const transaction = this.activeTransactions.get(transactionId);
        if (!transaction) {
            throw new Error(`Transaction not found: ${transactionId}`);
        }
        return transaction;
    }
    async cleanupStaleTransactions(maxAgeMs = 3600000) {
        const now = Date.now();
        let cleaned = 0;
        for (const [id, transaction] of this.activeTransactions) {
            const age = now - transaction.startedAt.getTime();
            if (age > maxAgeMs && !transaction.committed) {
                this.logger.warn(`Cleaning up stale transaction: ${id}`, 'TransactionManager');
                try {
                    await this.rollback(id);
                    cleaned++;
                }
                catch (error) {
                    this.logger.error(`Failed to cleanup stale transaction: ${id}`, undefined, 'TransactionManager');
                }
            }
        }
        return cleaned;
    }
};
exports.TransactionManagerService = TransactionManagerService;
exports.TransactionManagerService = TransactionManagerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_js_1.LoggerService])
], TransactionManagerService);
//# sourceMappingURL=transaction-manager.service.js.map