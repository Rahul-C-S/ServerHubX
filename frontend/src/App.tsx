import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { MainLayout } from '@/layouts';
import { ProtectedRoute } from '@/components/common';
import {
  LoginPage,
  ForgotPasswordPage,
  DashboardPage,
  DomainsPage,
  DomainDetailPage,
  UsersPage,
  AppsPage,
  AppDetailPage,
  DatabasesPage,
  DatabaseDetailPage,
  DnsPage,
  DnsZoneDetailPage,
  MailPage,
  MailDomainDetailPage,
  TerminalPage,
  FilesPage,
  BackupsPage,
  MonitoringPage,
  SettingsPage,
  CronPage,
} from '@/pages';

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
        <Route path="/databases" element={<DatabasesPage />} />
        <Route path="/databases/:id" element={<DatabaseDetailPage />} />
        <Route path="/dns" element={<DnsPage />} />
        <Route path="/dns/:id" element={<DnsZoneDetailPage />} />
        <Route path="/mail" element={<MailPage />} />
        <Route path="/mail/:id" element={<MailDomainDetailPage />} />
        <Route path="/backups" element={<BackupsPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/cron" element={<CronPage />} />
        <Route path="/terminal" element={<TerminalPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
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
