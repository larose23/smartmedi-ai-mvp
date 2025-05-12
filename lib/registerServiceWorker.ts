export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Check for updates every hour
      setInterval(async () => {
        await registration.update();
      }, 60 * 60 * 1000);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show update notification
              if (confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });

      // Handle service worker errors
      registration.addEventListener('error', (error) => {
        console.error('Service worker registration failed:', error);
      });

    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }
} 