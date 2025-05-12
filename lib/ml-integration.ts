import { CheckIn } from '@/types/triage';
import { DiagnosticResult } from './diagnostic-system';

interface MLModelConfig {
  modelUrl: string;
  apiKey: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface MLPrediction {
  confidence: number;
  diagnosis: string;
  risk_score: number;
  recommended_tests: string[];
  severity_prediction: {
    level: string;
    score: number;
  };
  treatment_suggestions: string[];
  prognosis: {
    short_term: string;
    long_term: string;
  };
  similar_cases: {
    case_id: string;
    similarity_score: number;
    outcome: string;
  }[];
}

export class MLModel {
  private config: MLModelConfig;
  private retryCount = 0;

  constructor(config: MLModelConfig) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  private async makeRequest(data: any): Promise<Response> {
    try {
      const response = await fetch(this.config.modelUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`ML model API error: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (this.retryCount < (this.config.maxRetries || 3)) {
        this.retryCount++;
        await new Promise(resolve => setTimeout(resolve, (this.config.retryDelay || 1000) * this.retryCount));
        return this.makeRequest(data);
      }
      throw error;
    }
  }

  async predict(checkIn: CheckIn): Promise<MLPrediction> {
    try {
      const response = await this.makeRequest({
        symptoms: {
          primary: checkIn.primary_symptom,
          additional: Array.isArray(checkIn.additional_symptoms) 
            ? checkIn.additional_symptoms 
            : checkIn.additional_symptoms.split(','),
          pain_level: checkIn.symptoms.pain_level,
          pain_location: checkIn.symptoms.pain_location,
          impact: checkIn.symptoms.impact_on_activities
        },
        medical_history: checkIn.symptoms.medical_history,
        current_symptoms: checkIn.symptoms.current_symptoms,
        patient_demographics: {
          age: checkIn.age,
          gender: checkIn.gender,
          weight: checkIn.weight,
          height: checkIn.height
        }
      });

      const data = await response.json();
      return {
        confidence: data.confidence,
        diagnosis: data.diagnosis,
        risk_score: data.risk_score,
        recommended_tests: data.recommended_tests,
        severity_prediction: data.severity_prediction,
        treatment_suggestions: data.treatment_suggestions,
        prognosis: data.prognosis,
        similar_cases: data.similar_cases
      };
    } catch (error) {
      console.error('ML prediction error:', error);
      throw error;
    }
  }

  async enhanceDiagnosis(diagnosticResult: DiagnosticResult, checkIn: CheckIn): Promise<DiagnosticResult> {
    try {
      const mlPrediction = await this.predict(checkIn);
      
      return {
        ...diagnosticResult,
        primary_diagnosis: mlPrediction.confidence > 0.8 ? mlPrediction.diagnosis : diagnosticResult.primary_diagnosis,
        differential_diagnoses: [
          ...diagnosticResult.differential_diagnoses,
          ...(mlPrediction.confidence > 0.6 ? [mlPrediction.diagnosis] : [])
        ],
        recommended_actions: [
          ...diagnosticResult.recommended_actions,
          ...mlPrediction.recommended_tests,
          ...mlPrediction.treatment_suggestions
        ],
        risk_factors: [
          ...diagnosticResult.risk_factors,
          ...(mlPrediction.risk_score > 0.7 ? ['High ML Risk Score'] : []),
          ...(mlPrediction.severity_prediction.level === 'Critical' ? ['Critical Condition Predicted'] : [])
        ],
        ml_enhancement: {
          confidence: mlPrediction.confidence,
          risk_score: mlPrediction.risk_score,
          additional_tests: mlPrediction.recommended_tests
        }
      };
    } catch (error) {
      console.error('ML enhancement error:', error);
      return diagnosticResult;
    }
  }

  async batchPredict(checkIns: CheckIn[]): Promise<MLPrediction[]> {
    try {
      const response = await this.makeRequest({
        batch: checkIns.map(checkIn => ({
          symptoms: {
            primary: checkIn.primary_symptom,
            additional: Array.isArray(checkIn.additional_symptoms) 
              ? checkIn.additional_symptoms 
              : checkIn.additional_symptoms.split(','),
            pain_level: checkIn.symptoms.pain_level,
            pain_location: checkIn.symptoms.pain_location,
            impact: checkIn.symptoms.impact_on_activities
          },
          medical_history: checkIn.symptoms.medical_history,
          current_symptoms: checkIn.symptoms.current_symptoms
        }))
      });

      return await response.json();
    } catch (error) {
      console.error('Batch prediction error:', error);
      throw error;
    }
  }
}

export const getMockMLPrediction = (checkIn: CheckIn): MLPrediction => {
  return {
    confidence: 0.85,
    diagnosis: "Acute Coronary Syndrome",
    risk_score: 0.75,
    recommended_tests: [
      "ECG",
      "Troponin levels",
      "Chest X-ray",
      "Complete blood count"
    ],
    severity_prediction: {
      level: "High",
      score: 0.8
    },
    treatment_suggestions: [
      "Immediate cardiac monitoring",
      "Administer aspirin",
      "Prepare for possible PCI",
      "Continuous oxygen therapy"
    ],
    prognosis: {
      short_term: "Stable with immediate intervention",
      long_term: "Good with proper follow-up care"
    },
    similar_cases: [
      {
        case_id: "CASE123",
        similarity_score: 0.92,
        outcome: "Successful PCI with full recovery"
      },
      {
        case_id: "CASE456",
        similarity_score: 0.88,
        outcome: "Medical management with good recovery"
      }
    ]
  };
}; 