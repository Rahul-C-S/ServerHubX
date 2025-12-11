import { useState } from 'react';
import { Terminal, Shield, Key, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import {
  useSSHConfig,
  useSSHSecuritySettings,
  useChangeSSHPort,
  useUpdateSSHSecurity,
  useSSHConnectionInfo,
} from '@/hooks/useSsh';

export function SshSecurityPage() {
  const { data: sshConfig, isLoading: configLoading } = useSSHConfig();
  const { data: securitySettings, isLoading: settingsLoading } = useSSHSecuritySettings();
  const { data: connectionInfo } = useSSHConnectionInfo();
  const changeSSHPort = useChangeSSHPort();
  const updateSecurity = useUpdateSSHSecurity();

  const [newPort, setNewPort] = useState('');
  const [showPortWarning, setShowPortWarning] = useState(false);
  const [securityForm, setSecurityForm] = useState<{
    permitRootLogin: 'yes' | 'no' | 'prohibit-password';
    passwordAuthentication: boolean;
    pubkeyAuthentication: boolean;
    maxAuthTries: number;
    loginGraceTime: number;
  }>({
    permitRootLogin: 'prohibit-password',
    passwordAuthentication: true,
    pubkeyAuthentication: true,
    maxAuthTries: 3,
    loginGraceTime: 60,
  });

  // Update form when settings load
  if (securitySettings && securityForm.permitRootLogin === 'prohibit-password' && !securitySettings.permitRootLogin) {
    // Already initialized
  } else if (securitySettings) {
    const newPermitRootLogin = securitySettings.permitRootLogin || 'prohibit-password';
    if (securityForm.permitRootLogin !== newPermitRootLogin) {
      setSecurityForm({
        permitRootLogin: newPermitRootLogin as 'yes' | 'no' | 'prohibit-password',
        passwordAuthentication: securitySettings.passwordAuthentication ?? true,
        pubkeyAuthentication: securitySettings.pubkeyAuthentication ?? true,
        maxAuthTries: securitySettings.maxAuthTries || 3,
        loginGraceTime: securitySettings.loginGraceTime || 60,
      });
    }
  }

  const handlePortChange = async () => {
    const port = parseInt(newPort, 10);
    if (port < 1024 || port > 65535) {
      alert('Port must be between 1024 and 65535');
      return;
    }

    if (!showPortWarning) {
      setShowPortWarning(true);
      return;
    }

    try {
      await changeSSHPort.mutateAsync({ port });
      setNewPort('');
      setShowPortWarning(false);
      alert(`SSH port changed to ${port}. Update your SSH client configuration!`);
    } catch (error) {
      console.error('Failed to change SSH port:', error);
    }
  };

  const handleSecurityUpdate = async () => {
    try {
      await updateSecurity.mutateAsync(securityForm);
      alert('SSH security settings updated successfully');
    } catch (error) {
      console.error('Failed to update security settings:', error);
    }
  };

  const isLoading = configLoading || settingsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SSH Security</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage SSH port and security settings
          </p>
        </div>
      </div>

      {/* Connection Info */}
      {connectionInfo && (
        <Alert variant="info">
          <Terminal className="w-4 h-4" />
          <div>
            <strong>SSH Connection Command:</strong>
            <code className="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              {connectionInfo.command}
            </code>
          </div>
        </Alert>
      )}

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Terminal className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Current Port</div>
                <div className="text-xl font-bold">
                  {isLoading ? '...' : sshConfig?.port || 22}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Key className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Public Key Auth</div>
                <Badge variant={securitySettings?.pubkeyAuthentication ? 'success' : 'danger'}>
                  {securitySettings?.pubkeyAuthentication ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Shield className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Root Login</div>
                <Badge
                  variant={
                    securitySettings?.permitRootLogin === 'no'
                      ? 'success'
                      : securitySettings?.permitRootLogin === 'prohibit-password'
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {securitySettings?.permitRootLogin || 'prohibit-password'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change SSH Port */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Change SSH Port
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showPortWarning && (
            <Alert variant="warning">
              <AlertTriangle className="w-4 h-4" />
              <div>
                <strong>Warning:</strong> Changing the SSH port will disconnect your current
                session. Make sure you have another way to access the server before proceeding.
                <br />
                <strong>New connection command will be:</strong>{' '}
                <code>ssh -p {newPort} user@server</code>
              </div>
            </Alert>
          )}

          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Input
                type="number"
                label="New Port"
                value={newPort}
                onChange={(e) => setNewPort(e.target.value)}
                placeholder="e.g., 8130"
                min={1024}
                max={65535}
              />
            </div>
            <Button
              variant={showPortWarning ? 'danger' : 'primary'}
              onClick={handlePortChange}
              disabled={!newPort || changeSSHPort.isPending}
            >
              {changeSSHPort.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {showPortWarning ? 'Confirm Port Change' : 'Change Port'}
            </Button>
            {showPortWarning && (
              <Button variant="ghost" onClick={() => setShowPortWarning(false)}>
                Cancel
              </Button>
            )}
          </div>

          <p className="text-sm text-gray-500">
            Current port: <strong>{sshConfig?.port || 22}</strong>. Valid range: 1024-65535.
            The firewall will be automatically updated.
          </p>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Root Login */}
          <div>
            <label className="block text-sm font-medium mb-2">Root Login</label>
            <select
              value={securityForm.permitRootLogin}
              onChange={(e) =>
                setSecurityForm((prev) => ({ ...prev, permitRootLogin: e.target.value as 'yes' | 'no' | 'prohibit-password' }))
              }
              className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="no">No (Most Secure)</option>
              <option value="prohibit-password">Public Key Only (Recommended)</option>
              <option value="yes">Yes (Not Recommended)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Controls whether root can login via SSH
            </p>
          </div>

          {/* Password Authentication */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={securityForm.passwordAuthentication}
                onChange={(e) =>
                  setSecurityForm((prev) => ({
                    ...prev,
                    passwordAuthentication: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="font-medium">Password Authentication</span>
            </label>
            <p className="text-sm text-gray-500 ml-6">
              Allow users to login with passwords. Disable for key-only access.
            </p>
          </div>

          {/* Public Key Authentication */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={securityForm.pubkeyAuthentication}
                onChange={(e) =>
                  setSecurityForm((prev) => ({
                    ...prev,
                    pubkeyAuthentication: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="font-medium">Public Key Authentication</span>
            </label>
            <p className="text-sm text-gray-500 ml-6">
              Allow users to login with SSH keys. Recommended to keep enabled.
            </p>
          </div>

          {/* Max Auth Tries */}
          <div>
            <label className="block text-sm font-medium mb-2">Max Authentication Attempts</label>
            <Input
              type="number"
              value={securityForm.maxAuthTries}
              onChange={(e) =>
                setSecurityForm((prev) => ({
                  ...prev,
                  maxAuthTries: parseInt(e.target.value, 10) || 3,
                }))
              }
              min={1}
              max={10}
              className="max-w-xs"
            />
            <p className="text-sm text-gray-500 mt-1">
              Number of failed attempts before disconnection (recommended: 3)
            </p>
          </div>

          {/* Login Grace Time */}
          <div>
            <label className="block text-sm font-medium mb-2">Login Grace Time (seconds)</label>
            <Input
              type="number"
              value={securityForm.loginGraceTime}
              onChange={(e) =>
                setSecurityForm((prev) => ({
                  ...prev,
                  loginGraceTime: parseInt(e.target.value, 10) || 60,
                }))
              }
              min={10}
              max={300}
              className="max-w-xs"
            />
            <p className="text-sm text-gray-500 mt-1">
              Time allowed to complete authentication (recommended: 60)
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={handleSecurityUpdate} disabled={updateSecurity.isPending}>
              {updateSecurity.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Security Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SshSecurityPage;
