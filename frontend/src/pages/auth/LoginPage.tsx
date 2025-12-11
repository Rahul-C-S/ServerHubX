import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Server, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Card, CardContent, Alert } from '@/components/ui';
import { useLogin } from '@/hooks/useAuth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { mutate: login, isPending, error } = useLogin();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-100 dark:bg-surface-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white mb-4">
            <Server className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            ServerHubX
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Server Management Dashboard
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 mb-6">
              Sign in to your account
            </h2>

            {error && (
              <Alert variant="error" className="mb-4">
                Invalid email or password
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-5 h-5" />}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                }
                required
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-surface-600 dark:text-surface-400">
                    Remember me
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isPending}
              >
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-surface-500 dark:text-surface-400 mt-6">
          &copy; {new Date().getFullYear()} ServerHubX. All rights reserved.
        </p>
      </div>
    </div>
  );
}
