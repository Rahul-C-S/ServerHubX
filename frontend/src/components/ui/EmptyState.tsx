import type { ReactNode } from 'react';
import { FolderOpen, Search, Plus, FileQuestion } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error' | 'folder';
}

const variantIcons = {
  default: <FileQuestion className="w-12 h-12" />,
  search: <Search className="w-12 h-12" />,
  error: <FileQuestion className="w-12 h-12" />,
  folder: <FolderOpen className="w-12 h-12" />,
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-gray-400 dark:text-gray-500 mb-4">
        {icon || variantIcons[variant]}
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          <Plus className="w-4 h-4 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
