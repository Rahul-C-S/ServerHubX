import { useState } from 'react';
import { Bell, User, Shield, Palette } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { NotificationsTab } from './NotificationsTab';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('notifications');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
          Settings
        </h1>
        <p className="text-surface-600 dark:text-surface-400 mt-1">
          Manage your account and notification preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="w-4 h-4 mr-2" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-6">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <div className="text-center py-12 text-surface-500">
            Profile settings coming soon
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="text-center py-12 text-surface-500">
            Security settings coming soon
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <div className="text-center py-12 text-surface-500">
            Appearance settings coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
