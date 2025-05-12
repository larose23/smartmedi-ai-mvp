'use client';

import { useEffect, useState } from 'react';
import { initializeDatabase } from '@/app/lib/db-init';
import { refreshSchemaCache, checkDatabaseHealth, cleanupResources } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function ServerInit() {
  const [initStatus, setInitStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  useEffect(() => {
    const initServer = async () => {
      try {
        console.log('Initializing server components...');
        
        // Check database health first
        const isHealthy = await checkDatabaseHealth();
        if (!isHealthy) {
          console.error('Database health check failed');
          toast.error('Database connection issue detected. Some features may not work properly.');
        }
        
        // Initialize database schema
        const dbInitResult = await initializeDatabase();
        
        if (!dbInitResult.success) {
          console.warn('Database initialization had some issues:', dbInitResult.errors);
          toast.error('Database initialization had issues. Some features may be limited.');
        } else {
          console.log('Database initialization completed successfully');
        }
        
        // Refresh schema cache
        const schemaRefreshed = await refreshSchemaCache();
        if (!schemaRefreshed) {
          console.warn('Schema cache refresh failed');
        }
        
        console.log('Server initialization complete');
        setInitStatus('success');
      } catch (error) {
        console.error('Critical error during server initialization:', error);
        setInitStatus('error');
        toast.error('Server initialization error. Please refresh or try again later.');
      }
    };
    
    initServer();
    
    // Clean up resources when component unmounts
    return () => {
      // Only clean up in a server environment
      if (typeof window === 'undefined') {
        cleanupResources();
      }
    };
  }, []);
  
  // This component doesn't render anything visible
  return null;
} 