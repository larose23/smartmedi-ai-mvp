import React, { useState, useRef, useEffect } from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import { addSubmission, getAllSubmissions, deleteSubmission } from '../../services/pwa/indexedDb';
import { searchVocabulary } from '../../services/pwa/localVocabulary';

const GENDERS = [
  'Male',
  'Female',
  'Non-binary',
  'Other',
  'Prefer not to say',
];

const getYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 120 }, (_, i) => currentYear - i);
};
const getMonths = () => Array.from({ length: 12 }, (_, i) => i + 1);
const getDays = () => Array.from({ length: 31 }, (_, i) => i + 1);

const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone: string) =>
  /^\+?\d{7,15}$/.test(phone.replace(/\s+/g, ''));

export const AdvancedCheckInForm: React.FC = () => {
  // Step state
  const [step, setStep] = useState(0);
  // Age group state
  const [ageGroup, setAgeGroup] = useState<'pediatric' | 'adult' | 'geriatric' | null>(null);

  // Demographics & Contact state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    gender: '',
    phone: '',
    email: '',
    // Pediatric fields
    growthPercentile: '',
    vaccinationStatus: '',
    // Geriatric fields
    frailtyScale: '',
    historyOfFalls: '',
    // Medical history
    chronicConditions: [] as string[],
    medications: [] as string[],
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Accessibility: focus management
  const firstNameRef = useRef<HTMLInputElement>(null);

  // QR landing (scaffolded)
  const handleQRScan = (data: any) => {
    // TODO: Implement QR scan logic
    // Example: setForm({ ...form, ...data });
  };

  // Smart triage/AI integration hook (scaffolded)
  const handleTriageHook = () => {
    // Example: send DOB/gender to triage/AI system
    // smartTriage({ dob: { day: form.dobDay, month: form.dobMonth, year: form.dobYear }, gender: form.gender });
  };

  // Calculate age and determine age group
  const calculateAge = (day: string, month: string, year: string) => {
    if (!day || !month || !year) return null;
    const dob = new Date(Number(year), Number(month) - 1, Number(day));
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  // Update age group when DOB changes
  React.useEffect(() => {
    const { dobDay, dobMonth, dobYear } = form;
    const age = calculateAge(dobDay, dobMonth, dobYear);
    if (age !== null) {
      if (age < 18) setAgeGroup('pediatric');
      else if (age >= 65) setAgeGroup('geriatric');
      else setAgeGroup('adult');
    } else {
      setAgeGroup(null);
    }
  }, [form.dobDay, form.dobMonth, form.dobYear]);

  const validate = (field: string, value: string) => {
    switch (field) {
      case 'firstName':
      case 'lastName':
        if (!value) return 'Required';
        break;
      case 'dobDay':
      case 'dobMonth':
      case 'dobYear':
        if (!value) return 'Required';
        break;
      case 'gender':
        if (!value) return 'Required';
        break;
      case 'phone':
        if (!value) return 'Required';
        if (!validatePhone(value)) return 'Invalid phone number';
        break;
      case 'email':
        if (!value) return 'Required';
        if (!validateEmail(value)) return 'Invalid email address';
        break;
      // Pediatric fields
      case 'growthPercentile':
        if (ageGroup === 'pediatric') {
          if (!value) return 'Required';
          const num = Number(value);
          if (isNaN(num) || num < 0 || num > 100) return 'Must be 0-100';
        }
        break;
      case 'vaccinationStatus':
        if (ageGroup === 'pediatric' && !value) return 'Required';
        break;
      // Geriatric fields
      case 'frailtyScale':
        if (ageGroup === 'geriatric') {
          if (!value) return 'Required';
          const num = Number(value);
          if (isNaN(num) || num < 1 || num > 9) return 'Must be 1-9';
        }
        break;
      case 'historyOfFalls':
        if (ageGroup === 'geriatric' && !value) return 'Required';
        break;
      default:
        return '';
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));

    // Trigger triage/AI hook after DOB or gender entry
    if (["dobDay", "dobMonth", "dobYear", "gender"].includes(name)) {
      setTimeout(handleTriageHook, 0);
    }
    // Trigger triage/AI hook for age-aware fields
    if (["growthPercentile", "vaccinationStatus", "frailtyScale", "historyOfFalls"].includes(name)) {
      setTimeout(() => handleTriageHook(), 0);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
  };

  const validateAll = () => {
    const newErrors: { [key: string]: string } = {};
    Object.entries(form).forEach(([field, value]) => {
      const err = validate(field, value);
      if (err) newErrors[field] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateAll()) {
      setStep(step + 1);
    } else {
      // Focus first error
      if (firstNameRef.current && errors.firstName) {
        firstNameRef.current.focus();
      }
    }
  };

  // Progress bar
  const progress = ((step + 1) / 4) * 100;

  // Config for age-aware questions (extensible)
  const pediatricQuestions = [
    {
      key: 'growthPercentile',
      label: 'Growth Chart Percentile',
      type: 'number',
      min: 0,
      max: 100,
      placeholder: 'e.g., 50',
      tooltip: "Percentile ranking for child's height/weight compared to peers.",
    },
    {
      key: 'vaccinationStatus',
      label: 'Vaccination Status',
      type: 'select',
      options: [
        { value: '', label: 'Select' },
        { value: 'up-to-date', label: 'Up to date' },
        { value: 'not-up-to-date', label: 'Not up to date' },
        { value: 'unknown', label: 'Unknown' },
      ],
      tooltip: 'Is the child up to date on vaccinations?',
    },
  ];
  const geriatricQuestions = [
    {
      key: 'frailtyScale',
      label: 'Frailty Scale (1-9)',
      type: 'number',
      min: 1,
      max: 9,
      placeholder: 'e.g., 3',
      tooltip: 'A clinical tool to assess the degree of frailty in older adults. 1 = Very Fit, 9 = Terminally Ill.',
    },
    {
      key: 'historyOfFalls',
      label: 'History of Falls',
      type: 'select',
      options: [
        { value: '', label: 'Select' },
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
      tooltip: 'Has the patient experienced any falls in the past year?',
    },
  ];

  // Step 2: Age-Aware Flows
  const renderAgeAwareSection = () => {
    if (!ageGroup) return null;
    if (ageGroup === 'pediatric') {
      return (
        <div className="mt-6 p-4 bg-blue-50 rounded">
          <h3 className="text-lg font-bold mb-2">Pediatric Questions</h3>
          {pediatricQuestions.map((q) => (
            <div className="mb-4" key={q.key}>
              <label className="block text-sm font-medium" htmlFor={q.key}>
                {q.label}
                <span
                  tabIndex={0}
                  role="button"
                  aria-label={`What is ${q.label}?`}
                  className="ml-1 text-blue-500 align-middle cursor-pointer"
                  title={q.tooltip}
                >
                  <FaInfoCircle className="inline" />
                </span>
              </label>
              {q.type === 'number' ? (
                <input
                  id={q.key}
                  type="number"
                  name={q.key}
                  value={form[q.key]}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full border rounded px-3 py-2 ${errors[q.key] && touched[q.key] ? 'border-red-500' : ''}`}
                  placeholder={q.placeholder}
                  min={q.min}
                  max={q.max}
                  aria-required="true"
                  aria-invalid={!!errors[q.key]}
                  aria-describedby={errors[q.key] ? `${q.key}-error` : undefined}
                />
              ) : (
                <select
                  id={q.key}
                  name={q.key}
                  value={form[q.key]}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full border rounded px-3 py-2 ${errors[q.key] && touched[q.key] ? 'border-red-500' : ''}`}
                  aria-required="true"
                  aria-invalid={!!errors[q.key]}
                  aria-describedby={errors[q.key] ? `${q.key}-error` : undefined}
                >
                  {q.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
              {errors[q.key] && touched[q.key] && (
                <span id={`${q.key}-error`} className="text-xs text-red-600">{errors[q.key]}</span>
              )}
            </div>
          ))}
        </div>
      );
    }
    if (ageGroup === 'geriatric') {
      return (
        <div className="mt-6 p-4 bg-yellow-50 rounded">
          <h3 className="text-lg font-bold mb-2">Geriatric Questions</h3>
          {geriatricQuestions.map((q) => (
            <div className="mb-4" key={q.key}>
              <label className="block text-sm font-medium" htmlFor={q.key}>
                {q.label}
                <span
                  tabIndex={0}
                  role="button"
                  aria-label={`What is ${q.label}?`}
                  className="ml-1 text-blue-500 align-middle cursor-pointer"
                  title={q.tooltip}
                >
                  <FaInfoCircle className="inline" />
                </span>
              </label>
              {q.type === 'number' ? (
                <input
                  id={q.key}
                  type="number"
                  name={q.key}
                  value={form[q.key]}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full border rounded px-3 py-2 ${errors[q.key] && touched[q.key] ? 'border-red-500' : ''}`}
                  placeholder={q.placeholder}
                  min={q.min}
                  max={q.max}
                  aria-required="true"
                  aria-invalid={!!errors[q.key]}
                  aria-describedby={errors[q.key] ? `${q.key}-error` : undefined}
                />
              ) : (
                <select
                  id={q.key}
                  name={q.key}
                  value={form[q.key]}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full border rounded px-3 py-2 ${errors[q.key] && touched[q.key] ? 'border-red-500' : ''}`}
                  aria-required="true"
                  aria-invalid={!!errors[q.key]}
                  aria-describedby={errors[q.key] ? `${q.key}-error` : undefined}
                >
                  {q.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
              {errors[q.key] && touched[q.key] && (
                <span id={`${q.key}-error`} className="text-xs text-red-600">{errors[q.key]}</span>
              )}
            </div>
          ))}
        </div>
      );
    }
    // Adult: no extra questions for now
    return null;
  };

  // Chronic conditions config (with risk node mapping, extensible)
  const chronicConditions = [
    { key: 'diabetes', label: 'Diabetes', riskNode: 'risk_diabetes' },
    { key: 'hypertension', label: 'Hypertension', riskNode: 'risk_hypertension' },
    { key: 'asthma', label: 'Asthma', riskNode: 'risk_asthma' },
    { key: 'heartDisease', label: 'Heart Disease', riskNode: 'risk_heart' },
    { key: 'cancer', label: 'Cancer', riskNode: 'risk_cancer' },
    // Example: Add more conditions here easily
    // { key: 'stroke', label: 'Stroke', riskNode: 'risk_stroke' },
    { key: 'none', label: 'None', riskNode: null },
  ];

  // Medication autocomplete (RxNorm API integration - scaffolded)
  const [medicationInput, setMedicationInput] = useState('');
  const [medicationSuggestions, setMedicationSuggestions] = useState<string[]>([]);

  // Simulate RxNorm API call (scaffolded) and use local vocabulary for offline suggestions
  const fetchMedicationSuggestions = async (query: string) => {
    // If offline, use local vocabulary
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setMedicationSuggestions(searchVocabulary(query));
      return;
    }
    // TODO: Replace with real RxNorm API call when online
    setMedicationSuggestions([
      ...searchVocabulary(query),
      query + ' XR',
      query + ' 500mg',
      query + ' (Generic)',
    ]);
  };

  // Handle medication input change
  const handleMedicationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMedicationInput(e.target.value);
    fetchMedicationSuggestions(e.target.value);
  };

  // Chronic conditions state
  const handleConditionChange = (key: string) => {
    if (key === 'none') {
      setForm((prev) => {
        const updated = { ...prev, chronicConditions: ['none'] };
        setTimeout(() => handleTriageHook(), 0);
        return updated;
      });
    } else {
      setForm((prev) => {
        const prevConds = prev.chronicConditions;
        const newList = prevConds.includes(key)
          ? prevConds.filter((c) => c !== key)
          : [...prevConds.filter((c) => c !== 'none'), key];
        const updated = { ...prev, chronicConditions: newList };
        setTimeout(() => handleTriageHook(), 0);
        return updated;
      });
    }
  };

  // Add selected medication to form state
  const handleAddMedication = (med: string) => {
    if (med && !form.medications.includes(med)) {
      setForm((prev) => {
        const updated = { ...prev, medications: [...prev.medications, med] };
        setTimeout(() => handleTriageHook(), 0);
        return updated;
      });
      setMedicationInput('');
      setMedicationSuggestions([]);
    }
  };
  const handleRemoveMedication = (med: string) => {
    setForm((prev) => {
      const updated = { ...prev, medications: prev.medications.filter((m) => m !== med) };
      setTimeout(() => handleTriageHook(), 0);
      return updated;
    });
  };

  // Validation for Step 3
  const validateMedicalHistory = () => {
    let valid = true;
    const newErrors: { [key: string]: string } = {};
    // At least one condition must be selected
    if (!form.chronicConditions.length) {
      newErrors.chronicConditions = 'Please select at least one condition or "None".';
      valid = false;
    }
    // If a condition is selected (not 'none'), at least one medication is optional (not required)
    // (Add more validation here if needed)
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return valid;
  };

  // Step 3: Medical History
  const renderMedicalHistoryStep = () => (
    <div>
      <div className="flex items-center mb-2" aria-label="Progress Bar">
        <div className="flex-1 h-2 bg-gray-200 rounded">
          <div
            className="h-2 bg-blue-600 rounded"
            style={{ width: `${((step + 1) / 4) * 100}%` }}
            aria-valuenow={((step + 1) / 4) * 100}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
          />
        </div>
        <span className="ml-2 text-sm text-gray-600">Step 3 of 4</span>
      </div>
      <h2 className="text-xl font-bold mb-2">Step 3 of 4: Medical History</h2>
      <p className="text-gray-600 mb-4">Select any chronic conditions you have. (Select "None" if you have no chronic conditions.)</p>
      <div className="mb-6">
        <fieldset aria-labelledby="chronic-conditions-legend" aria-describedby="chronic-conditions-desc">
          <legend id="chronic-conditions-legend" className="block text-sm font-medium mb-2">Chronic Conditions</legend>
          <span id="chronic-conditions-desc" className="sr-only">Select all that apply. If you have no chronic conditions, select None.</span>
          <div className="flex flex-wrap gap-3">
            {chronicConditions.map((cond) => (
              <label key={cond.key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="chronicConditions"
                  value={cond.key}
                  checked={form.chronicConditions.includes(cond.key)}
                  onChange={() => handleConditionChange(cond.key)}
                  disabled={cond.key === 'none' ? form.chronicConditions.length > 0 && !form.chronicConditions.includes('none') : form.chronicConditions.includes('none')}
                  className="accent-blue-600"
                  aria-checked={form.chronicConditions.includes(cond.key)}
                  aria-labelledby={`chronic-conditions-legend chronic-label-${cond.key}`}
                  aria-describedby={errors.chronicConditions ? 'chronic-conditions-error' : undefined}
                />
                <span id={`chronic-label-${cond.key}`}>{cond.label}</span>
              </label>
            ))}
          </div>
          {errors.chronicConditions && (
            <span id="chronic-conditions-error" className="text-xs text-red-600 block mt-2">{errors.chronicConditions}</span>
          )}
        </fieldset>
      </div>
      {/* Progressive disclosure: show follow-up only if a condition is selected (not 'none') */}
      {form.chronicConditions.length > 0 && !form.chronicConditions.includes('none') && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" htmlFor="medication-input">Medications</label>
          <div className="flex items-center space-x-2 mb-2">
            <input
              id="medication-input"
              type="text"
              value={medicationInput}
              onChange={handleMedicationInputChange}
              className="border rounded px-3 py-2 flex-1"
              placeholder="Start typing medication name..."
              aria-label="Medication name"
              aria-autocomplete="list"
              aria-controls="medication-suggestions"
            />
            <button
              type="button"
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
              onClick={() => handleAddMedication(medicationInput)}
              disabled={!medicationInput}
              aria-label="Add medication"
            >
              Add
            </button>
          </div>
          {/* Medication suggestions */}
          {medicationSuggestions.length > 0 && (
            <ul id="medication-suggestions" className="border rounded bg-white shadow p-2 mb-2" role="listbox">
              {medicationSuggestions.map((sug) => (
                <li
                  key={sug}
                  className="cursor-pointer hover:bg-blue-50 px-2 py-1"
                  onClick={() => handleAddMedication(sug)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMedication(sug)}
                  aria-label={`Select ${sug}`}
                  role="option"
                >
                  {sug}
                </li>
              ))}
            </ul>
          )}
          {/* List of added medications */}
          {form.medications.length > 0 && (
            <ul className="flex flex-wrap gap-2 mt-2">
              {form.medications.map((med) => (
                <li key={med} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center">
                  {med}
                  <button
                    type="button"
                    className="ml-2 text-red-600 hover:text-red-800"
                    onClick={() => handleRemoveMedication(med)}
                    aria-label={`Remove ${med}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex justify-end mt-6 space-x-2">
        <button
          type="button"
          className="bg-gray-200 text-gray-700 px-6 py-2 rounded shadow hover:bg-gray-300"
          onClick={() => {
            setForm((prev) => ({ ...prev, chronicConditions: [], medications: [] }));
            setStep(step + 1);
          }}
          aria-label="Skip Medical History"
        >
          Skip
        </button>
        <button
          type="button"
          className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
          onClick={() => {
            if (validateMedicalHistory()) setStep(step + 1);
          }}
          aria-label="Next Step"
        >
          Next
        </button>
      </div>
    </div>
  );

  // Submission state
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [offlineQueued, setOfflineQueued] = useState(false);

  // Final validation for Step 4
  const validateVitalSigns = () => {
    let valid = true;
    const newErrors: { [key: string]: string } = {};
    // Example: Require at least one vital sign or symptom
    if (!form.temperature && !form.heartRate && !form.bloodPressure && !form.respiratoryRate && !form.spo2) {
      newErrors.vitalSigns = 'Please enter at least one vital sign.';
      valid = false;
    }
    // Example: Require at least one symptom slider or timing field
    if (!form.pain && !form.nausea && !form.onset && !form.duration && !form.frequency) {
      newErrors.symptoms = 'Please provide at least one symptom detail.';
      valid = false;
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return valid;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setOfflineQueued(false);
    if (!validateVitalSigns()) return;
    // If offline, store in IndexedDB and show message
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await addSubmission(form);
      setOfflineQueued(true);
      setSubmitted(true);
      return;
    }
    // Trigger triage/AI with all form data
    try {
      // Example: smartTriage(form);
      setSubmitted(true);
    } catch (err) {
      setSubmitError('An error occurred while submitting. Please try again.');
    }
  };

  // Background sync: try to send queued submissions when back online
  useEffect(() => {
    const syncQueuedSubmissions = async () => {
      if (typeof window === 'undefined') return;
      if (!navigator.onLine) return;
      const queued = await getAllSubmissions();
      for (const sub of queued) {
        try {
          // TODO: Replace with real API call to Supabase
          // await sendToSupabase(sub);
          await deleteSubmission(sub.id);
        } catch (err) {
          // If sync fails, keep in queue
        }
      }
    };
    window.addEventListener('online', syncQueuedSubmissions);
    return () => window.removeEventListener('online', syncQueuedSubmissions);
  }, []);

  // Vital signs config (with normal ranges)
  const vitalSigns = [
    { key: 'temperature', label: 'Temperature (°C)', min: 35, max: 42, normal: '36.5–37.5' },
    { key: 'heartRate', label: 'Heart Rate (bpm)', min: 30, max: 200, normal: '60–100' },
    { key: 'bloodPressure', label: 'Blood Pressure (mmHg)', min: 60, max: 200, normal: '120/80' },
    { key: 'respiratoryRate', label: 'Respiratory Rate (breaths/min)', min: 8, max: 40, normal: '12–20' },
    { key: 'spo2', label: 'SpO₂ (%)', min: 70, max: 100, normal: '≥95' },
  ];
  // Symptom severity config
  const symptomSliders = [
    { key: 'pain', label: 'Pain', min: 0, max: 10 },
    { key: 'nausea', label: 'Nausea', min: 0, max: 10 },
    // Add more symptoms as needed
  ];

  // Step 4: Vital Signs & Symptom Severity
  const renderVitalSignsStep = () => (
    <form onSubmit={handleSubmit} autoComplete="on" aria-label="Vital Signs and Symptom Severity Form">
      <div className="flex items-center mb-2" aria-label="Progress Bar">
        <div className="flex-1 h-2 bg-gray-200 rounded">
          <div
            className="h-2 bg-blue-600 rounded"
            style={{ width: `${((step + 1) / 4) * 100}%` }}
            aria-valuenow={((step + 1) / 4) * 100}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
          />
        </div>
        <span className="ml-2 text-sm text-gray-600">Step 4 of 4</span>
      </div>
      <h2 className="text-xl font-bold mb-2">Step 4 of 4: Vital Signs & Symptom Severity</h2>
      <p className="text-gray-600 mb-4">Enter your vital signs and describe your symptoms.</p>
      {/* Vital Signs */}
      <div className="mb-6">
        <fieldset aria-labelledby="vitals-legend">
          <legend id="vitals-legend" className="block text-sm font-medium mb-2">Vital Signs <span className="text-xs text-gray-500">(Normal ranges shown)</span></legend>
          <div className="space-y-4">
            {vitalSigns.map((vs) => (
              <div key={vs.key} className="flex items-center gap-2">
                <label htmlFor={vs.key} className="w-40 text-sm font-medium">{vs.label}</label>
                <input
                  id={vs.key}
                  name={vs.key}
                  type="number"
                  min={vs.min}
                  max={vs.max}
                  value={form[vs.key] || ''}
                  onChange={handleChange}
                  className="border rounded px-3 py-2 w-32"
                  aria-label={vs.label}
                  aria-describedby={`${vs.key}-normal`}
                />
                <span id={`${vs.key}-normal`} className="text-xs text-gray-500">Normal: {vs.normal}</span>
              </div>
            ))}
          </div>
          {errors.vitalSigns && (
            <span className="text-xs text-red-600 block mt-2">{errors.vitalSigns}</span>
          )}
        </fieldset>
      </div>
      {/* Symptom Severity Sliders */}
      <div className="mb-6">
        <fieldset aria-labelledby="symptom-legend">
          <legend id="symptom-legend" className="block text-sm font-medium mb-2">Symptom Severity</legend>
          <div className="space-y-4">
            {symptomSliders.map((sym) => (
              <div key={sym.key} className="flex items-center gap-4">
                <label htmlFor={sym.key} className="w-32 text-sm font-medium">{sym.label}</label>
                <input
                  id={sym.key}
                  name={sym.key}
                  type="range"
                  min={sym.min}
                  max={sym.max}
                  value={form[sym.key] || 0}
                  onChange={handleChange}
                  className="w-40 accent-blue-600"
                  aria-label={sym.label}
                />
                <span className="text-sm w-8 text-center">{form[sym.key] || 0}</span>
              </div>
            ))}
          </div>
          {errors.symptoms && (
            <span className="text-xs text-red-600 block mt-2">{errors.symptoms}</span>
          )}
        </fieldset>
      </div>
      {/* Temporal Pattern Fields */}
      <div className="mb-6">
        <fieldset aria-labelledby="temporal-legend">
          <legend id="temporal-legend" className="block text-sm font-medium mb-2">Symptom Timing</legend>
          <div className="space-y-2">
            <div>
              <label htmlFor="onset" className="block text-sm font-medium">Onset (When did it start?)</label>
              <input
                id="onset"
                name="onset"
                type="text"
                value={form.onset || ''}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="e.g., 2 days ago"
                aria-label="Onset"
              />
            </div>
            <div>
              <label htmlFor="duration" className="block text-sm font-medium">Duration</label>
              <input
                id="duration"
                name="duration"
                type="text"
                value={form.duration || ''}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="e.g., 3 hours"
                aria-label="Duration"
              />
            </div>
            <div>
              <label htmlFor="frequency" className="block text-sm font-medium">Frequency</label>
              <input
                id="frequency"
                name="frequency"
                type="text"
                value={form.frequency || ''}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="e.g., every 30 minutes"
                aria-label="Frequency"
              />
            </div>
          </div>
        </fieldset>
      </div>
      {/* Interactive Body Map (scaffolded) */}
      <div className="mb-6">
        <fieldset aria-labelledby="bodymap-legend">
          <legend id="bodymap-legend" className="block text-sm font-medium mb-2">Symptom Location</legend>
          <div className="bg-gray-100 rounded p-4 flex flex-col items-center">
            <span className="text-gray-500 text-sm mb-2">(Interactive body map coming soon)</span>
            <svg width="80" height="120" viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="20" r="12" fill="#cbd5e1" />
              <rect x="30" y="32" width="20" height="40" rx="10" fill="#cbd5e1" />
              <rect x="20" y="72" width="40" height="30" rx="10" fill="#cbd5e1" />
            </svg>
          </div>
        </fieldset>
      </div>
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">{submitError}</div>
      )}
      <div className="flex justify-end mt-6">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
          aria-label="Submit Check-In"
        >
          Submit
        </button>
      </div>
    </form>
  );

  // Main render
  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow-md mt-6" aria-label="Patient Check-In Form">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Patient Check-In</h2>
        <div className="flex items-center mb-2" aria-label="Progress Bar">
          <div className="flex-1 h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-blue-600 rounded"
              style={{ width: `${progress}%` }}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            />
          </div>
          <span className="ml-2 text-sm text-gray-600">Step 1 of 4</span>
        </div>
        <p className="text-gray-600">Demographics & Contact</p>
      </div>
      {/* QR Landing (scaffolded) */}
      <div className="mb-4">
        <button
          className="text-blue-600 underline text-sm"
          onClick={() => handleQRScan({})}
          aria-label="Scan QR to autofill"
        >
          Scan QR to autofill (coming soon)
        </button>
      </div>
      <form className="space-y-4" autoComplete="on" aria-label="Demographics and Contact Form">
        <div className="flex space-x-2">
          <div className="flex-1">
            <label htmlFor="firstName" className="block text-sm font-medium">First Name</label>
            <input
              ref={firstNameRef}
              id="firstName"
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full border rounded px-3 py-2 ${errors.firstName && touched.firstName ? 'border-red-500' : ''}`}
              autoComplete="given-name"
              aria-required="true"
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
              required
            />
            {errors.firstName && touched.firstName && (
              <span id="firstName-error" className="text-xs text-red-600">{errors.firstName}</span>
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="lastName" className="block text-sm font-medium">Last Name</label>
            <input
              id="lastName"
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full border rounded px-3 py-2 ${errors.lastName && touched.lastName ? 'border-red-500' : ''}`}
              autoComplete="family-name"
              aria-required="true"
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? 'lastName-error' : undefined}
              required
            />
            {errors.lastName && touched.lastName && (
              <span id="lastName-error" className="text-xs text-red-600">{errors.lastName}</span>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="dob" className="block text-sm font-medium">Date of Birth</label>
          <div className="flex space-x-2" id="dob">
            <select
              name="dobDay"
              value={form.dobDay}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`border rounded px-2 py-2 ${errors.dobDay && touched.dobDay ? 'border-red-500' : ''}`}
              aria-required="true"
              aria-invalid={!!errors.dobDay}
              aria-describedby={errors.dobDay ? 'dobDay-error' : undefined}
              required
            >
              <option value="">Day</option>
              {getDays().map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              name="dobMonth"
              value={form.dobMonth}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`border rounded px-2 py-2 ${errors.dobMonth && touched.dobMonth ? 'border-red-500' : ''}`}
              aria-required="true"
              aria-invalid={!!errors.dobMonth}
              aria-describedby={errors.dobMonth ? 'dobMonth-error' : undefined}
              required
            >
              <option value="">Month</option>
              {getMonths().map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              name="dobYear"
              value={form.dobYear}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`border rounded px-2 py-2 ${errors.dobYear && touched.dobYear ? 'border-red-500' : ''}`}
              aria-required="true"
              aria-invalid={!!errors.dobYear}
              aria-describedby={errors.dobYear ? 'dobYear-error' : undefined}
              required
            >
              <option value="">Year</option>
              {getYears().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {(errors.dobDay && touched.dobDay) && <span id="dobDay-error" className="text-xs text-red-600">{errors.dobDay}</span>}
          {(errors.dobMonth && touched.dobMonth) && <span id="dobMonth-error" className="text-xs text-red-600">{errors.dobMonth}</span>}
          {(errors.dobYear && touched.dobYear) && <span id="dobYear-error" className="text-xs text-red-600">{errors.dobYear}</span>}
        </div>
        <div>
          <label htmlFor="gender" className="block text-sm font-medium">Gender</label>
          <select
            id="gender"
            name="gender"
            value={form.gender}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full border rounded px-3 py-2 ${errors.gender && touched.gender ? 'border-red-500' : ''}`}
            aria-required="true"
            aria-invalid={!!errors.gender}
            aria-describedby={errors.gender ? 'gender-error' : undefined}
            required
          >
            <option value="">Select</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          {errors.gender && touched.gender && (
            <span id="gender-error" className="text-xs text-red-600">{errors.gender}</span>
          )}
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium">Phone</label>
          <input
            id="phone"
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full border rounded px-3 py-2 ${errors.phone && touched.phone ? 'border-red-500' : ''}`}
            autoComplete="tel"
            aria-required="true"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            required
          />
          {errors.phone && touched.phone && (
            <span id="phone-error" className="text-xs text-red-600">{errors.phone}</span>
          )}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full border rounded px-3 py-2 ${errors.email && touched.email ? 'border-red-500' : ''}`}
            autoComplete="email"
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            required
          />
          {errors.email && touched.email && (
            <span id="email-error" className="text-xs text-red-600">{errors.email}</span>
          )}
        </div>
        <div className="flex justify-end mt-6">
          <button
            type="button"
            className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
            onClick={handleNext}
            aria-label="Next Step"
          >
            Next
          </button>
        </div>
      </form>
      {/* Step 2: Age-Aware Flows */}
      {step === 1 && (
        <div>
          <div className="mb-4">
            <div className="flex items-center mb-2" aria-label="Progress Bar">
              <div className="flex-1 h-2 bg-gray-200 rounded">
                <div
                  className="h-2 bg-blue-600 rounded"
                  style={{ width: `${((step + 1) / 4) * 100}%` }}
                  aria-valuenow={((step + 1) / 4) * 100}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  role="progressbar"
                />
              </div>
              <span className="ml-2 text-sm text-gray-600">Step 2 of 4</span>
            </div>
            <h2 className="text-xl font-bold">Step 2 of 4: Age-Aware Questions</h2>
            <p className="text-gray-600">Questions tailored to the patient's age group.</p>
            <div className="mt-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                Age Group: {ageGroup ? ageGroup.charAt(0).toUpperCase() + ageGroup.slice(1) : 'Unknown'}
              </span>
            </div>
          </div>
          {renderAgeAwareSection()}
          <div className="flex justify-end mt-6">
            <button
              type="button"
              className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
              onClick={() => setStep(step + 1)}
              aria-label="Next Step"
            >
              Next
            </button>
          </div>
        </div>
      )}
      {step === 2 && renderMedicalHistoryStep()}
      {step === 3 && !submitted && renderVitalSignsStep()}
      {step === 3 && submitted && (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-green-700">Check-In Complete!</h2>
          <p className="text-gray-700 mb-4">Thank you for completing your digital intake. Your information has been securely submitted.</p>
          <span className="text-4xl">🎉</span>
          {offlineQueued && (
            <div className="mt-4 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3">
              You were offline. Your submission has been saved and will be synced automatically when you are back online.
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 