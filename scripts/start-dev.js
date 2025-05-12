#!/usr/bin/env node

const { spawn } = require('child_process');
const net = require('net');

// Default starting port
let PORT = 3009;

// Function to check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', err => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

// Function to find an available port
async function findAvailablePort(startPort) {
  let port = startPort;
  let maxAttempts = 20; // Avoid infinite loop
  
  while (await isPortInUse(port) && maxAttempts > 0) {
    console.log(`Port ${port} is in use, trying ${port + 1}...`);
    port++;
    maxAttempts--;
  }
  
  if (maxAttempts === 0) {
    console.error('Could not find an available port after multiple attempts');
    process.exit(1);
  }
  
  return port;
}

// Main function to start the development server
async function startDevServer() {
  try {
    // Find an available port
    const availablePort = await findAvailablePort(PORT);
    
    if (availablePort !== PORT) {
      console.log(`Found available port: ${availablePort}`);
    }
    
    // Start Next.js development server
    console.log(`Starting Next.js development server on port ${availablePort}...`);
    
    const nextProcess = spawn('npx', ['next', 'dev', '-p', String(availablePort)], {
      stdio: 'inherit',
      shell: true
    });
    
    // Handle process events
    nextProcess.on('error', (err) => {
      console.error('Failed to start development server:', err);
      process.exit(1);
    });
    
    nextProcess.on('close', (code) => {
      if (code !== 0) {
        console.log(`Development server process exited with code ${code}`);
      }
      process.exit(code);
    });
    
    // Handle termination signals
    process.on('SIGINT', () => {
      console.log('Shutting down development server...');
      nextProcess.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
      console.log('Shutting down development server...');
      nextProcess.kill('SIGTERM');
    });
    
  } catch (error) {
    console.error('Error starting development server:', error);
    process.exit(1);
  }
}

// Run the main function
startDevServer(); 