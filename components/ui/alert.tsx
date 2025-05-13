import React from 'react';

export const Alert: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ border: '1px solid orange', padding: 8, background: '#fffbe6' }}>{children}</div>
);

export const AlertDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div>{children}</div>
); 