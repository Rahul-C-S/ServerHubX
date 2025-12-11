import { useState, useEffect } from 'react';
import { Button, Input, Modal, Alert, Select } from '@/components/ui';
import { useCreateDnsRecord, useUpdateDnsRecord } from '@/hooks';
import { getErrorMessage } from '@/lib/api';
import type { DnsRecord, DnsRecordType } from '@/types';

interface DnsRecordFormProps {
  zoneId: string;
  zoneName: string;
  record?: DnsRecord;
  isOpen: boolean;
  onClose: () => void;
}

const recordTypes: { value: DnsRecordType; label: string }[] = [
  { value: 'A', label: 'A - IPv4 Address' },
  { value: 'AAAA', label: 'AAAA - IPv6 Address' },
  { value: 'CNAME', label: 'CNAME - Canonical Name' },
  { value: 'MX', label: 'MX - Mail Exchange' },
  { value: 'TXT', label: 'TXT - Text Record' },
  { value: 'NS', label: 'NS - Nameserver' },
  { value: 'SRV', label: 'SRV - Service Record' },
  { value: 'CAA', label: 'CAA - Certification Authority Authorization' },
  { value: 'PTR', label: 'PTR - Pointer Record' },
];

export function DnsRecordForm({
  zoneId,
  zoneName,
  record,
  isOpen,
  onClose,
}: DnsRecordFormProps) {
  const [type, setType] = useState<DnsRecordType>('A');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [ttl, setTtl] = useState(3600);
  const [priority, setPriority] = useState<number | undefined>();
  const [weight, setWeight] = useState<number | undefined>();
  const [port, setPort] = useState<number | undefined>();
  const [flag, setFlag] = useState('');
  const [tag, setTag] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createRecord = useCreateDnsRecord();
  const updateRecord = useUpdateDnsRecord();
  const isEditing = !!record;

  useEffect(() => {
    if (record) {
      setType(record.type);
      setName(record.name);
      setValue(record.value);
      setTtl(record.ttl);
      setPriority(record.priority);
      setWeight(record.weight);
      setPort(record.port);
      setFlag(record.flag || '');
      setTag(record.tag || '');
      setEnabled(record.enabled);
      setComment(record.comment || '');
    } else {
      resetForm();
    }
  }, [record]);

  const resetForm = () => {
    setType('A');
    setName('');
    setValue('');
    setTtl(3600);
    setPriority(undefined);
    setWeight(undefined);
    setPort(undefined);
    setFlag('');
    setTag('');
    setEnabled(true);
    setComment('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const data = {
        name,
        type,
        value,
        ttl,
        priority: needsPriority ? priority : undefined,
        weight: needsWeight ? weight : undefined,
        port: needsPort ? port : undefined,
        flag: needsCAA ? flag : undefined,
        tag: needsCAA ? tag : undefined,
        enabled,
        comment: comment || undefined,
      };

      if (isEditing) {
        await updateRecord.mutateAsync({
          id: record.id,
          data,
        });
      } else {
        await createRecord.mutateAsync({
          zoneId,
          data,
        });
      }
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const needsPriority = ['MX', 'SRV'].includes(type);
  const needsWeight = type === 'SRV';
  const needsPort = type === 'SRV';
  const needsCAA = type === 'CAA';

  const getValuePlaceholder = () => {
    switch (type) {
      case 'A':
        return '192.168.1.1';
      case 'AAAA':
        return '2001:db8::1';
      case 'CNAME':
        return 'target.example.com';
      case 'MX':
        return 'mail.example.com';
      case 'TXT':
        return 'v=spf1 include:_spf.example.com ~all';
      case 'NS':
        return 'ns1.example.com';
      case 'SRV':
        return 'target.example.com';
      case 'CAA':
        return 'letsencrypt.org';
      case 'PTR':
        return 'host.example.com';
      default:
        return '';
    }
  };

  const getValueHelp = () => {
    switch (type) {
      case 'A':
        return 'IPv4 address';
      case 'AAAA':
        return 'IPv6 address';
      case 'CNAME':
        return 'Canonical name (fully qualified domain)';
      case 'MX':
        return 'Mail server hostname';
      case 'TXT':
        return 'Text value (SPF, DKIM, etc.)';
      case 'NS':
        return 'Nameserver hostname';
      case 'SRV':
        return 'Target hostname';
      case 'CAA':
        return 'Certificate Authority domain';
      case 'PTR':
        return 'Pointer to canonical name';
      default:
        return '';
    }
  };

  const isPending = createRecord.isPending || updateRecord.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit DNS Record' : 'Add DNS Record'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Record Type
          </label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as DnsRecordType)}
            disabled={isEditing}
          >
            {recordTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Name
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="@"
              required
              className="flex-1"
            />
            <span className="text-surface-500 text-sm">.{zoneName}</span>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Use @ for the root domain, or enter a subdomain
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Value
          </label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={getValuePlaceholder()}
            required
          />
          <p className="text-xs text-surface-500 mt-1">{getValueHelp()}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              TTL (seconds)
            </label>
            <Input
              type="number"
              value={ttl}
              onChange={(e) => setTtl(parseInt(e.target.value) || 3600)}
              min={60}
            />
          </div>

          {needsPriority && (
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Priority
              </label>
              <Input
                type="number"
                value={priority || ''}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                min={0}
                required
              />
            </div>
          )}
        </div>

        {needsWeight && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Weight
              </label>
              <Input
                type="number"
                value={weight || ''}
                onChange={(e) => setWeight(parseInt(e.target.value) || 0)}
                min={0}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Port
              </label>
              <Input
                type="number"
                value={port || ''}
                onChange={(e) => setPort(parseInt(e.target.value) || 0)}
                min={0}
                max={65535}
                required
              />
            </div>
          </div>
        )}

        {needsCAA && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Flag
              </label>
              <Input
                value={flag}
                onChange={(e) => setFlag(e.target.value)}
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Tag
              </label>
              <Select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              >
                <option value="issue">issue - Allow issuance</option>
                <option value="issuewild">issuewild - Allow wildcard</option>
                <option value="iodef">iodef - Report violations</option>
              </Select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            Comment (optional)
          </label>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Note about this record"
          />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
              Enable this record
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isEditing ? 'Update Record' : 'Add Record'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
