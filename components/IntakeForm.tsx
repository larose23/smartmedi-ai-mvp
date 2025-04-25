'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function IntakeForm() {
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    contact_info: '',
    primary_symptom: '',
    additional_symptoms: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const calculateTriageScore = (symptom: string): number => {
    const highPrioritySymptoms = ['chest pain', 'difficulty breathing', 'severe bleeding'];
    const mediumPrioritySymptoms = ['fever', 'persistent cough', 'moderate pain'];
    
    const normalizedSymptom = symptom.toLowerCase();
    
    if (highPrioritySymptoms.some(s => normalizedSymptom.includes(s))) {
      return 3; // High priority
    } else if (mediumPrioritySymptoms.some(s => normalizedSymptom.includes(s))) {
      return 2; // Medium priority
    }
    return 1; // Low priority
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const triage_score = calculateTriageScore(formData.primary_symptom);
      
      const { error: insertError } = await supabase
        .from('check_ins')
        .insert([{ ...formData, triage_score }]);

      if (insertError) throw insertError;

      setSubmitted(true);
      setFormData({
        full_name: '',
        date_of_birth: '',
        contact_info: '',
        primary_symptom: '',
        additional_symptoms: ''
      });
    } catch (err) {
      console.error('Error submitting check-in:', err);
      setError('Failed to submit check-in. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-green-600 mb-4">Check-in Successful!</h2>
              <p className="text-gray-600 mb-4">Thank you for checking in. A staff member will be with you shortly.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Check in another patient
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Patient Check-in</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please fill in your details below
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
                Date of Birth
              </label>
              <div className="mt-1">
                <input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact_info" className="block text-sm font-medium text-gray-700">
                Contact Information
              </label>
              <div className="mt-1">
                <input
                  id="contact_info"
                  name="contact_info"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Phone number or email"
                  value={formData.contact_info}
                  onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="primary_symptom" className="block text-sm font-medium text-gray-700">
                Primary Symptom
              </label>
              <div className="mt-1">
                <input
                  id="primary_symptom"
                  name="primary_symptom"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.primary_symptom}
                  onChange={(e) => setFormData({ ...formData, primary_symptom: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="additional_symptoms" className="block text-sm font-medium text-gray-700">
                Additional Symptoms (Optional)
              </label>
              <div className="mt-1">
                <textarea
                  id="additional_symptoms"
                  name="additional_symptoms"
                  rows={3}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.additional_symptoms}
                  onChange={(e) => setFormData({ ...formData, additional_symptoms: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 