"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityContextType {
  highContrast: boolean;
  fontSize: number;
  toggleHighContrast: () => void;
  setFontSize: (size: number) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(16); // Default font size in pixels

  useEffect(() => {
    // Load saved preferences from localStorage
    const savedHighContrast = localStorage.getItem('highContrast') === 'true';
    const savedFontSize = Number(localStorage.getItem('fontSize')) || 16;
    
    setHighContrast(savedHighContrast);
    setFontSize(savedFontSize);
  }, []);

  const toggleHighContrast = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    localStorage.setItem('highContrast', String(newValue));
  };

  const handleSetFontSize = (size: number) => {
    setFontSize(size);
    localStorage.setItem('fontSize', String(size));
  };

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        fontSize,
        toggleHighContrast,
        setFontSize: handleSetFontSize,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
} 