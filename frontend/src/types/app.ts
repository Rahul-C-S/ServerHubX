export type AppType = 'NODEJS' | 'PHP' | 'STATIC' | 'PYTHON';
export type AppStatus = 'PENDING' | 'DEPLOYING' | 'RUNNING' | 'STOPPED' | 'ERROR' | 'MAINTENANCE';
export type NodeFramework = 'EXPRESS' | 'NESTJS' | 'NEXTJS' | 'NUXT' | 'FASTIFY' | 'OTHER';
export type PhpFramework = 'LARAVEL' | 'SYMFONY' | 'WORDPRESS' | 'DRUPAL' | 'CUSTOM';

export interface Pm2Config {
  instances?: number | 'max';
  exec_mode?: 'fork' | 'cluster';
  max_memory_restart?: string;
  watch?: boolean;
  ignore_watch?: string[];
  env?: Record<string, string>;
  env_production?: Record<string, string>;
  log_date_format?: string;
}

export interface Pm2ProcessInfo {
  name: string;
  pm_id: number;
  status: string;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
}

export interface App {
  id: string;
  name: string;
  type: AppType;
  framework?: NodeFramework | PhpFramework | string;
  path: string;
  entryPoint: string;
  port?: number;
  status: AppStatus;
  pm2ProcessId?: number;
  pm2ProcessName?: string;
  pm2Config?: Pm2Config;
  nodeVersion?: string;
  phpVersion?: string;
  gitRepository?: string;
  gitBranch?: string;
  buildCommand?: string;
  installCommand?: string;
  startCommand?: string;
  autoDeploy: boolean;
  lastDeployedAt?: string;
  lastError?: string;
  domainId: string;
  domain?: {
    id: string;
    name: string;
  };
  processInfo?: Pm2ProcessInfo;
  createdAt: string;
  updatedAt: string;
}

export interface AppEnvironment {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppDto {
  name: string;
  type: AppType;
  framework?: string;
  path?: string;
  entryPoint?: string;
  port?: number;
  nodeVersion?: string;
  phpVersion?: string;
  gitRepository?: string;
  gitBranch?: string;
  buildCommand?: string;
  installCommand?: string;
  startCommand?: string;
  autoDeploy?: boolean;
  domainId: string;
  pm2Config?: Pm2Config;
}

export interface UpdateAppDto {
  name?: string;
  path?: string;
  entryPoint?: string;
  port?: number;
  gitRepository?: string;
  gitBranch?: string;
  buildCommand?: string;
  installCommand?: string;
  startCommand?: string;
  autoDeploy?: boolean;
  pm2Config?: Pm2Config;
  phpVersion?: string;
  nodeVersion?: string;
}

export interface EnvVariable {
  key: string;
  value: string;
  isSecret?: boolean;
}

export interface DeploymentStatus {
  jobId: string;
  appId: string;
  action: string;
  state: string;
  progress: number;
  logs: string[];
  result?: {
    success: boolean;
    appId: string;
    action: string;
    error?: string;
    duration: number;
  };
  createdAt: string;
  processedAt?: string;
  finishedAt?: string;
}

export interface AppLogs {
  out: string;
  err: string;
  combined: string;
}
