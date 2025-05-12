'use client';

import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Patient Archive Error:', error);
  }, [error]);

  const runArchiveFix = async () => {
    try {
      const response = await fetch('/api/db-fix/patients-archive');
      const data = await response.json();
      console.log('Fix result:', data);
      reset();
    } catch (e) {
      console.error('Error running fix:', e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Patient Archive</h1>
        </div>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center mb-6">
        <h2 className="text-xl font-semibold text-red-800 mb-4">Error Loading Patient Archive</h2>
        <p className="text-red-700 mb-6">{error.message || 'An error occurred while loading the patient archive.'}</p>
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={reset}
            variant="outline"
          >
            Try Again
          </Button>
          <Button 
            onClick={runArchiveFix}
            variant="default"
          >
            Run Archive Fix
          </Button>
        </div>
      </div>
    </div>
  );
} 