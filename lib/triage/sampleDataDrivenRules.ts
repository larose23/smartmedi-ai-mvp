import { TriageRuleDefinition } from './ruleDefinitions';

export const highRiskChestPainRule: TriageRuleDefinition = {
  id: 'CHEST-PAIN-HIGH-RISK',
  name: 'High-Risk Chest Pain Assessment',
  description: 'Identifies potentially life-threatening chest pain presentations',
  clinicalCategory: ['cardiac', 'emergency', 'critical-care'],
  severity: 'emergent',
  evidenceLevel: 'A',
  evidenceSource: [
    {
      citation: 'AHA/ACC Guidelines for Management of Patients With STEMI (2022)',
      url: 'https://www.acc.org/guidelines/stemi-2022',
    },
    {
      citation: 'ESC Guidelines for the management of acute coronary syndromes (2023)',
      url: 'https://www.escardio.org/guidelines/acs-2023',
    },
  ],
  condition: {
    type: 'composite',
    operator: 'AND',
    conditions: [
      {
        type: 'symptom',
        symptomId: 'chest pain',
        presence: true,
      },
      {
        type: 'composite',
        operator: 'OR',
        conditions: [
          {
            type: 'vital',
            vitalId: 'systolicBP',
            comparator: '<',
            value: 90,
            weight: 2.5,
          },
          {
            type: 'vital',
            vitalId: 'heartRate',
            comparator: '>',
            value: 120,
            weight: 1.5,
          },
          {
            type: 'symptom',
            symptomId: 'syncope',
            presence: true,
            weight: 2.0,
          },
          {
            type: 'symptom',
            symptomId: 'diaphoresis',
            presence: true,
            weight: 1.0,
          },
          {
            type: 'riskFactor',
            factor: 'prior mi',
            presence: true,
            weight: 1.2,
          },
          {
            type: 'demographic',
            attribute: 'age',
            comparator: '>=',
            value: 65,
            weight: 1.0,
          },
        ],
      },
    ],
  },
  exceptions: [
    {
      type: 'symptom',
      symptomId: 'chest pain',
      presence: true,
      qualifiers: {
        reproduction: 'with-movement',
        character: 'sharp',
        duration: '<5-minutes',
      },
      modifiers: {
        boolean: true,
        confidence: 0.8,
      },
    },
  ],
  outcome: {
    triageLevel: 1,
    recommendedActions: [
      {
        action: 'ECG',
        timeframe: { value: 10, unit: 'minutes', target: 10 },
        priority: 'stat',
      },
      {
        action: 'cardiac-enzyme-panel',
        timeframe: { value: 30, unit: 'minutes', target: 30 },
        priority: 'urgent',
      },
      {
        action: 'provider-assessment',
        specialty: 'emergency-medicine',
        timeframe: { value: 10, unit: 'minutes', target: 10 },
      },
    ],
    timeToProvider: { min: 0, target: 10, unit: 'minutes' },
    followUpInstructions: 'Immediate cardiac monitoring, IV access, oxygen therapy if saturation <94%',
  },
  version: '2.1.0',
  effectiveDate: new Date('2024-01-15'),
  lastReviewDate: new Date('2024-03-01'),
  reviewers: [
    {
      name: 'Dr. Sarah Chen',
      credentials: 'MD, FACEP',
      institution: 'University Medical Center',
    },
    {
      name: 'Dr. James Wilson',
      credentials: 'MD, PhD, FACC',
      institution: 'Cardiac Institute',
    },
  ],
  weight: 1.0,
  confidenceThreshold: 0.7,
}; 