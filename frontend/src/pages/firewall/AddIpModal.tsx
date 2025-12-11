import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AddIpModalProps {
  type: 'allow' | 'block' | 'temp-block';
  onClose: () => void;
  onSubmit: (data: { ip: string; comment?: string; ttlSeconds?: number }) => void;
  isLoading: boolean;
}

export function AddIpModal({ type, onClose, onSubmit, isLoading }: AddIpModalProps) {
  const [ip, setIp] = useState('');
  const [comment, setComment] = useState('');
  const [ttlHours, setTtlHours] = useState('1');

  const title = type === 'allow' ? 'Allow IP Address' : type === 'block' ? 'Block IP Address' : 'Temporarily Block IP';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipPattern.test(ip)) {
      alert('Please enter a valid IP address');
      return;
    }

    const data: { ip: string; comment?: string; ttlSeconds?: number } = {
      ip,
      comment: comment || undefined,
    };

    if (type === 'temp-block') {
      const hours = parseFloat(ttlHours);
      if (isNaN(hours) || hours < 0.016) { // Minimum 1 minute
        alert('Please enter a valid duration (minimum 1 minute)');
        return;
      }
      data.ttlSeconds = Math.floor(hours * 3600);
    }

    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="IP Address"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="e.g., 192.168.1.100 or 192.168.1.0/24"
            required
          />

          {type === 'temp-block' && (
            <Input
              label="Duration (hours)"
              type="number"
              step="0.5"
              min="0.016"
              value={ttlHours}
              onChange={(e) => setTtlHours(e.target.value)}
              placeholder="e.g., 1"
              required
            />
          )}

          <Input
            label="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={type === 'block' ? 'e.g., Suspicious activity' : 'e.g., Office IP'}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={type === 'allow' ? 'primary' : 'danger'}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : type === 'allow' ? 'Allow IP' : 'Block IP'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
