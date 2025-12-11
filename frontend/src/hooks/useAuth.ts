import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import type { LoginCredentials } from '@/types';

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const addNotification = useUIStore((state) => state.addNotification);

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      addNotification({
        type: 'success',
        title: 'Welcome back!',
        message: `Logged in as ${data.user.email}`,
      });
      navigate('/dashboard');
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Login failed',
        message: getErrorMessage(error),
      });
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const addNotification = useUIStore((state) => state.addNotification);

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout();
      addNotification({
        type: 'info',
        title: 'Logged out',
        message: 'You have been logged out successfully',
      });
      navigate('/login');
    },
    onError: () => {
      // Even if the API call fails, log out locally
      logout();
      navigate('/login');
    },
  });
}

export function useForgotPassword() {
  const addNotification = useUIStore((state) => state.addNotification);

  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Email sent',
        message: 'If an account exists with this email, you will receive a password reset link',
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: getErrorMessage(error),
      });
    },
  });
}

export function useResetPassword() {
  const navigate = useNavigate();
  const addNotification = useUIStore((state) => state.addNotification);

  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      authApi.resetPassword(token, newPassword),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Password reset',
        message: 'Your password has been reset successfully. Please log in.',
      });
      navigate('/login');
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: getErrorMessage(error),
      });
    },
  });
}
