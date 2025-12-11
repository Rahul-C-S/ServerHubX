import { useState } from 'react';
import { Server, Cpu, HardDrive, Activity, RefreshCw, Play, Square } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useSystemInfo,
  useInstalledVersions,
  useServices,
  useStartService,
  useStopService,
  useRestartService,
  usePackageUpdates,
} from '@/hooks/useSystem';
import type { ServiceStatus } from '@/types/system';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function SystemInfoPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'updates'>('overview');

  const { data: systemInfo, isLoading: infoLoading } = useSystemInfo();
  const { data: versions } = useInstalledVersions();
  const { data: services, isLoading: servicesLoading } = useServices();
  const { data: updates, isLoading: updatesLoading } = usePackageUpdates();

  const startService = useStartService();
  const stopService = useStopService();
  const restartService = useRestartService();

  const handleServiceAction = (service: ServiceStatus, action: 'start' | 'stop' | 'restart') => {
    if (action === 'start') {
      startService.mutate(service.name);
    } else if (action === 'stop') {
      if (confirm(`Stop ${service.displayName}?`)) {
        stopService.mutate(service.name);
      }
    } else {
      if (confirm(`Restart ${service.displayName}?`)) {
        restartService.mutate(service.name);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Server className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Information</h1>
          <p className="text-gray-500">Monitor system resources and manage services</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(['overview', 'services', 'updates'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'services' && 'Services'}
              {tab === 'updates' && `Updates ${updates?.count ? `(${updates.count})` : ''}`}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {infoLoading ? (
            <div>Loading system information...</div>
          ) : (
            <>
              {/* Resource Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Cpu className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">CPU Load</p>
                        <p className="text-2xl font-bold">
                          {systemInfo?.load.load1.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {systemInfo?.load.load5.toFixed(2)} / {systemInfo?.load.load15.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Activity className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Memory</p>
                        <p className="text-2xl font-bold">
                          {systemInfo?.memory.usedPercent.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatBytes(systemInfo?.memory.used || 0)} / {formatBytes(systemInfo?.memory.total || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <HardDrive className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Disk</p>
                        <p className="text-2xl font-bold">
                          {systemInfo?.disk?.usedPercent.toFixed(1) || 0}%
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatBytes(systemInfo?.disk?.used || 0)} / {formatBytes(systemInfo?.disk?.total || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <Server className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Uptime</p>
                        <p className="text-2xl font-bold">{systemInfo?.uptime.formatted}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* System Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Operating System</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Distribution</dt>
                        <dd className="font-medium">{systemInfo?.os.distro} {systemInfo?.os.distroVersion}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Kernel</dt>
                        <dd className="font-medium">{systemInfo?.os.kernel}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Architecture</dt>
                        <dd className="font-medium">{systemInfo?.os.arch}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Hostname</dt>
                        <dd className="font-medium">{systemInfo?.os.hostname}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Installed Versions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">PHP</h4>
                        <div className="flex flex-wrap gap-2">
                          {versions?.php.map((v) => (
                            <Badge key={v.version} variant={v.default ? 'primary' : 'default'}>
                              {v.version} {v.default && '(default)'}
                            </Badge>
                          ))}
                          {(!versions?.php || versions.php.length === 0) && (
                            <span className="text-gray-400">Not installed</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Node.js</h4>
                        <div className="flex flex-wrap gap-2">
                          {versions?.node.map((v) => (
                            <Badge key={v.version} variant={v.default ? 'primary' : 'default'}>
                              {v.version} {v.default && '(default)'}
                            </Badge>
                          ))}
                          {(!versions?.node || versions.node.length === 0) && (
                            <span className="text-gray-400">Not installed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <Card>
          <CardHeader>
            <CardTitle>System Services</CardTitle>
          </CardHeader>
          <CardContent>
            {servicesLoading ? (
              <div>Loading services...</div>
            ) : (
              <div className="divide-y">
                {services?.map((service) => (
                  <div key={service.name} className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        service.status === 'running' ? 'bg-green-500' :
                        service.status === 'stopped' ? 'bg-gray-400' :
                        service.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="font-medium">{service.displayName}</p>
                        <p className="text-sm text-gray-500">{service.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={
                        service.status === 'running' ? 'success' :
                        service.status === 'stopped' ? 'default' :
                        service.status === 'failed' ? 'danger' : 'warning'
                      }>
                        {service.status}
                      </Badge>
                      <Badge variant={service.enabled ? 'primary' : 'default'}>
                        {service.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <div className="flex gap-1">
                        {service.status !== 'running' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleServiceAction(service, 'start')}
                            disabled={startService.isPending}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {service.status === 'running' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleServiceAction(service, 'stop')}
                              disabled={stopService.isPending}
                            >
                              <Square className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleServiceAction(service, 'restart')}
                              disabled={restartService.isPending}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Updates Tab */}
      {activeTab === 'updates' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Available Updates</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {updates?.count || 0} updates available ({updates?.securityCount || 0} security)
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {updatesLoading ? (
              <div>Loading updates...</div>
            ) : (
              <div className="divide-y">
                {updates?.updates.length === 0 ? (
                  <p className="text-gray-500 py-4">System is up to date</p>
                ) : (
                  updates?.updates.map((pkg) => (
                    <div key={pkg.name} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{pkg.name}</p>
                        <p className="text-sm text-gray-500">
                          {pkg.currentVersion} -&gt; {pkg.availableVersion}
                        </p>
                      </div>
                      <Badge variant={pkg.type === 'security' ? 'danger' : 'default'}>
                        {pkg.type}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
