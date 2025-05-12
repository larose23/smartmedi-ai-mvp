const express = require('express');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Get environment variables
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3009', 10);

// Check if port is in use, if so, use next available
const findAvailablePort = async (startPort) => {
  const net = require('net');
  
  return new Promise((resolve) => {
    const server = net.createServer();
    server.on('error', () => {
      // Port is in use, try next port
      resolve(findAvailablePort(startPort + 1));
    });
    
    server.listen(startPort, () => {
      server.close(() => {
        resolve(startPort);
      });
    });
  });
};

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Create a shared Supabase connection for the server
let supabaseClient = null;

// Track active connections for proper shutdown
const activeConnections = new Set();

// Initialize Supabase client once
function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials. Please check environment variables.');
      process.exit(1);
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('Supabase client initialized for server');
  }
  return supabaseClient;
}

// Handle graceful shutdown
function handleShutdown() {
  console.log('Server shutdown initiated...');
  
  // Close all active connections
  activeConnections.forEach(conn => {
    conn.destroy();
  });
  
  // Close Supabase connection if open
  if (supabaseClient) {
    console.log('Closing Supabase connection...');
    // No explicit close method in supabase-js, but we can clean up any listeners
    // and pending operations here if needed in the future
  }
  
  console.log('Server shutdown complete');
  process.exit(0);
}

// Prepare Next.js
app.prepare().then(async () => {
  const actualPort = await findAvailablePort(port);
  if (actualPort !== port) {
    console.log(`Port ${port} is in use, using port ${actualPort} instead`);
  }
  
  const server = express();
  
  // Add middleware to handle requests
  server.all('*', (req, res) => {
    // Track active connections
    activeConnections.add(res.socket);
    res.socket.on('close', () => {
      activeConnections.delete(res.socket);
    });
    
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });
  
  // Start the server
  const httpServer = createServer(server);
  httpServer.listen(actualPort, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${actualPort}`);
    
    // Initialize shared Supabase client
    getSupabaseClient();
    
    // Run archive fix on startup
    setTimeout(async () => {
      try {
        console.log('Running archive fix...');
        const response = await fetch(`http://${hostname}:${actualPort}/api/db-fix/patients-archive`);
        const result = await response.json();
        console.log('Archive fix result:', result);
      } catch (error) {
        console.error('Error running archive fix:', error);
      }
    }, 5000); // Wait 5 seconds for server to fully initialize
  });
  
  // Set up graceful shutdown
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
});

// Handle shutdown gracefully
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    console.log(`Received ${signal}, closing server...`);
    process.exit(0);
  });
}); 