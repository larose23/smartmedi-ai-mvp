import { describe, it, expect, vi } from 'vitest';
import { calculateTriageScore, performMLInference } from '@/app/api/triage/route';

describe('Triage System', () => {
  describe('calculateTriageScore', () => {
    it('should return High for severe pain', () => {
      const symptoms = {
        pain_level: 9,
        impact_on_activities: ['Some difficulty']
      };
      expect(calculateTriageScore(symptoms)).toBe('High');
    });

    it('should return High for severe impact', () => {
      const symptoms = {
        pain_level: 4,
        impact_on_activities: ['Unable to perform basic activities']
      };
      expect(calculateTriageScore(symptoms)).toBe('High');
    });

    it('should return Medium for moderate pain', () => {
      const symptoms = {
        pain_level: 6,
        impact_on_activities: ['Some difficulty']
      };
      expect(calculateTriageScore(symptoms)).toBe('Medium');
    });

    it('should return Low for mild symptoms', () => {
      const symptoms = {
        pain_level: 3,
        impact_on_activities: ['Minimal impact']
      };
      expect(calculateTriageScore(symptoms)).toBe('Low');
    });
  });

  describe('ML Inference', () => {
    it('should return expected ML inference results', async () => {
      const symptoms = {
        pain_level: 8,
        pain_location: 'Abdomen',
        pain_characteristics: ['Sharp', 'Constant'],
        impact_on_activities: ['Unable to perform basic activities'],
        medical_history: ['Hypertension'],
        current_symptoms: ['Nausea', 'Fever']
      };

      const result = await performMLInference(symptoms);

      expect(result).toHaveProperty('potential_diagnoses');
      expect(result).toHaveProperty('estimated_wait_minutes');
      expect(result).toHaveProperty('suggested_department');
      expect(result).toHaveProperty('risk_factors');
      expect(result).toHaveProperty('recommended_actions');

      expect(Array.isArray(result.potential_diagnoses)).toBe(true);
      expect(typeof result.estimated_wait_minutes).toBe('number');
      expect(typeof result.suggested_department).toBe('string');
      expect(Array.isArray(result.risk_factors)).toBe(true);
      expect(Array.isArray(result.recommended_actions)).toBe(true);
    });
  });

  describe('Cardiac Triage Rules', () => {
    const { applyEnhancedTriageRules } = require('@/lib/enhancedTriageRules');

    it('should detect STEMI (Suspected Acute MI)', () => {
      const input = {
        symptoms: ['chest pain', 'crushing', 'radiating to left arm'],
        medicalHistory: ['diabetes', 'coronary artery disease'],
        vitals: {},
        flags: [],
        age: 58
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('STEMI'))).toBe(true);
    });

    it('should detect High-Risk Chest Pain in elderly', () => {
      const input = {
        symptoms: ['chest pain'],
        medicalHistory: [],
        vitals: {},
        flags: [],
        age: 72
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('High-risk chest pain'))).toBe(true);
    });

    it('should detect Cardiac Arrest', () => {
      const input = {
        symptoms: [],
        medicalHistory: [],
        vitals: {},
        flags: ['cardiac_arrest'],
        age: 60
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('Cardiac arrest'))).toBe(true);
    });

    it('should detect Life-Threatening Arrhythmia', () => {
      const input = {
        symptoms: [],
        medicalHistory: [],
        vitals: {},
        flags: ['vfib'],
        age: 50
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('arrhythmia'))).toBe(true);
    });

    it('should detect Heart Failure with Respiratory Distress', () => {
      const input = {
        symptoms: ['shortness of breath', 'orthopnea'],
        medicalHistory: ['heart failure'],
        vitals: { oxygenSaturation: 88 },
        flags: [],
        age: 68
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('Heart failure'))).toBe(true);
    });

    it('should detect Hypertensive Emergency', () => {
      const input = {
        symptoms: [],
        medicalHistory: [],
        vitals: { systolicBP: 200 },
        flags: ['end_organ_damage'],
        age: 55
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('Hypertensive emergency'))).toBe(true);
    });
  });

  describe('Respiratory Triage Rules', () => {
    const { applyEnhancedTriageRules } = require('@/lib/enhancedTriageRules');

    // Critical - Priority 1 conditions
    it('should detect Acute Respiratory Failure', () => {
      const input = {
        symptoms: ['shortness of breath'],
        medicalHistory: [],
        vitals: { respiratoryRate: 32, oxygenSaturation: 88 },
        flags: [],
        age: 60
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('respiratory failure'))).toBe(true);
    });

    it('should detect Tension Pneumothorax', () => {
      const input = {
        symptoms: ['chest pain'],
        medicalHistory: [],
        vitals: {},
        flags: ['deviated_trachea'],
        age: 25
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('pneumothorax'))).toBe(true);
    });

    it('should detect Severe Asthma Exacerbation', () => {
      const input = {
        symptoms: ['asthma severe attack', 'unable to speak'],
        medicalHistory: ['asthma'],
        vitals: { respiratoryRate: 28, oxygenSaturation: 91 },
        flags: [],
        age: 40
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('asthma'))).toBe(true);
    });

    it('should detect High-Risk Pulmonary Embolism', () => {
      const input = {
        symptoms: ['pleuritic pain', 'shortness of breath'],
        medicalHistory: [],
        vitals: { heartRate: 120, oxygenSaturation: 91 },
        flags: [],
        age: 55
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('pulmonary embolism'))).toBe(true);
    });

    // Urgent - Priority 2 conditions
    it('should detect Moderate Asthma/COPD Exacerbation', () => {
      const input = {
        symptoms: ['asthma worse', 'wheezing'],
        medicalHistory: ['asthma'],
        vitals: { oxygenSaturation: 93 },
        flags: [],
        age: 45
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Urgent');
      expect(result.priorityLevel).toBe(2);
      expect(result.explainability.some(e => e.includes('asthma') || e.includes('COPD'))).toBe(true);
    });

    it('should detect Community-Acquired Pneumonia with concerning vitals', () => {
      const input = {
        symptoms: ['pneumonia', 'cough', 'fever'],
        medicalHistory: [],
        vitals: { respiratoryRate: 25 },
        flags: [],
        age: 70
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Urgent');
      expect(result.priorityLevel).toBe(2);
      expect(result.explainability.some(e => e.includes('pneumonia'))).toBe(true);
    });

    it('should detect Spontaneous Pneumothorax (stable)', () => {
      const input = {
        symptoms: ['pneumothorax', 'chest pain'],
        medicalHistory: [],
        vitals: { oxygenSaturation: 95 },
        flags: [],
        age: 30
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Urgent');
      expect(result.priorityLevel).toBe(2);
      expect(result.explainability.some(e => e.includes('pneumothorax'))).toBe(true);
    });

    it('should detect Hemoptysis with Risk Factors', () => {
      const input = {
        symptoms: ['hemoptysis', 'cough with blood'],
        medicalHistory: ['lung cancer'],
        vitals: {},
        flags: [],
        age: 65
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Urgent');
      expect(result.priorityLevel).toBe(2);
      expect(result.explainability.some(e => e.includes('Hemoptysis'))).toBe(true);
    });

    // Standard conditions
    it('should detect Mild Asthma/COPD Exacerbation', () => {
      const input = {
        symptoms: ['mild asthma symptoms', 'slight wheezing'],
        medicalHistory: ['asthma'],
        vitals: { oxygenSaturation: 96 },
        flags: [],
        age: 35
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Standard');
      expect(result.priorityLevel).toBe(3);
      expect(result.explainability.some(e => e.includes('asthma') || e.includes('COPD'))).toBe(true);
    });

    it('should detect Upper Respiratory Infection', () => {
      const input = {
        symptoms: ['upper respiratory infection', 'runny nose', 'sore throat'],
        medicalHistory: [],
        vitals: { respiratoryRate: 18, oxygenSaturation: 98 },
        flags: [],
        age: 25
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Standard');
      expect(result.priorityLevel).toBe(4);
      expect(result.explainability.some(e => e.includes('Upper respiratory infection'))).toBe(true);
    });

    it('should detect Chronic Cough (stable)', () => {
      const input = {
        symptoms: ['chronic cough', 'persists for 3 months'],
        medicalHistory: [],
        vitals: { oxygenSaturation: 97 },
        flags: [],
        age: 50
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Standard');
      expect(result.priorityLevel).toBe(5);
      expect(result.explainability.some(e => e.includes('Chronic cough'))).toBe(true);
    });
  });

  describe('Neurological Triage Rules', () => {
    const { applyEnhancedTriageRules } = require('@/lib/enhancedTriageRules');

    // Critical - Priority 1 conditions
    it('should detect Acute Stroke (FAST Positive)', () => {
      const input = {
        symptoms: ['facial droop', 'arm weakness', 'slurred speech'],
        medicalHistory: ['hypertension'],
        vitals: {},
        flags: ['onset_under_4.5h'],
        age: 72
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('stroke'))).toBe(true);
    });

    it('should detect Status Epilepticus', () => {
      const input = {
        symptoms: ['seizure continuous', 'convulsions'],
        medicalHistory: ['epilepsy'],
        vitals: {},
        flags: ['ongoing_seizure'],
        age: 35
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('Status epilepticus'))).toBe(true);
    });

    it('should detect Altered Mental Status (GCS < 9)', () => {
      const input = {
        symptoms: ['confusion', 'lethargy'],
        medicalHistory: [],
        vitals: { gcs: 8 },
        flags: [],
        age: 68
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('mental status'))).toBe(true);
    });

    it('should detect Thunderclap Headache', () => {
      const input = {
        symptoms: ['headache worst ever', 'sudden onset'],
        medicalHistory: [],
        vitals: {},
        flags: [],
        age: 45
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('Thunderclap headache'))).toBe(true);
    });

    it('should detect Acute Spinal Cord Compression', () => {
      const input = {
        symptoms: ['weakness legs', 'bladder incontinence'],
        medicalHistory: [],
        vitals: {},
        flags: [],
        age: 65
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Critical');
      expect(result.priorityLevel).toBe(1);
      expect(result.explainability.some(e => e.includes('spinal cord'))).toBe(true);
    });

    // Urgent - Priority 2 conditions
    it('should detect First-Time Seizure', () => {
      const input = {
        symptoms: ['seizure first time', 'now resolved'],
        medicalHistory: [],
        vitals: {},
        flags: [],
        age: 28
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Urgent');
      expect(result.priorityLevel).toBe(2);
      expect(result.explainability.some(e => e.includes('First-time seizure'))).toBe(true);
    });

    it('should detect Transient Ischemic Attack', () => {
      const input = {
        symptoms: ['TIA', 'stroke symptoms resolved'],
        medicalHistory: ['hypertension'],
        vitals: {},
        flags: [],
        age: 62
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Urgent');
      expect(result.priorityLevel).toBe(2);
      expect(result.explainability.some(e => e.includes('Transient Ischemic Attack'))).toBe(true);
    });

    it('should detect Migraine with Neurological Deficits', () => {
      const input = {
        symptoms: ['migraine', 'visual aura', 'numbness in right hand'],
        medicalHistory: ['migraine'],
        vitals: {},
        flags: [],
        age: 32
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Urgent');
      expect(result.priorityLevel).toBe(2);
      expect(result.explainability.some(e => e.includes('Migraine'))).toBe(true);
    });

    it('should detect Vertigo with Neurological Symptoms', () => {
      const input = {
        symptoms: ['vertigo', 'double vision', 'ataxia'],
        medicalHistory: [],
        vitals: {},
        flags: [],
        age: 58
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Urgent');
      expect(result.priorityLevel).toBe(2);
      expect(result.explainability.some(e => e.includes('Vertigo'))).toBe(true);
    });

    // Standard conditions
    it('should detect Uncomplicated Syncope in Young, Healthy Patient', () => {
      const input = {
        symptoms: ['syncope', 'fainting'],
        medicalHistory: [],
        vitals: { heartRate: 72 },
        flags: [],
        age: 22
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Standard');
      expect(result.priorityLevel).toBe(3);
      expect(result.explainability.some(e => e.includes('syncope'))).toBe(true);
    });

    it('should detect Chronic Stable Headache', () => {
      const input = {
        symptoms: ['headache chronic', 'recurring tension headache'],
        medicalHistory: ['migraines'],
        vitals: {},
        flags: [],
        age: 40
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Standard');
      expect(result.priorityLevel).toBe(4);
      expect(result.explainability.some(e => e.includes('Chronic'))).toBe(true);
    });

    it('should detect Mild Concussion', () => {
      const input = {
        symptoms: ['head injury', 'mild concussion', 'headache'],
        medicalHistory: [],
        vitals: { gcs: 15 },
        flags: [],
        age: 18
      };
      const result = applyEnhancedTriageRules(input);
      expect(result.triageScore).toBe('Standard');
      expect(result.priorityLevel).toBe(3);
      expect(result.explainability.some(e => e.includes('concussion'))).toBe(true);
    });
  });
}); 