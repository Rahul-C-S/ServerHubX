export type CronJobStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED';

export interface CronJob {
  id: string;
  domainId: string;
  name: string;
  command: string;
  cronExpression: string;
  description?: string;
  status: CronJobStatus;
  runAsUser: string;
  timeout: number;
  captureOutput: boolean;
  notifyOnFailure: boolean;
  notifyEmail?: string;
  lastRunAt?: string;
  lastRunStatus?: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  lastRunOutput?: string;
  lastRunDuration?: number;
  nextRunAt?: string;
  runCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
  domain?: {
    id: string;
    name: string;
  };
}

export interface CreateCronJobDto {
  domainId: string;
  name: string;
  command: string;
  cronExpression: string;
  description?: string;
  runAsUser?: string;
  timeout?: number;
  captureOutput?: boolean;
  notifyOnFailure?: boolean;
  notifyEmail?: string;
}

export interface UpdateCronJobDto {
  name?: string;
  command?: string;
  cronExpression?: string;
  description?: string;
  status?: CronJobStatus;
  timeout?: number;
  captureOutput?: boolean;
  notifyOnFailure?: boolean;
  notifyEmail?: string;
}

export interface CronJobRunResult {
  success: boolean;
  output?: string;
  error?: string;
  duration?: number;
}
