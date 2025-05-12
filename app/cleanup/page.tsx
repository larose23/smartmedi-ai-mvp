'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

export default function CleanupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{[key: string]: string}>({});

  const clearAppointments = async () => {
    setIsLoading(true);
    try {
      const { error, count } = await supabase
        .from('appointments')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) {
        console.error('Error clearing appointments:', error);
        toast.error('Failed to clear appointments');
        setResults(prev => ({ ...prev, appointments: `Failed: ${error.message}` }));
        return;
      }
      
      setResults(prev => ({ ...prev, appointments: `Success: Deleted ${count} records` }));
      toast.success(`Cleared ${count} appointments`);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to clear appointments');
      setResults(prev => ({ ...prev, appointments: 'Failed: Unknown error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const clearStaff = async () => {
    setIsLoading(true);
    try {
      const { error, count } = await supabase
        .from('staff')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) {
        console.error('Error clearing staff:', error);
        toast.error('Failed to clear staff');
        setResults(prev => ({ ...prev, staff: `Failed: ${error.message}` }));
        return;
      }
      
      setResults(prev => ({ ...prev, staff: `Success: Deleted ${count} records` }));
      toast.success(`Cleared ${count} staff records`);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to clear staff');
      setResults(prev => ({ ...prev, staff: 'Failed: Unknown error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const clearPatients = async () => {
    setIsLoading(true);
    try {
      // First clear appointments to avoid foreign key constraints
      await clearAppointments();
      
      const { error, count } = await supabase
        .from('patients')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) {
        console.error('Error clearing patients:', error);
        toast.error('Failed to clear patients');
        setResults(prev => ({ ...prev, patients: `Failed: ${error.message}` }));
        return;
      }
      
      setResults(prev => ({ ...prev, patients: `Success: Deleted ${count} records` }));
      toast.success(`Cleared ${count} patient records`);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to clear patients');
      setResults(prev => ({ ...prev, patients: 'Failed: Unknown error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllData = async () => {
    setIsLoading(true);
    try {
      // Clear in order to respect foreign key constraints
      await clearAppointments();
      await clearPatients();
      await clearStaff();
      
      toast.success('All database records have been cleared');
      setResults(prev => ({ ...prev, all: 'Success: All records deleted' }));
    } catch (err) {
      console.error('Error clearing all data:', err);
      toast.error('Failed to clear all data');
      setResults(prev => ({ ...prev, all: 'Failed: Error clearing all data' }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Database Cleanup Utility</h1>
      <div className="bg-yellow-100 p-4 rounded-md mb-8 border border-yellow-400">
        <h2 className="text-lg font-semibold text-yellow-800">Warning!</h2>
        <p className="text-yellow-800">
          This page allows you to delete records from your database. This action cannot be undone.
          Use these buttons only if you want to clear test/dummy data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Individual Cleanup</h2>
          <div className="space-y-4">
            <div>
              <Button 
                onClick={clearAppointments} 
                disabled={isLoading}
                variant="destructive" 
                className="w-full"
              >
                Clear All Appointments
              </Button>
              {results.appointments && (
                <p className={`mt-2 text-sm ${results.appointments.startsWith('Success') ? 'text-green-600' : 'text-red-600'}`}>
                  {results.appointments}
                </p>
              )}
            </div>
            
            <div>
              <Button 
                onClick={clearPatients} 
                disabled={isLoading}
                variant="destructive" 
                className="w-full"
              >
                Clear All Patients
              </Button>
              {results.patients && (
                <p className={`mt-2 text-sm ${results.patients.startsWith('Success') ? 'text-green-600' : 'text-red-600'}`}>
                  {results.patients}
                </p>
              )}
            </div>
            
            <div>
              <Button 
                onClick={clearStaff} 
                disabled={isLoading}
                variant="destructive" 
                className="w-full"
              >
                Clear All Staff
              </Button>
              {results.staff && (
                <p className={`mt-2 text-sm ${results.staff.startsWith('Success') ? 'text-green-600' : 'text-red-600'}`}>
                  {results.staff}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Full Database Cleanup</h2>
          <div className="space-y-4">
            <Button 
              onClick={clearAllData} 
              disabled={isLoading}
              variant="destructive" 
              className="w-full"
            >
              Clear All Data
            </Button>
            {results.all && (
              <p className={`mt-2 text-sm ${results.all.startsWith('Success') ? 'text-green-600' : 'text-red-600'}`}>
                {results.all}
              </p>
            )}
            <p className="text-sm text-gray-600 mt-4">
              This will clear all appointments, patients, and staff records from the database.
              After clearing, you can add real patient records to test the system.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <Button 
          onClick={() => window.location.href = '/appointments'} 
          className="w-full md:w-auto"
        >
          Return to Appointments
        </Button>
      </div>
    </div>
  );
} 