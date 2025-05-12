import { useState } from 'react';
import { z } from 'zod';

// Validation schema for triage submission
const TriageSubmissionSchema = z.object({
  patientDescription: z.string().min(1, 'Patient description is required'),
  vitals: z.object({
    heartRate: z.number().min(0).max(300),
    bloodPressure: z.object({
      systolic: z.number().min(0).max(300),
      diastolic: z.number().min(0).max(200)
    }),
    respiratoryRate: z.number().min(0).max(100),
    oxygenSaturation: z.number().min(0).max(100),
    temperature: z.number().min(30).max(45)
  }),
  vitalHistory: z.array(z.object({
    timestamp: z.string(),
    vitals: z.object({
      heartRate: z.number(),
      bloodPressure: z.object({
        systolic: z.number(),
        diastolic: z.number()
      }),
      respiratoryRate: z.number(),
      oxygenSaturation: z.number(),
      temperature: z.number()
    })
  })),
  comorbidities: z.array(z.object({
    name: z.string(),
    severity: z.enum(['mild', 'moderate', 'severe']),
    isActive: z.boolean()
  })),
  riskFactors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    weight: z.number().min(0).max(1),
    category: z.string(),
    description: z.string()
  }))
});

export type TriageSubmission = z.infer<typeof TriageSubmissionSchema>;

interface UseTriageSubmissionResult {
  submitTriage: (data: TriageSubmission) => Promise<void>;
  loading: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

export function useTriageSubmission(): UseTriageSubmissionResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitTriage = async (data: TriageSubmission) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Validate data
      TriageSubmissionSchema.parse(data);

      // Submit to API
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit triage case');
      }

      setSuccess(true);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  };

  return {
    submitTriage,
    loading,
    error,
    success,
    reset
  };
} 