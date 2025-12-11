import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NotificationToast } from '@/components/common/NotificationToast';

export function MainLayout() {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      <NotificationToast />
    </div>
  );
}
