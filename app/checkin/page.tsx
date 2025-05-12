'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { analyzeSymptoms } from '@/lib/triage';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// Define minimal types for check-in data to avoid type errors
type SymptomsData = {
  pain_level: number;
  pain_location: string;
  pain_characteristics: string[];
  impact_on_activities: string[];
  medical_history: string[];
  current_symptoms: string[];
};

type TriageResult = {
  triage_score: string;
  suggested_department: string;
  estimated_wait_minutes: number;
  potential_diagnoses: string[];
  recommended_actions: string[];
  risk_factors: string[];
};

interface FormData {
  patientName: string;
  dateOfBirth: string;
  gender: string;
  contactInfo: string;
  painLevel: string;
  painLocation: string;
  painCharacteristics: {
    sharp: boolean;
    dull: boolean;
    throbbing: boolean;
    chronic: boolean;
    acute: boolean;
  };
  impactOnActivities: {
    walking: boolean;
    sleeping: boolean;
    working: boolean;
    eating: boolean;
    other: boolean;
  };
  medicalHistory: {
    heartDisease: boolean;
    diabetes: boolean;
    highBloodPressure: boolean;
    asthma: boolean;
    other: boolean;
  };
  currentSymptoms: {
    chestPain: boolean;
    difficultyBreathing: boolean;
    headache: boolean;
    fever: boolean;
    other: boolean;
  };
}

export default function CheckIn() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    patientName: '',
    dateOfBirth: '',
    gender: 'Not Specified',
    contactInfo: '',
    painLevel: '',
    painLocation: '',
    painCharacteristics: {
      sharp: false,
      dull: false, 
      throbbing: false,
      chronic: false,
      acute: false
    },
    impactOnActivities: {
      walking: false,
      sleeping: false,
      working: false,
      eating: false,
      other: false
    },
    medicalHistory: {
      heartDisease: false,
      diabetes: false,
      highBloodPressure: false,
      asthma: false,
      other: false
    },
    currentSymptoms: {
      chestPain: false,
      difficultyBreathing: false,
      headache: false,
      fever: false,
      other: false
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePainCharacteristicsChange = (name: keyof FormData['painCharacteristics']) => {
    setFormData((prev) => ({
      ...prev,
      painCharacteristics: {
        ...prev.painCharacteristics,
        [name]: !prev.painCharacteristics[name]
      }
    }));
  };

  const handleImpactOnActivitiesChange = (name: keyof FormData['impactOnActivities']) => {
    setFormData((prev) => ({
      ...prev,
      impactOnActivities: {
        ...prev.impactOnActivities,
        [name]: !prev.impactOnActivities[name]
      }
    }));
  };

  const handleMedicalHistoryChange = (name: keyof FormData['medicalHistory']) => {
    setFormData((prev) => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory,
        [name]: !prev.medicalHistory[name]
      }
    }));
  };

  const handleCurrentSymptomsChange = (name: keyof FormData['currentSymptoms']) => {
    setFormData((prev) => ({
      ...prev,
      currentSymptoms: {
        ...prev.currentSymptoms,
        [name]: !prev.currentSymptoms[name]
      }
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      // Ensure gender is included in the payload
      const payload = { ...formData, gender: formData.gender || '' };
      const response = await fetch('/api/check-in-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message || 'Check-in completed successfully!');
        toast.success('Check-in completed successfully!');
        // Save patient object to localStorage for appointment booking
        if (data.patient) {
          localStorage.setItem('selectedPatient', JSON.stringify(data.patient));
          // Debug log: show what is saved in localStorage
          console.log('Saved selectedPatient to localStorage:', data.patient);
        }
        // Clear form
        setFormData({
          patientName: '',
          dateOfBirth: '',
          gender: 'Not Specified',
          contactInfo: '',
          painLevel: '',
          painLocation: '',
          painCharacteristics: {
            sharp: false,
            dull: false, 
            throbbing: false,
            chronic: false,
            acute: false
          },
          impactOnActivities: {
            walking: false,
            sleeping: false,
            working: false,
            eating: false,
            other: false
          },
          medicalHistory: {
            heartDisease: false,
            diabetes: false,
            highBloodPressure: false,
            asthma: false,
            other: false
          },
          currentSymptoms: {
            chestPain: false,
            difficultyBreathing: false,
            headache: false,
            fever: false,
            other: false
          }
        });
      } else {
        throw new Error(data.error || 'Failed to complete check-in');
      }
    } catch (error) {
      console.error('Error during check-in:', error);
      toast.error('Failed to complete check-in process');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <header className="mb-8">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-700">
            SmartMedi AI Patient Check-In
          </h1>
          <div className="flex gap-4">
            <Link 
              href="/" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Home
            </Link>
            <Link 
              href="/login" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto max-w-4xl bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Patient Check-In</h1>

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div>
            <label htmlFor="patientName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              id="patientName"
              name="patientName"
              value={formData.patientName}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Not Specified">Not Specified</option>
            </select>
          </div>

          <div>
            <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              type="tel"
              id="contactInfo"
              name="contactInfo"
              placeholder="e.g., +1 (555) 123-4567"
              value={formData.contactInfo}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be used to contact you regarding your appointment
            </p>
          </div>

          <div>
            <label htmlFor="painLevel" className="block text-sm font-medium text-gray-700">
              Pain Level (1-10)
            </label>
            <input
              type="range"
              id="painLevel"
              name="painLevel"
              min="1"
              max="10"
              value={formData.painLevel}
              onChange={handleInputChange}
              className="mt-1 block w-full"
              required
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1 (Mild)</span>
              <span>5 (Moderate)</span>
              <span>10 (Severe)</span>
            </div>
          </div>

          <div>
            <label htmlFor="painLocation" className="block text-sm font-medium text-gray-700">
              Pain Location
            </label>
            <input
              type="text"
              id="painLocation"
              name="painLocation"
              value={formData.painLocation}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">
              Pain Characteristics (select all that apply)
            </span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.painCharacteristics.sharp}
                  onChange={() => handlePainCharacteristicsChange('sharp')}
                  name="sharp"
                  className="mr-2"
                />
                Sharp
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.painCharacteristics.dull}
                  onChange={() => handlePainCharacteristicsChange('dull')}
                  name="dull"
                  className="mr-2"
                />
                Dull
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.painCharacteristics.throbbing}
                  onChange={() => handlePainCharacteristicsChange('throbbing')}
                  name="throbbing"
                  className="mr-2"
                />
                Throbbing
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.painCharacteristics.chronic}
                  onChange={() => handlePainCharacteristicsChange('chronic')}
                  name="chronic"
                  className="mr-2"
                />
                Chronic
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.painCharacteristics.acute}
                  onChange={() => handlePainCharacteristicsChange('acute')}
                  name="acute"
                  className="mr-2"
                />
                Acute
              </label>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">
              Impact on Daily Activities (select all that apply)
            </span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.impactOnActivities.walking}
                  onChange={() => handleImpactOnActivitiesChange('walking')}
                  name="walking"
                  className="mr-2"
                />
                Walking
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.impactOnActivities.sleeping}
                  onChange={() => handleImpactOnActivitiesChange('sleeping')}
                  name="sleeping"
                  className="mr-2"
                />
                Sleeping
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.impactOnActivities.working}
                  onChange={() => handleImpactOnActivitiesChange('working')}
                  name="working"
                  className="mr-2"
                />
                Working
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.impactOnActivities.eating}
                  onChange={() => handleImpactOnActivitiesChange('eating')}
                  name="eating"
                  className="mr-2"
                />
                Eating
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.impactOnActivities.other}
                  onChange={() => handleImpactOnActivitiesChange('other')}
                  name="other"
                  className="mr-2"
                />
                Other
              </label>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">
              Medical History (select all that apply)
            </span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.medicalHistory.heartDisease}
                  onChange={() => handleMedicalHistoryChange('heartDisease')}
                  name="heartDisease"
                  className="mr-2"
                />
                Heart Disease
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.medicalHistory.diabetes}
                  onChange={() => handleMedicalHistoryChange('diabetes')}
                  name="diabetes"
                  className="mr-2"
                />
                Diabetes
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.medicalHistory.highBloodPressure}
                  onChange={() => handleMedicalHistoryChange('highBloodPressure')}
                  name="highBloodPressure"
                  className="mr-2"
                />
                High Blood Pressure
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.medicalHistory.asthma}
                  onChange={() => handleMedicalHistoryChange('asthma')}
                  name="asthma"
                  className="mr-2"
                />
                Asthma
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.medicalHistory.other}
                  onChange={() => handleMedicalHistoryChange('other')}
                  name="other"
                  className="mr-2"
                />
                Other
              </label>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">
              Current Symptoms (select all that apply)
            </span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.currentSymptoms.chestPain}
                  onChange={() => handleCurrentSymptomsChange('chestPain')}
                  name="chestPain"
                  className="mr-2"
                />
                Chest Pain
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.currentSymptoms.difficultyBreathing}
                  onChange={() => handleCurrentSymptomsChange('difficultyBreathing')}
                  name="difficultyBreathing"
                  className="mr-2"
                />
                Difficulty Breathing
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.currentSymptoms.headache}
                  onChange={() => handleCurrentSymptomsChange('headache')}
                  name="headache"
                  className="mr-2"
                />
                Headache
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.currentSymptoms.fever}
                  onChange={() => handleCurrentSymptomsChange('fever')}
                  name="fever"
                  className="mr-2"
                />
                Fever
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.currentSymptoms.other}
                  onChange={() => handleCurrentSymptomsChange('other')}
                  name="other"
                  className="mr-2"
                />
                Other
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Check-In'}
          </button>
        </form>
      </main>
    </div>
  );
} 