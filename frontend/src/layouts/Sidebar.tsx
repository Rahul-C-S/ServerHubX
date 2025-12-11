import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Globe,
  Box,
  Database,
  Mail,
  Shield,
  HardDrive,
  Terminal,
  Settings,
  Users,
  Server,
  ChevronLeft,
  ChevronRight,
  Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Globe, label: 'Domains', href: '/domains' },
  { icon: Box, label: 'Applications', href: '/apps' },
  { icon: Database, label: 'Databases', href: '/databases' },
  { icon: Network, label: 'DNS', href: '/dns' },
  { icon: Mail, label: 'Email', href: '/email' },
  { icon: Shield, label: 'SSL Certificates', href: '/ssl' },
  { icon: HardDrive, label: 'Backups', href: '/backups' },
  { icon: Terminal, label: 'Terminal', href: '/terminal' },
  { icon: Users, label: 'Users', href: '/users', roles: ['ROOT_ADMIN', 'RESELLER'] },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const user = useAuthStore((state) => state.user);

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700 z-40 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center flex-shrink-0">
            <Server className="w-5 h-5" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-semibold text-surface-900 dark:text-surface-100">
              ServerHubX
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                'hover:bg-surface-100 dark:hover:bg-surface-800',
                isActive
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-surface-600 dark:text-surface-400'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute bottom-4 right-0 translate-x-1/2 w-6 h-6 rounded-full',
          'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700',
          'flex items-center justify-center',
          'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300',
          'shadow-sm transition-colors'
        )}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
