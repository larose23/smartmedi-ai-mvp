'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { Label } from '@/components/ui/label';

export default function TestPatientsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '2000-01-01', // Default date
    gender: 'Not Specified',
    contact_info: '',
  });

  // Fetch patients on load
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('first_name', { ascending: true });
        
      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Error loading patients:', err);
      toast.error('Failed to load patients');
    }
  };

  const createTestPatient = async () => {
    if (!newPatient.first_name || !newPatient.last_name) {
      toast.error('Patient name is required');
      return;
    }
    
    // Set contact_info before submitting
    const patientData = {
      ...newPatient,
      contact_info: newPatient.contact_info || `${newPatient.first_name.toLowerCase()}.${newPatient.last_name.toLowerCase()}@example.com`
    };
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([patientData])
        .select();
        
      if (error) throw error;
      
      toast.success('Test patient created successfully');
      setNewPatient({
        first_name: '',
        last_name: '',
        date_of_birth: '2000-01-01',
        gender: 'Not Specified',
        contact_info: '',
      });
      
      await fetchPatients();
    } catch (err) {
      console.error('Error creating patient:', err);
      toast.error('Failed to create test patient');
    } finally {
      setIsLoading(false);
    }
  };

  const createTestStaff = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .insert([{
          first_name: 'Test',
          last_name: 'Doctor',
          role: 'Doctor',
          department: 'General',
          email: `doctor_${Date.now()}@example.com`
        }])
        .select();
        
      if (error) throw error;
      
      toast.success('Test staff member created successfully');
    } catch (err) {
      console.error('Error creating staff:', err);
      toast.error('Failed to create test staff');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Test Patients Manager</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Create Test Patient</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={newPatient.first_name}
                onChange={(e) => setNewPatient({...newPatient, first_name: e.target.value})}
                placeholder="First Name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={newPatient.last_name}
                onChange={(e) => setNewPatient({...newPatient, last_name: e.target.value})}
                placeholder="Last Name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={newPatient.date_of_birth}
                onChange={(e) => setNewPatient({...newPatient, date_of_birth: e.target.value})}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={newPatient.gender}
                onChange={(e) => setNewPatient({...newPatient, gender: e.target.value})}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Not Specified">Not Specified</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="contact_info">Contact Information</Label>
              <Input
                id="contact_info"
                value={newPatient.contact_info}
                onChange={(e) => setNewPatient({...newPatient, contact_info: e.target.value})}
                placeholder="Email or Phone"
                className="mt-1"
              />
            </div>
            
            <Button 
              onClick={createTestPatient} 
              disabled={isLoading}
              className="w-full"
            >
              Create Patient
            </Button>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Existing Patients</h2>
          
          {patients.length === 0 ? (
            <p className="text-gray-500">No patients found. Create some test patients.</p>
          ) : (
            <div className="overflow-auto max-h-80">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patients.map(patient => (
                    <tr key={patient.id}>
                      <td className="px-4 py-2 whitespace-nowrap">{patient.first_name} {patient.last_name}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{new Date(patient.date_of_birth).toLocaleDateString()}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">{patient.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-6">
            <Button 
              onClick={createTestStaff}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              Create Test Staff Member
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex space-x-4">
        <Button onClick={() => window.location.href = '/appointments'}>
          Go to Appointments
        </Button>
        <Button onClick={() => window.location.href = '/cleanup'} variant="destructive">
          Go to Database Cleanup
        </Button>
      </div>
    </div>
  );
} 