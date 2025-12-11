import { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui';
import {
  useDirectory,
  useAccessInfo,
  useCreateFile,
  useCreateDirectory,
  useDeleteFile,
  useDeleteDirectory,
  useUploadFile,
} from '@/hooks/useFileManager';
import { getDownloadUrl } from '@/lib/api/files';
import { FileList } from './FileList';
import { FileBreadcrumb } from './FileBreadcrumb';
import { FileToolbar } from './FileToolbar';
import { NewFileModal } from './NewFileModal';
import { NewFolderModal } from './NewFolderModal';
import { UploadModal } from './UploadModal';
import type { FileInfo } from '@/types';

export function FilesPage() {
  const [currentPath, setCurrentPath] = useState('.');
  const [showHidden, setShowHidden] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { data: accessInfo } = useAccessInfo();
  const { data: directoryData, isLoading, refetch } = useDirectory({
    path: currentPath,
    showHidden,
  });

  const createFileMutation = useCreateFile();
  const createDirectoryMutation = useCreateDirectory();
  const deleteFileMutation = useDeleteFile();
  const deleteDirectoryMutation = useDeleteDirectory();
  const uploadFileMutation = useUploadFile();

  const files = directoryData?.files || [];

  const selectedFileObjects = useMemo(() => {
    return files.filter((f) => selectedFiles.has(f.path));
  }, [files, selectedFiles]);

  const handleNavigate = useCallback((path: string) => {
    setCurrentPath(path);
    setSelectedFiles(new Set());
  }, []);

  const handleSelect = useCallback((file: FileInfo, isMultiSelect: boolean) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(isMultiSelect ? prev : []);
      if (prev.has(file.path) && isMultiSelect) {
        newSet.delete(file.path);
      } else {
        newSet.add(file.path);
      }
      return newSet;
    });
  }, []);

  const handleOpen = useCallback((file: FileInfo) => {
    if (file.type === 'directory') {
      const newPath = currentPath === '.' ? file.name : `${currentPath}/${file.name}`;
      handleNavigate(newPath);
    } else {
      // Open file editor (could be implemented later)
      toast('File editor coming soon!');
    }
  }, [currentPath, handleNavigate]);

  const handleContextMenu = useCallback((_file: FileInfo, event: React.MouseEvent) => {
    event.preventDefault();
    // Context menu implementation could be added here
  }, []);

  const handleCreateFile = useCallback(
    async (name: string) => {
      try {
        const path = currentPath === '.' ? name : `${currentPath}/${name}`;
        await createFileMutation.mutateAsync({ path });
        toast.success('File created successfully');
        setIsNewFileModalOpen(false);
        refetch();
      } catch (error) {
        toast.error('Failed to create file');
      }
    },
    [currentPath, createFileMutation, refetch]
  );

  const handleCreateFolder = useCallback(
    async (name: string) => {
      try {
        const path = currentPath === '.' ? name : `${currentPath}/${name}`;
        await createDirectoryMutation.mutateAsync({ path });
        toast.success('Folder created successfully');
        setIsNewFolderModalOpen(false);
        refetch();
      } catch (error) {
        toast.error('Failed to create folder');
      }
    },
    [currentPath, createDirectoryMutation, refetch]
  );

  const handleUpload = useCallback(
    async (uploadFiles: File[]) => {
      try {
        for (const file of uploadFiles) {
          await uploadFileMutation.mutateAsync({
            file,
            path: currentPath,
          });
        }
        toast.success(`${uploadFiles.length} file(s) uploaded successfully`);
        setIsUploadModalOpen(false);
        refetch();
      } catch (error) {
        toast.error('Failed to upload files');
      }
    },
    [currentPath, uploadFileMutation, refetch]
  );

  const handleDelete = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    const confirmMessage =
      selectedFiles.size === 1
        ? 'Are you sure you want to delete this item?'
        : `Are you sure you want to delete ${selectedFiles.size} items?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      for (const file of selectedFileObjects) {
        if (file.type === 'directory') {
          await deleteDirectoryMutation.mutateAsync({
            path: file.path,
            recursive: true,
          });
        } else {
          await deleteFileMutation.mutateAsync({ path: file.path });
        }
      }
      toast.success('Deleted successfully');
      setSelectedFiles(new Set());
      refetch();
    } catch (error) {
      toast.error('Failed to delete some items');
    }
  }, [selectedFiles, selectedFileObjects, deleteFileMutation, deleteDirectoryMutation, refetch]);

  const handleDownload = useCallback(() => {
    if (selectedFiles.size !== 1) return;
    const file = selectedFileObjects[0];
    if (!file || file.type === 'directory') return;

    const url = getDownloadUrl(file.path);
    window.open(url, '_blank');
  }, [selectedFiles, selectedFileObjects]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          File Manager
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Browse and manage your files
          {accessInfo?.basePath && (
            <span className="ml-2 font-mono text-xs">({accessInfo.basePath})</span>
          )}
        </p>
      </div>

      <Card className="p-4">
        <FileToolbar
          showHidden={showHidden}
          hasSelection={selectedFiles.size > 0}
          selectionCount={selectedFiles.size}
          onUpload={() => setIsUploadModalOpen(true)}
          onNewFile={() => setIsNewFileModalOpen(true)}
          onNewFolder={() => setIsNewFolderModalOpen(true)}
          onRefresh={() => refetch()}
          onDelete={handleDelete}
          onDownload={handleDownload}
          onToggleHidden={() => setShowHidden(!showHidden)}
        />

        <div className="mt-4">
          <FileBreadcrumb
            currentPath={currentPath}
            onNavigate={handleNavigate}
          />
        </div>

        <div className="mt-4">
          <FileList
            files={files}
            isLoading={isLoading}
            selectedFiles={selectedFiles}
            onSelect={handleSelect}
            onOpen={handleOpen}
            onContextMenu={handleContextMenu}
          />
        </div>
      </Card>

      <NewFileModal
        isOpen={isNewFileModalOpen}
        onClose={() => setIsNewFileModalOpen(false)}
        onSubmit={handleCreateFile}
        isLoading={createFileMutation.isPending}
      />

      <NewFolderModal
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        onSubmit={handleCreateFolder}
        isLoading={createDirectoryMutation.isPending}
      />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        isLoading={uploadFileMutation.isPending}
      />
    </div>
  );
}

export default FilesPage;
