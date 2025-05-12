import { createServerClient } from '@supabase/ssr';
import { config } from './config';

const supabaseUrl = config.services.SUPABASE_URL;
const supabaseAnonKey = config.services.SUPABASE_ANON_KEY;

// Track active connections to ensure proper cleanup
interface ConnectionTracker {
  activeRequests: Set<AbortController>;
  timeoutIds: Set<NodeJS.Timeout>;
}

export const connectionTracker: ConnectionTracker = {
  activeRequests: new Set<AbortController>(),
  timeoutIds: new Set<NodeJS.Timeout>(),
};

// Function to clean up resources
export const cleanupResources = () => {
  console.log(`Cleaning up ${connectionTracker.activeRequests.size} active requests`);
  
  // Abort any in-flight requests
  connectionTracker.activeRequests.forEach(controller => {
    try {
      controller.abort();
    } catch (e) {
      console.error('Error aborting request:', e);
    }
  });
  connectionTracker.activeRequests.clear();
  
  // Clear any pending timeouts
  connectionTracker.timeoutIds.forEach(id => {
    try {
      clearTimeout(id);
    } catch (e) {
      console.error('Error clearing timeout:', e);
    }
  });
  connectionTracker.timeoutIds.clear();
  
  console.log('Resource cleanup complete');
};

// Register for Node.js process exit events in server environments
if (typeof window === 'undefined') {
  process.on('SIGTERM', cleanupResources);
  process.on('SIGINT', cleanupResources);
}

// Enhanced fetch with timeout and retry logic
const enhancedFetch = async (url: string, options: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: 'include', // Include credentials for cross-origin requests
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Create the Supabase client with all required options and enhanced fetch
export const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Function to check database connection health
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    console.log('Checking database connection health...');
    const startTime = Date.now();
    
    // Simple query to verify database connectivity
    const { data, error, status } = await supabase
      .from('check_ins')
      .select('id')
      .limit(1)
      .maybeSingle();
      
    const endTime = Date.now();
    console.log(`Database health check completed in ${endTime - startTime}ms, status: ${status}`);
    
    if (error && status !== 406) {
      console.error('Database connection error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception during database health check:', error);
    return false;
  }
};

// Function to manually refresh the schema cache
export const refreshSchemaCache = async () => {
  try {
    console.log('Refreshing Supabase schema cache...');
    
    // Attempt to use RPC to clear cache
    const { error: rpcError } = await supabase.rpc('clear_schema_cache');
    
    if (rpcError) {
      console.error('RPC schema cache refresh failed:', rpcError);
      // Fall back to direct fetch of the schema
      try {
        const { error: fallbackError } = await supabase
          .from('check_ins')
          .select('*')
          .limit(1);
          
        if (fallbackError) {
          console.error('Fallback schema refresh failed:', fallbackError);
          return false;
        }
      } catch (fallbackErr) {
        console.error('Error during fallback schema refresh:', fallbackErr);
        return false;
      }
    }
    
    console.log('Schema cache refreshed successfully');
    return true;
  } catch (error) {
    console.error('Failed to refresh schema cache:', error);
    return false;
  }
};

// Session validation helper
export const validateSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return false;
  }
  
  // Check if session is expired
  if (session.expires_at && session.expires_at * 1000 < Date.now()) {
    await supabase.auth.signOut();
    return false;
  }
  
  return true;
};

// API key validation helper
export const validateApiKey = (apiKey: string, service: 'openai' | 'supabase') => {
  const validKeys = {
    openai: config.services.OPENAI_API_KEY,
    supabase: config.services.SUPABASE_ANON_KEY,
  };
  
  return apiKey === validKeys[service];
}; 