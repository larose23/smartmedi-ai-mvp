'use client';

import { useEffect, useState } from 'react';
import { initializeDatabase } from '../lib/db-init';

export default function DatabaseInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDb = async () => {
      try {
        console.log('Starting database initialization...');
        const result = await initializeDatabase();
        
        if (result.success) {
          console.log('Database initialized successfully');
          console.log('Operations performed:', result.operations);
          setInitialized(true);
        } else {
          console.error('Database initialization failed:', result.errors);
          setError(result.errors.join(', '));
        }
      } catch (err) {
        console.error('Error initializing database:', err);
        setError(String(err));
      }
    };

    initDb();
  }, []);

  // This is a headless component - it doesn't render anything
  return null;
} 