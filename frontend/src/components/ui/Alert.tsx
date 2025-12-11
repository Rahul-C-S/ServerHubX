import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlertProps {
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onClose?: () => void;
  className?: string;
}

const variantStyles = {
  info: {
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-800 dark:text-blue-300',
    content: 'text-blue-700 dark:text-blue-400',
  },
  success: {
    container: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-800 dark:text-green-300',
    content: 'text-green-700 dark:text-green-400',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-800 dark:text-amber-300',
    content: 'text-amber-700 dark:text-amber-400',
  },
  error: {
    container: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-800 dark:text-red-300',
    content: 'text-red-700 dark:text-red-400',
  },
};

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

export function Alert({
  children,
  variant = 'info',
  title,
  onClose,
  className,
}: AlertProps) {
  const styles = variantStyles[variant];
  const Icon = icons[variant];

  return (
    <div
      className={cn(
        'relative flex gap-3 p-4 rounded-lg border',
        styles.container,
        className
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', styles.icon)} />
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={cn('font-medium mb-1', styles.title)}>{title}</h4>
        )}
        <div className={cn('text-sm', styles.content)}>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={cn(
            'flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5',
            styles.icon
          )}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
