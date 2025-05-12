import { redirect } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="py-6 bg-white shadow-sm">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">SmartMedi AI</h1>
          <div>
            <Link 
              href="/login" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 flex flex-col items-center">
        <h2 className="text-4xl font-bold text-center mb-6">Welcome to SmartMedi AI</h2>
        <p className="text-xl text-gray-600 text-center max-w-3xl mb-12">
          AI-powered healthcare platform for efficient patient management and improved healthcare delivery
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Patient Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
            <div className="text-blue-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-4">Patients</h3>
            <p className="text-gray-600 text-center mb-6">
              Complete your check-in process online and reduce wait times
            </p>
            <Link 
              href="/checkin" 
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors"
            >
              Patient Check-In
            </Link>
          </div>
          
          {/* Staff Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
            <div className="text-blue-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-4">Medical Staff</h3>
            <p className="text-gray-600 text-center mb-6">
              Access patient dashboard and manage appointments efficiently
            </p>
            <Link 
              href="/login" 
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </div>
      
      {/* Features */}
      <div className="bg-blue-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-3">Smart Triage</h3>
              <p className="text-gray-600">
                AI-powered system to prioritize patients based on symptoms and medical history
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-3">Patient Dashboard</h3>
              <p className="text-gray-600">
                Centralized view of all patient check-ins with real-time updates
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-3">Digital Check-In</h3>
              <p className="text-gray-600">
                Streamlined process for patients to register symptoms and medical information
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
