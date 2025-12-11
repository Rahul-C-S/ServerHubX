import { useState } from 'react';
import { Button, Modal, Alert } from '@/components/ui';
import { Globe, Mail, Shield } from 'lucide-react';

interface DnsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (templateName: string) => Promise<void>;
  isLoading: boolean;
}

const templates = [
  {
    name: 'basic-website',
    label: 'Basic Website',
    description: 'Standard website configuration with A records for root and www',
    icon: Globe,
    records: ['A @ (server IP)', 'A www (server IP)', 'NS records'],
  },
  {
    name: 'email-hosting',
    label: 'Email Hosting',
    description: 'Email server configuration with MX, SPF, and DKIM records',
    icon: Mail,
    records: ['MX records', 'TXT (SPF)', 'TXT (DKIM)', 'TXT (DMARC)'],
  },
  {
    name: 'google-workspace',
    label: 'Google Workspace',
    description: 'Google Workspace email and verification records',
    icon: Mail,
    records: ['MX (Google)', 'TXT (SPF)', 'TXT (verification)', 'CNAME (services)'],
  },
  {
    name: 'ssl-validation',
    label: 'SSL/TLS Ready',
    description: 'CAA records for SSL certificate issuance',
    icon: Shield,
    records: ['CAA (Let\'s Encrypt)', 'CAA (issue)', 'CAA (issuewild)'],
  },
];

export function DnsTemplateModal({
  isOpen,
  onClose,
  onApply,
  isLoading,
}: DnsTemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!selectedTemplate) return;
    setError(null);

    try {
      await onApply(selectedTemplate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply template');
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Apply DNS Template">
      <div className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <p className="text-sm text-surface-600 dark:text-surface-400">
          Select a template to quickly add common DNS records to your zone.
          Existing records will not be affected.
        </p>

        <div className="grid gap-3">
          {templates.map((template) => {
            const Icon = template.icon;
            const isSelected = selectedTemplate === template.name;

            return (
              <button
                key={template.name}
                type="button"
                onClick={() => setSelectedTemplate(template.name)}
                className={`text-left p-4 rounded-lg border-2 transition-colors ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-primary-100 dark:bg-primary-900/30'
                        : 'bg-surface-100 dark:bg-surface-800'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isSelected
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-surface-500'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      {template.label}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                      {template.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.records.map((record, idx) => (
                        <span
                          key={idx}
                          className="inline-flex px-2 py-0.5 text-xs rounded bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
                        >
                          {record}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            isLoading={isLoading}
            disabled={!selectedTemplate}
          >
            Apply Template
          </Button>
        </div>
      </div>
    </Modal>
  );
}
