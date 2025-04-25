'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';

export default function QRCodeGenerator() {
  const [url, setUrl] = useState('');

  useEffect(() => {
    // Get the current URL for the QR code
    setUrl(window.location.href);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <QRCodeSVG
        value={url}
        size={256}
        level="H"
        includeMargin={true}
        className="p-4 bg-white rounded-lg"
      />
      <p className="mt-4 text-sm text-gray-500">
        Scan this QR code with your mobile device
      </p>
    </div>
  );
} 