import { AppProps } from 'next/app';
import { useEffect } from 'react';
import { initializeMonitoring } from '../lib/monitoring';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    initializeMonitoring();
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp; 