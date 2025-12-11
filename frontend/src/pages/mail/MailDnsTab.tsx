import { Copy, CheckCircle, Shield, Mail, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, Spinner, Alert, Badge, Button } from '@/components/ui';
import { useMailDnsRecords } from '@/hooks';
import type { MailDomain } from '@/types';

interface MailDnsTabProps {
  mailDomain: MailDomain;
}

export function MailDnsTab({ mailDomain }: MailDnsTabProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const { data: dnsRecords, isLoading, error } = useMailDnsRecords(mailDomain.id);

  const copyToClipboard = async (text: string, recordType: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(recordType);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">Failed to load DNS records.</Alert>;
  }

  return (
    <div className="space-y-6">
      <Alert variant="info">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Configure these DNS records</p>
            <p className="text-sm mt-1">
              Add these records to your DNS zone to ensure proper email delivery
              and authentication.
            </p>
          </div>
        </div>
      </Alert>

      {/* SPF Record */}
      {dnsRecords?.spf && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-surface-900 dark:text-surface-100">
                      SPF Record
                    </h3>
                    <Badge variant="success">Required</Badge>
                  </div>
                  <p className="text-sm text-surface-500 mt-1">
                    Sender Policy Framework - Prevents email spoofing
                  </p>
                  <div className="mt-3 space-y-2">
                    <div>
                      <span className="text-xs text-surface-400">Type</span>
                      <p className="font-mono text-sm">{dnsRecords.spf.type}</p>
                    </div>
                    <div>
                      <span className="text-xs text-surface-400">Name</span>
                      <p className="font-mono text-sm">{dnsRecords.spf.name}</p>
                    </div>
                    <div>
                      <span className="text-xs text-surface-400">Value</span>
                      <div className="flex items-start gap-2">
                        <code className="flex-1 p-2 text-xs bg-surface-100 dark:bg-surface-800 rounded font-mono break-all">
                          {dnsRecords.spf.value}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(dnsRecords.spf.value, 'spf')}
                        >
                          {copied === 'spf' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DKIM Record */}
      {dnsRecords?.dkim ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-surface-900 dark:text-surface-100">
                      DKIM Record
                    </h3>
                    <Badge variant="info">Recommended</Badge>
                  </div>
                  <p className="text-sm text-surface-500 mt-1">
                    DomainKeys Identified Mail - Cryptographically signs outgoing emails
                  </p>
                  <div className="mt-3 space-y-2">
                    <div>
                      <span className="text-xs text-surface-400">Type</span>
                      <p className="font-mono text-sm">{dnsRecords.dkim.type}</p>
                    </div>
                    <div>
                      <span className="text-xs text-surface-400">Name</span>
                      <p className="font-mono text-sm">{dnsRecords.dkim.name}</p>
                    </div>
                    <div>
                      <span className="text-xs text-surface-400">Value</span>
                      <div className="flex items-start gap-2">
                        <code className="flex-1 p-2 text-xs bg-surface-100 dark:bg-surface-800 rounded font-mono break-all max-h-24 overflow-y-auto">
                          {dnsRecords.dkim.value}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(dnsRecords.dkim!.value, 'dkim')}
                        >
                          {copied === 'dkim' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : mailDomain.dkimEnabled ? (
        <Alert variant="warning">
          DKIM is enabled but the keys have not been generated yet.
        </Alert>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-surface-100 dark:bg-surface-800">
                <Shield className="w-5 h-5 text-surface-400" />
              </div>
              <div>
                <h3 className="font-medium text-surface-900 dark:text-surface-100">
                  DKIM Record
                </h3>
                <p className="text-sm text-surface-500">
                  DKIM is not enabled for this domain. Enable it in settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DMARC Record */}
      {dnsRecords?.dmarc && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-surface-900 dark:text-surface-100">
                      DMARC Record
                    </h3>
                    <Badge variant="default">Recommended</Badge>
                  </div>
                  <p className="text-sm text-surface-500 mt-1">
                    Domain-based Message Authentication - Policy for handling unauthenticated mail
                  </p>
                  <div className="mt-3 space-y-2">
                    <div>
                      <span className="text-xs text-surface-400">Type</span>
                      <p className="font-mono text-sm">{dnsRecords.dmarc.type}</p>
                    </div>
                    <div>
                      <span className="text-xs text-surface-400">Name</span>
                      <p className="font-mono text-sm">{dnsRecords.dmarc.name}</p>
                    </div>
                    <div>
                      <span className="text-xs text-surface-400">Value</span>
                      <div className="flex items-start gap-2">
                        <code className="flex-1 p-2 text-xs bg-surface-100 dark:bg-surface-800 rounded font-mono break-all">
                          {dnsRecords.dmarc.value}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(dnsRecords.dmarc.value, 'dmarc')}
                        >
                          {copied === 'dmarc' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
