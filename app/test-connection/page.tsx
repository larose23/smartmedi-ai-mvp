'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestConnection() {
  const [connectionStatus, setConnectionStatus] = useState('Checking...');

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase
          .from('check_ins')
          .select('count')
          .limit(1);

        if (error) {
          setConnectionStatus(`Error: ${error.message}`);
        } else {
          setConnectionStatus('✅ Connection successful!');
        }
      } catch (error) {
        setConnectionStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
        <p className="text-lg">Status: {connectionStatus}</p>
      </div>
    </div>
  );
} 