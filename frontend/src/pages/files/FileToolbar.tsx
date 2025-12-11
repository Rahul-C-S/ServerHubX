import {
  Upload,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Trash2,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui';

interface FileToolbarProps {
  showHidden: boolean;
  hasSelection: boolean;
  selectionCount: number;
  onUpload: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onToggleHidden: () => void;
}

export function FileToolbar({
  showHidden,
  hasSelection,
  selectionCount,
  onUpload,
  onNewFile,
  onNewFolder,
  onRefresh,
  onDelete,
  onDownload,
  onToggleHidden,
}: FileToolbarProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b dark:border-gray-700">
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={onUpload}>
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
        <Button variant="secondary" size="sm" onClick={onNewFolder}>
          <FolderPlus className="w-4 h-4 mr-2" />
          New Folder
        </Button>
        <Button variant="secondary" size="sm" onClick={onNewFile}>
          <FilePlus className="w-4 h-4 mr-2" />
          New File
        </Button>
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleHidden}
          title={showHidden ? 'Hide hidden files' : 'Show hidden files'}
        >
          {showHidden ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </Button>
      </div>
      {hasSelection && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {selectionCount} item{selectionCount > 1 ? 's' : ''} selected
          </span>
          <Button variant="secondary" size="sm" onClick={onDownload} disabled={selectionCount !== 1}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

export default FileToolbar;
