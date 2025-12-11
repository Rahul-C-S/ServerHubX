import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Server, Mail, ArrowLeft } from 'lucide-react';
import { Button, Input, Card, CardContent, Alert } from '@/components/ui';
import { useForgotPassword } from '@/hooks/useAuth';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { mutate: forgotPassword, isPending } = useForgotPassword();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    forgotPassword(email, {
      onSuccess: () => setSubmitted(true),
    });
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
        </div>

        <Card>
          <CardContent className="p-6">
            {submitted ? (
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 mb-2">
                  Check your email
                </h2>
                <p className="text-surface-600 dark:text-surface-400 mb-6">
                  If an account exists for {email}, you will receive a password reset link.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 mb-2">
                  Reset your password
                </h2>
                <p className="text-surface-600 dark:text-surface-400 mb-6">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

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

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    isLoading={isPending}
                  >
                    Send reset link
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
