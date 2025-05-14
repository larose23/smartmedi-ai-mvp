'use client';

import { Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import AppointmentScheduler from '../../components/AppointmentScheduler';

export default function AppointmentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast notifications container */}
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="flex items-center text-blue-600 hover:text-blue-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Dashboard
              </a>
              <div className="text-2xl font-bold text-blue-600">SmartMedi AI</div>
            </div>
          </div>
        </div>
      </header>

      <Suspense fallback={
        <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      }>
        <AppointmentScheduler />
      </Suspense>
    </div>
  );
} 