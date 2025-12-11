import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800',
  error: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800',
  warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800',
  info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800',
};

const iconStyles = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
};

export function NotificationToast() {
  const { notifications, removeNotification } = useUIStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((notification) => {
        const Icon = icons[notification.type];

        return (
          <div
            key={notification.id}
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border shadow-lg',
              'animate-in slide-in-from-right-full fade-in duration-300',
              styles[notification.type]
            )}
            role="alert"
          >
            <Icon className={cn('w-5 h-5 flex-shrink-0', iconStyles[notification.type])} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-surface-900 dark:text-surface-100">
                {notification.title}
              </p>
              {notification.message && (
                <p className="text-sm text-surface-600 dark:text-surface-400 mt-0.5">
                  {notification.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-surface-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
