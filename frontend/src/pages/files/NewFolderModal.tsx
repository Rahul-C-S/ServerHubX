import { useState } from 'react';
import { Modal, Input, Button } from '@/components/ui';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isLoading?: boolean;
}

export function NewFolderModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: NewFolderModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
      setName('');
    }
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Folder">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Folder Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter folder name"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || isLoading}>
            {isLoading ? 'Creating...' : 'Create Folder'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default NewFolderModal;
