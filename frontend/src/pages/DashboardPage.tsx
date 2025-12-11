import { Server, Globe, Database, Mail, HardDrive, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: typeof Server;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-surface-900 dark:text-surface-100 mt-1">
              {value}
            </p>
            {trend && (
              <p
                className={`text-sm mt-1 ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}% from last month
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-surface-600 dark:text-surface-400 mt-1">
          Here's what's happening with your servers today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Domains"
          value={0}
          icon={Globe}
        />
        <StatCard
          title="Databases"
          value={0}
          icon={Database}
        />
        <StatCard
          title="Email Accounts"
          value={0}
          icon={Mail}
        />
        <StatCard
          title="Backups"
          value={0}
          icon={HardDrive}
        />
        <StatCard
          title="Active Services"
          value={0}
          icon={Server}
        />
        <StatCard
          title="System Load"
          value="--"
          icon={Activity}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors text-center">
              <Globe className="w-6 h-6 mx-auto text-primary-600 dark:text-primary-400" />
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100 mt-2">
                Add Domain
              </p>
            </button>
            <button className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors text-center">
              <Database className="w-6 h-6 mx-auto text-primary-600 dark:text-primary-400" />
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100 mt-2">
                Create Database
              </p>
            </button>
            <button className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors text-center">
              <Mail className="w-6 h-6 mx-auto text-primary-600 dark:text-primary-400" />
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100 mt-2">
                Add Email
              </p>
            </button>
            <button className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors text-center">
              <HardDrive className="w-6 h-6 mx-auto text-primary-600 dark:text-primary-400" />
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100 mt-2">
                New Backup
              </p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
