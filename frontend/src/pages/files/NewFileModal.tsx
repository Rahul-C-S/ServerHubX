import { useState } from 'react';
import { Modal, Input, Button } from '@/components/ui';

interface NewFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, content?: string) => void;
  isLoading?: boolean;
}

export function NewFileModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: NewFileModalProps) {
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New File">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="File Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter file name"
          hint="e.g., index.html, style.css, script.js"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || isLoading}>
            {isLoading ? 'Creating...' : 'Create File'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default NewFileModal;
