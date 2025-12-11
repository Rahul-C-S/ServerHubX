import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FirewallProtocol, FirewallDirection } from '@/types/system';

interface AddPortModalProps {
  onClose: () => void;
  onSubmit: (data: { port: number; protocol: FirewallProtocol; direction: FirewallDirection; comment?: string }) => void;
  isLoading: boolean;
}

export function AddPortModal({ onClose, onSubmit, isLoading }: AddPortModalProps) {
  const [port, setPort] = useState('');
  const [protocol, setProtocol] = useState<FirewallProtocol>(FirewallProtocol.TCP);
  const [direction, setDirection] = useState<FirewallDirection>(FirewallDirection.BOTH);
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const portNumber = parseInt(port, 10);
    if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      alert('Please enter a valid port number (1-65535)');
      return;
    }
    onSubmit({ port: portNumber, protocol, direction, comment: comment || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Allow Port</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Port Number"
            type="number"
            min="1"
            max="65535"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="e.g., 8080"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Protocol</label>
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as FirewallProtocol)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={FirewallProtocol.TCP}>TCP</option>
              <option value={FirewallProtocol.UDP}>UDP</option>
              <option value={FirewallProtocol.BOTH}>Both TCP & UDP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as FirewallDirection)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={FirewallDirection.IN}>Inbound Only</option>
              <option value={FirewallDirection.OUT}>Outbound Only</option>
              <option value={FirewallDirection.BOTH}>Both Directions</option>
            </select>
          </div>

          <Input
            label="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g., Custom application port"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Port'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
