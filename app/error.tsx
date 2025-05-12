'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/sentry';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    captureError(error, {
      digest: error.digest,
      component: 'ErrorBoundary'
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Something went wrong!
        </h2>
        <p className="text-gray-600 mb-6">
          We apologize for the inconvenience. Please try again or contact support if the problem persists.
        </p>
        <div className="flex space-x-4">
          <button
            onClick={reset}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-center"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
} 