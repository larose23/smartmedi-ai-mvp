"use client";
import React, { useEffect, useRef } from 'react';
import { useAccessibility } from '@/lib/contexts/AccessibilityContext';

export const AccessibilityToolbar: React.FC = () => {
  const { highContrast, fontSize, toggleHighContrast, setFontSize } = useAccessibility();
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Alt + H to toggle high contrast
      if (event.altKey && event.key === 'h') {
        event.preventDefault();
        toggleHighContrast();
      }
      // Alt + Plus to increase font size
      if (event.altKey && event.key === '+') {
        event.preventDefault();
        setFontSize(Math.min(24, fontSize + 2));
      }
      // Alt + Minus to decrease font size
      if (event.altKey && event.key === '-') {
        event.preventDefault();
        setFontSize(Math.max(12, fontSize - 2));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [fontSize, toggleHighContrast, setFontSize]);

  return (
    <div 
      ref={toolbarRef}
      className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50"
      role="toolbar"
      aria-label="Accessibility controls"
    >
      <div className="space-y-4">
        <div>
          <label 
            htmlFor="high-contrast-toggle"
            className="flex items-center space-x-2 cursor-pointer"
          >
            <input
              id="high-contrast-toggle"
              type="checkbox"
              checked={highContrast}
              onChange={toggleHighContrast}
              className="w-4 h-4"
              aria-label="Toggle high contrast mode"
            />
            <span>High Contrast (Alt + H)</span>
          </label>
        </div>

        <div>
          <label 
            htmlFor="font-size"
            className="block mb-2"
          >
            Text Size
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFontSize(Math.max(12, fontSize - 2))}
              className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
              aria-label="Decrease text size (Alt + -)"
              title="Decrease text size (Alt + -)"
            >
              A-
            </button>
            <span className="w-8 text-center">{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(24, fontSize + 2))}
              className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
              aria-label="Increase text size (Alt + +)"
              title="Increase text size (Alt + +)"
            >
              A+
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 