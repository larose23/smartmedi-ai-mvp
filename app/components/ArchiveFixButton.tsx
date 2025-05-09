'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { Loader2, RefreshCw } from "lucide-react";

export default function ArchiveFixButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<null | {
    success: boolean;
    messages: string[];
    errors: string[];
    timestamp: string;
  }>(null);

  const runMigrations = async () => {
    try {
      setIsLoading(true);
      const loadingToast = toast.loading("Running archive system migrations...");

      const response = await fetch('/api/run-migrations');
      const data = await response.json();

      setResults(data);
      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(`Archive system rebuilt successfully! (${data.messages.length} operations completed)`);
      } else {
        toast.error(`Migration completed with ${data.errors.length} errors`);
      }

      // Force a page refresh
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error("Error running migrations:", error);
      toast.error("Failed to run migrations");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <Button
        variant="outline"
        onClick={runMigrations}
        disabled={isLoading}
        className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Rebuild Archive System
      </Button>

      {results && (
        <div className="mt-2 p-3 border rounded text-sm">
          <div className="font-medium mb-1">
            Migration Results ({results.success ? "Success" : "With Errors"})
          </div>
          
          {results.messages.length > 0 && (
            <div className="text-green-600 mb-2">
              <div className="font-medium">Successful Operations:</div>
              <ul className="list-disc pl-5">
                {results.messages.slice(0, 5).map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
                {results.messages.length > 5 && (
                  <li>...and {results.messages.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
          
          {results.errors.length > 0 && (
            <div className="text-red-600">
              <div className="font-medium">Errors:</div>
              <ul className="list-disc pl-5">
                {results.errors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
                {results.errors.length > 5 && (
                  <li>...and {results.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          <div className="mt-2 text-xs text-gray-500">
            Last run: {new Date(results.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
} 