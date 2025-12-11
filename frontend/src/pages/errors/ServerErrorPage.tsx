import { Link } from 'react-router-dom';
import { ServerCrash, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ServerErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-full">
            <ServerCrash className="w-16 h-16 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">500</h1>
        <h2 className="text-xl font-medium text-gray-900 dark:text-white mt-2">Server Error</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto">
          Something went wrong on our end. Please try again later or contact support if the
          problem persists.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Button variant="ghost" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
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

export default ServerErrorPage;
