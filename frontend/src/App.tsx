import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { MainLayout } from '@/layouts';
import { ProtectedRoute } from '@/components/common';
import { LoginPage, ForgotPasswordPage, DashboardPage, DomainsPage, DomainDetailPage, UsersPage, AppsPage, AppDetailPage } from '@/pages';

function AppContent() {
  const { theme, setTheme } = useUIStore();
  const setLoading = useAuthStore((state) => state.setLoading);

  // Initialize theme on mount
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  // Initialize auth state
  useEffect(() => {
    setLoading(false);
  }, [setLoading]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/domains" element={<DomainsPage />} />
        <Route path="/domains/:id" element={<DomainDetailPage />} />
        <Route path="/apps" element={<AppsPage />} />
        <Route path="/apps/:id" element={<AppDetailPage />} />
        <Route path="/databases" element={<PlaceholderPage title="Databases" />} />
        <Route path="/email" element={<PlaceholderPage title="Email" />} />
        <Route path="/ssl" element={<PlaceholderPage title="SSL Certificates" />} />
        <Route path="/backups" element={<PlaceholderPage title="Backups" />} />
        <Route path="/terminal" element={<PlaceholderPage title="Terminal" />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
          {title}
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mt-2">
          This page will be implemented in Phase 2
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
