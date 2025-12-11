import { Card, CardContent } from '@/components/ui';
import type { Database } from '@/types';

interface DatabaseInfoTabProps {
  database: Database;
}

export function DatabaseInfoTab({ database }: DatabaseInfoTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">
            Database Information
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <InfoRow label="Database Name" value={database.name} />
              <InfoRow label="Type" value={database.type} />
              <InfoRow label="Status" value={database.status} />
              <InfoRow label="Character Set" value={database.charset} />
              <InfoRow label="Collation" value={database.collation} />
            </div>
            <div className="space-y-4">
              <InfoRow
                label="Created"
                value={new Date(database.createdAt).toLocaleString()}
              />
              <InfoRow
                label="Last Updated"
                value={new Date(database.updatedAt).toLocaleString()}
              />
              <InfoRow
                label="Last Backup"
                value={
                  database.lastBackupAt
                    ? new Date(database.lastBackupAt).toLocaleString()
                    : 'Never'
                }
              />
              {database.domain && (
                <InfoRow label="Associated Domain" value={database.domain.name} />
              )}
              {database.description && (
                <InfoRow label="Description" value={database.description} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">
            Connection Details
          </h3>
          <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 font-mono text-sm">
            <div className="space-y-2">
              <div className="flex">
                <span className="text-surface-500 w-32">Host:</span>
                <span className="text-surface-900 dark:text-surface-100">localhost</span>
              </div>
              <div className="flex">
                <span className="text-surface-500 w-32">Port:</span>
                <span className="text-surface-900 dark:text-surface-100">
                  {database.type === 'MYSQL' ? '3306' : '3306'}
                </span>
              </div>
              <div className="flex">
                <span className="text-surface-500 w-32">Database:</span>
                <span className="text-surface-900 dark:text-surface-100">{database.name}</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-surface-500">
            Use these connection details along with a database user to connect to your database
            from your application.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-surface-500 dark:text-surface-400">{label}</span>
      <span className="text-surface-900 dark:text-surface-100 font-medium">{value}</span>
    </div>
  );
}
