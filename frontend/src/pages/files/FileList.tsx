import { useMemo } from 'react';
import {
  Folder,
  File,
  FileText,
  FileCode,
  Image,
  Archive,
  Link,
  MoreVertical,
} from 'lucide-react';
import { Badge, Button, Spinner } from '@/components/ui';
import type { FileInfo } from '@/types';

interface FileListProps {
  files: FileInfo[];
  isLoading?: boolean;
  selectedFiles: Set<string>;
  onSelect: (file: FileInfo, isMultiSelect: boolean) => void;
  onOpen: (file: FileInfo) => void;
  onContextMenu: (file: FileInfo, event: React.MouseEvent) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function getFileIcon(file: FileInfo) {
  if (file.type === 'directory') return Folder;
  if (file.type === 'symlink') return Link;

  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext)) {
    return Image;
  }
  if (['zip', 'tar', 'gz', 'rar', '7z', 'tgz'].includes(ext)) {
    return Archive;
  }
  if (
    [
      'js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'scss',
      'php', 'py', 'rb', 'java', 'go', 'rs', 'sh', 'sql', 'yml', 'yaml',
    ].includes(ext)
  ) {
    return FileCode;
  }
  if (['txt', 'md', 'log', 'csv'].includes(ext)) {
    return FileText;
  }

  return File;
}

export function FileList({
  files,
  isLoading,
  selectedFiles,
  onSelect,
  onOpen,
  onContextMenu,
}: FileListProps) {
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      // Directories first
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [files]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Folder className="w-12 h-12 mb-2 text-gray-400" />
        <p>This folder is empty</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b dark:border-gray-700">
            <th className="py-3 px-4">Name</th>
            <th className="py-3 px-4">Size</th>
            <th className="py-3 px-4">Permissions</th>
            <th className="py-3 px-4">Owner</th>
            <th className="py-3 px-4">Modified</th>
            <th className="py-3 px-4 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedFiles.map((file) => {
            const Icon = getFileIcon(file);
            const isSelected = selectedFiles.has(file.path);

            return (
              <tr
                key={file.path}
                className={`
                  cursor-pointer transition-colors
                  ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
                `}
                onClick={(e) => onSelect(file, e.ctrlKey || e.metaKey)}
                onDoubleClick={() => onOpen(file)}
                onContextMenu={(e) => onContextMenu(file, e)}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 ${
                        file.type === 'directory'
                          ? 'text-yellow-500'
                          : file.type === 'symlink'
                          ? 'text-purple-500'
                          : 'text-gray-400'
                      }`}
                    />
                    <span
                      className={`truncate max-w-xs ${
                        file.isHidden ? 'text-gray-400' : ''
                      }`}
                    >
                      {file.name}
                    </span>
                    {file.type === 'symlink' && (
                      <Badge variant="default">symlink</Badge>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {file.type === 'directory' ? '-' : formatFileSize(file.size)}
                </td>
                <td className="py-3 px-4 font-mono text-sm text-gray-500">
                  {file.permissions}
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {file.owner}:{file.group}
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {formatDate(file.modified)}
                </td>
                <td className="py-3 px-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onContextMenu(file, e);
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default FileList;
