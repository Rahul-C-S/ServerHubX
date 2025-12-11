export * from './auth';
export * from './domain';
export * from './app';
export * from './database';
export * from './dns';
export * from './ssl';
export * from './mail';
export * from './terminal';
export * from './files';
export * from './backup';
export * from './monitoring';
export * from './notification';
export * from './cron';

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SelectOption {
  value: string;
  label: string;
}
