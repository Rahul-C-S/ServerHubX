import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui';

interface FileBreadcrumbProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function FileBreadcrumb({ currentPath, onNavigate }: FileBreadcrumbProps) {
  const parts = currentPath.split('/').filter(Boolean);

  const breadcrumbs: { name: string; path: string }[] = [
    { name: 'Home', path: '.' },
  ];

  let accumulatedPath = '';
  for (const part of parts) {
    accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
    breadcrumbs.push({ name: part, path: accumulatedPath });
  }

  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto pb-2">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" />
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`flex items-center gap-1 ${
              index === breadcrumbs.length - 1
                ? 'text-gray-900 dark:text-white font-medium'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => onNavigate(crumb.path)}
          >
            {index === 0 && <Home className="w-4 h-4" />}
            <span className="truncate max-w-[150px]">{crumb.name}</span>
          </Button>
        </div>
      ))}
    </nav>
  );
}

export default FileBreadcrumb;
