"use client";

export function getCSRFTokenFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/csrf-token=([^;]+)/);
  return match ? match[1] : null;
} 