import { Menu, Moon, Sun, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useLogout } from '@/hooks/useAuth';

export function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const { theme, setTheme, toggleSidebar } = useUIStore();
  const { mutate: logout } = useLogout();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="h-16 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between px-4">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 lg:hidden"
      >
        <Menu className="w-5 h-5 text-surface-600 dark:text-surface-400" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                {user?.role.replace('_', ' ')}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-surface-400" />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-50">
              <div className="px-4 py-2 border-b border-surface-200 dark:border-surface-700">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={() => logout()}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-2 text-sm',
                  'text-red-600 dark:text-red-400 hover:bg-surface-100 dark:hover:bg-surface-700'
                )}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
