import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles = {
  default: 'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}

export interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'error' | 'warning';
  label?: string;
  showDot?: boolean;
}

const statusConfig = {
  active: { variant: 'success' as const, defaultLabel: 'Active', dotColor: 'bg-green-500' },
  inactive: { variant: 'default' as const, defaultLabel: 'Inactive', dotColor: 'bg-surface-400' },
  pending: { variant: 'warning' as const, defaultLabel: 'Pending', dotColor: 'bg-amber-500' },
  error: { variant: 'danger' as const, defaultLabel: 'Error', dotColor: 'bg-red-500' },
  warning: { variant: 'warning' as const, defaultLabel: 'Warning', dotColor: 'bg-amber-500' },
};

export function StatusBadge({ status, label, showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant}>
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', config.dotColor)} />
      )}
      {label || config.defaultLabel}
    </Badge>
  );
}
