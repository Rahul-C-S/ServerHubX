import { useState } from 'react';
import { Shield, Play, Pause, RefreshCw, Plus, Trash2, Clock, Ban, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useFirewallStatus,
  useAllowedPorts,
  useIPLists,
  useAllowPort,
  useDenyPort,
  useAllowIp,
  useBlockIp,
  useTempBlockIp,
  useUnblockIp,
  useRestartFirewall,
  useReloadFirewall,
  useEnableFirewall,
  useDisableFirewall,
} from '@/hooks/useFirewall';
import { FirewallProtocol, FirewallDirection } from '@/types/system';
import { AddPortModal } from './AddPortModal';
import { AddIpModal } from './AddIpModal';

export function FirewallPage() {
  const [activeTab, setActiveTab] = useState<'ports' | 'ips' | 'temp-blocks'>('ports');
  const [showAddPortModal, setShowAddPortModal] = useState(false);
  const [showAddIpModal, setShowAddIpModal] = useState(false);
  const [ipModalType, setIpModalType] = useState<'allow' | 'block' | 'temp-block'>('allow');

  const { data: status, isLoading: statusLoading } = useFirewallStatus();
  const { data: ports, isLoading: portsLoading } = useAllowedPorts();
  const { data: ipLists, isLoading: ipListsLoading } = useIPLists();

  const restartFirewall = useRestartFirewall();
  const reloadFirewall = useReloadFirewall();
  const enableFirewall = useEnableFirewall();
  const disableFirewall = useDisableFirewall();
  const allowPort = useAllowPort();
  const denyPort = useDenyPort();
  const allowIp = useAllowIp();
  const blockIp = useBlockIp();
  const tempBlockIp = useTempBlockIp();
  const unblockIp = useUnblockIp();

  const handleEnableDisable = () => {
    if (status?.csf.isRunning) {
      disableFirewall.mutate();
    } else {
      enableFirewall.mutate();
    }
  };

  const handleAddPort = (data: { port: number; protocol: FirewallProtocol; direction: FirewallDirection; comment?: string }) => {
    allowPort.mutate(data, {
      onSuccess: () => setShowAddPortModal(false),
    });
  };

  const handleRemovePort = (port: number, protocol?: FirewallProtocol) => {
    if (confirm(`Remove port ${port}?`)) {
      denyPort.mutate({ port, protocol });
    }
  };

  const handleAddIp = (data: { ip: string; comment?: string; ttlSeconds?: number }) => {
    if (ipModalType === 'allow') {
      allowIp.mutate({ ip: data.ip, comment: data.comment }, {
        onSuccess: () => setShowAddIpModal(false),
      });
    } else if (ipModalType === 'block') {
      blockIp.mutate({ ip: data.ip, comment: data.comment }, {
        onSuccess: () => setShowAddIpModal(false),
      });
    } else {
      tempBlockIp.mutate({ ip: data.ip, comment: data.comment, ttlSeconds: data.ttlSeconds || 3600 }, {
        onSuccess: () => setShowAddIpModal(false),
      });
    }
  };

  const handleRemoveIp = (ip: string) => {
    if (confirm(`Remove IP ${ip} from all lists?`)) {
      unblockIp.mutate(ip);
    }
  };

  const openIpModal = (type: 'allow' | 'block' | 'temp-block') => {
    setIpModalType(type);
    setShowAddIpModal(true);
  };

  if (statusLoading) {
    return <div className="p-6">Loading firewall status...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CSF Firewall</h1>
            <p className="text-gray-500">Configure firewall rules and IP blocking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reloadFirewall.mutate()}
            disabled={reloadFirewall.isPending || !status?.isInstalled}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => restartFirewall.mutate()}
            disabled={restartFirewall.isPending || !status?.isInstalled}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Restart
          </Button>
          <Button
            variant={status?.csf.isRunning ? 'danger' : 'primary'}
            size="sm"
            onClick={handleEnableDisable}
            disabled={enableFirewall.isPending || disableFirewall.isPending || !status?.isInstalled}
          >
            {status?.csf.isRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Disable
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Enable
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-lg font-semibold">
                  {status?.csf.isRunning ? 'Active' : 'Inactive'}
                </p>
              </div>
              <Badge variant={status?.csf.isRunning ? 'success' : 'danger'}>
                {status?.csf.isRunning ? 'Running' : 'Stopped'}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Version</p>
                <p className="text-lg font-semibold">{status?.version || 'Not Installed'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Testing Mode</p>
                <p className="text-lg font-semibold">{status?.csf.testingMode ? 'Enabled' : 'Disabled'}</p>
              </div>
              <Badge variant={status?.csf.testingMode ? 'warning' : 'default'}>
                {status?.csf.testingMode ? 'Testing' : 'Production'}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">LFD</p>
                <p className="text-lg font-semibold">{status?.lfd.isRunning ? 'Active' : 'Inactive'}</p>
              </div>
              <Badge variant={status?.lfd.isRunning ? 'success' : 'danger'}>
                {status?.lfd.isRunning ? 'Running' : 'Stopped'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(['ports', 'ips', 'temp-blocks'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'ports' && 'Allowed Ports'}
              {tab === 'ips' && 'IP Lists'}
              {tab === 'temp-blocks' && 'Temp Blocks'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'ports' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Allowed Ports</CardTitle>
            <Button size="sm" onClick={() => setShowAddPortModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Port
            </Button>
          </CardHeader>
          <CardContent>
            {portsLoading ? (
              <div>Loading ports...</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">TCP Inbound</h4>
                  <div className="flex flex-wrap gap-2">
                    {ports?.tcpIn.map((port) => (
                      <Badge key={`tcp-in-${port}`} variant="default" className="cursor-pointer group">
                        {port}
                        <button
                          onClick={() => handleRemovePort(port, FirewallProtocol.TCP)}
                          className="ml-1 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">TCP Outbound</h4>
                  <div className="flex flex-wrap gap-2">
                    {ports?.tcpOut.map((port) => (
                      <Badge key={`tcp-out-${port}`} variant="default">
                        {port}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">UDP Inbound</h4>
                  <div className="flex flex-wrap gap-2">
                    {ports?.udpIn.map((port) => (
                      <Badge key={`udp-in-${port}`} variant="info">
                        {port}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">UDP Outbound</h4>
                  <div className="flex flex-wrap gap-2">
                    {ports?.udpOut.map((port) => (
                      <Badge key={`udp-out-${port}`} variant="info">
                        {port}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'ips' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Allowed IPs
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => openIpModal('allow')}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {ipListsLoading ? (
                <div>Loading...</div>
              ) : (
                <div className="space-y-2">
                  {ipLists?.allowed.length === 0 ? (
                    <p className="text-gray-500 text-sm">No allowed IPs</p>
                  ) : (
                    ipLists?.allowed.map((entry) => (
                      <div key={entry.ip} className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <div>
                          <span className="font-mono">{entry.ip}</span>
                          {entry.comment && (
                            <span className="text-gray-500 text-sm ml-2">({entry.comment})</span>
                          )}
                        </div>
                        <button onClick={() => handleRemoveIp(entry.ip)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" />
                Blocked IPs
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => openIpModal('block')}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {ipListsLoading ? (
                <div>Loading...</div>
              ) : (
                <div className="space-y-2">
                  {ipLists?.blocked.length === 0 ? (
                    <p className="text-gray-500 text-sm">No blocked IPs</p>
                  ) : (
                    ipLists?.blocked.map((entry) => (
                      <div key={entry.ip} className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <div>
                          <span className="font-mono">{entry.ip}</span>
                          {entry.comment && (
                            <span className="text-gray-500 text-sm ml-2">({entry.comment})</span>
                          )}
                        </div>
                        <button onClick={() => handleRemoveIp(entry.ip)} className="text-green-600 hover:text-green-800">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'temp-blocks' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Temporary Blocks
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => openIpModal('temp-block')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Temp Block
            </Button>
          </CardHeader>
          <CardContent>
            {ipListsLoading ? (
              <div>Loading...</div>
            ) : (
              <div className="space-y-2">
                {ipLists?.tempBlocks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No temporary blocks</p>
                ) : (
                  ipLists?.tempBlocks.map((entry) => (
                    <div key={entry.ip} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <div>
                        <span className="font-mono">{entry.ip}</span>
                        {entry.expiresAt && (
                          <span className="text-gray-500 text-sm ml-2">
                            Expires: {new Date(entry.expiresAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleRemoveIp(entry.ip)} className="text-green-600 hover:text-green-800">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showAddPortModal && (
        <AddPortModal
          onClose={() => setShowAddPortModal(false)}
          onSubmit={handleAddPort}
          isLoading={allowPort.isPending}
        />
      )}

      {showAddIpModal && (
        <AddIpModal
          type={ipModalType}
          onClose={() => setShowAddIpModal(false)}
          onSubmit={handleAddIp}
          isLoading={allowIp.isPending || blockIp.isPending || tempBlockIp.isPending}
        />
      )}
    </div>
  );
}
