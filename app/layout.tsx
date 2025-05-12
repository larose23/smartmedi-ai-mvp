import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { AppProvider } from './context/StateContext';
import { ConfigProvider } from '../lib/config/ConfigContext';
import { headers } from 'next/headers';
import { AccessibilityProvider } from '@/lib/contexts/AccessibilityContext';
import { AccessibilityToolbar } from '@/components/AccessibilityToolbar';
import '@/styles/accessibility.css';
import Script from 'next/script';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

// Dynamically import the DatabaseInitializer to avoid SSR issues
// since it needs to run in the browser
const DatabaseInitializer = dynamic(
  () => import('./components/DatabaseInitializer'),
  { ssr: false }
);

// Dynamically import NotificationSystem to avoid SSR issues
const NotificationSystem = dynamic(
  () => import('./components/NotificationSystem'),
  { ssr: false }
);

// Dynamically import PWA components
const PWAInstallPrompt = dynamic(
  () => import('./components/PWAInstallPrompt'),
  { ssr: false }
);

export const metadata: Metadata = {
  title: 'SmartMedi AI - Intelligent Healthcare Management',
  description: 'Streamline your healthcare practice with AI-powered patient management, smart triage, and automated scheduling.',
  manifest: '/manifest.json',
  themeColor: '#ffffff',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

// Add CSRF protection middleware
export async function middleware() {
  const headersList = headers();
  const response = new Response();
  
  // Set security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Set CSP header
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.openai.com;"
  );
  
  return response;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="SmartMedi AI" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SmartMedi AI" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#4a90e2" />
        
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="shortcut icon" href="/icons/favicon.ico" />
      </head>
      <body className={inter.className}>
        <AccessibilityProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <main id="main-content">
            <ConfigProvider>
              <AppProvider>
                {/* Keep the Toaster for backward compatibility */}
                <Toaster position="top-right" />
                
                {/* Our new notification system */}
                <NotificationSystem position="top-right" maxNotifications={3} />
                
                {/* Load the database initializer */}
                <DatabaseInitializer />
                
                <Providers>{children}</Providers>
              </AppProvider>
            </ConfigProvider>
          </main>
          <AccessibilityToolbar />
          <PWAInstallPrompt />
        </AccessibilityProvider>

        {/* Service Worker Registration */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('Service Worker registration successful');
                  },
                  function(err) {
                    console.log('Service Worker registration failed: ', err);
                  }
                );
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
