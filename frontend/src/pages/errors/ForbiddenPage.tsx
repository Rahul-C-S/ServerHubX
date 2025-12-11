import { Link } from 'react-router-dom';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
            <ShieldX className="w-16 h-16 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">403</h1>
        <h2 className="text-xl font-medium text-gray-900 dark:text-white mt-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto">
          You don't have permission to access this resource. Contact your administrator if you
          believe this is an error.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Link to="/">
            <Button>
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForbiddenPage;
