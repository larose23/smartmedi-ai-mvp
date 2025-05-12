import type { TriageRequest, TriageScore, SuggestedDepartment } from '@/types/triage';

export interface TriageRuleResult {
  triageScore: TriageScore;
  priorityLevel: number;
  suggestedDepartments: SuggestedDepartment[];
  explainability: string[];
}

interface TriageRule {
  match: (input: TriageRequest) => boolean;
  result: Omit<TriageRuleResult, 'explainability'> & { explain: string };
}

const triageRules: TriageRule[] = [
  {
    match: (input) => input.symptoms.map(s => s.toLowerCase()).includes('chest pain') || input.symptoms.map(s => s.toLowerCase()).includes('shortness of breath'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [{ name: 'Emergency Medicine', type: 'primary' }],
      explain: 'Chest pain or shortness of breath triggers Critical triage and Emergency Medicine referral.'
    }
  },
  {
    match: (input) => input.symptoms.map(s => s.toLowerCase()).includes('sudden vision loss'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Ophthalmology', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Sudden vision loss triggers Critical triage and Ophthalmology/Neurology referral.'
    }
  },
  {
    match: (input) => input.symptoms.map(s => s.toLowerCase()).some(s => ['severe trauma', 'car accident', 'fall from height'].includes(s)),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Trauma', type: 'primary' },
        { name: 'Emergency Medicine', type: 'secondary' }
      ],
      explain: 'Severe trauma, car accident, or fall from height triggers Critical triage and Trauma/Emergency referral.'
    }
  },
  {
    match: (input) => input.vitalSigns?.oxygenSaturation !== undefined && input.vitalSigns.oxygenSaturation < 92,
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [{ name: 'Emergency Medicine', type: 'primary' }],
      explain: 'Oxygen saturation <92% triggers Critical triage and Emergency Medicine referral.'
    }
  },
  {
    match: (input) => input.symptoms.map(s => s.toLowerCase()).includes('fainting') || input.symptoms.map(s => s.toLowerCase()).includes('syncope'),
    result: {
      triageScore: 'High',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Cardiology', type: 'primary' },
        { name: 'General Medicine', type: 'secondary' }
      ],
      explain: 'Fainting or syncope triggers High triage and Cardiology/General Medicine referral.'
    }
  },
  {
    match: (input) => input.symptoms.map(s => s.toLowerCase()).includes('severe headache') && input.symptoms.map(s => s.toLowerCase()).includes('neck stiffness'),
    result: {
      triageScore: 'High',
      priorityLevel: 2,
      suggestedDepartments: [{ name: 'Neurology', type: 'primary' }],
      explain: 'Severe headache with neck stiffness triggers High triage and Neurology referral (possible meningitis).'
    }
  },
  {
    match: (input) => {
      const symptoms = input.symptoms.map(s => s.toLowerCase());
      const age = input.dateOfBirth ? (new Date().getFullYear() - new Date(input.dateOfBirth).getFullYear()) : undefined;
      return symptoms.includes('headache') && symptoms.includes('fever') && age !== undefined && age < 3;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [{ name: 'Pediatrics', type: 'primary' }],
      explain: 'Headache and fever in a child under 3 triggers Critical triage and Pediatrics referral.'
    }
  },
  {
    match: (input) => {
      const symptoms = input.symptoms.map(s => s.toLowerCase());
      return symptoms.includes('shortness of breath') && symptoms.includes('fever');
    },
    result: {
      triageScore: 'High',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Pulmonology', type: 'primary' },
        { name: 'Infectious Diseases', type: 'secondary' }
      ],
      explain: 'Shortness of breath with fever triggers High triage and Pulmonology/Infectious Diseases referral.'
    }
  },
  {
    match: (input) => input.symptoms.map(s => s.toLowerCase()).includes('fever') && input.vitalSigns?.temperature !== undefined && input.vitalSigns.temperature > 39,
    result: {
      triageScore: 'High',
      priorityLevel: 2,
      suggestedDepartments: [{ name: 'Infectious Diseases', type: 'primary' }],
      explain: 'Fever > 39°C triggers High triage and Infectious Diseases referral.'
    }
  },
  {
    match: (input) => {
      const symptoms = input.symptoms.map(s => s.toLowerCase());
      return symptoms.includes('abdominal pain') && symptoms.includes('fever');
    },
    result: {
      triageScore: 'High',
      priorityLevel: 2,
      suggestedDepartments: [{ name: 'General Surgery', type: 'primary' }],
      explain: 'Abdominal pain with fever triggers High triage and General Surgery referral.'
    }
  },
  {
    match: (input) => input.symptoms.map(s => s.toLowerCase()).includes('ankle pain') || input.symptoms.map(s => s.toLowerCase()).includes('swelling'),
    result: {
      triageScore: 'Medium',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' },
        { name: 'Orthopedics', type: 'secondary' }
      ],
      explain: 'Ankle pain or swelling triggers Medium triage and Orthopedics referral.'
    }
  },
  {
    match: (input) => input.symptoms.map(s => s.toLowerCase()).includes('headache'),
    result: {
      triageScore: 'Low',
      priorityLevel: 4,
      suggestedDepartments: [{ name: 'Neurology', type: 'primary' }],
      explain: 'Headache triggers Low triage and Neurology referral.'
    }
  },
];

export function applyTriageRules(input: TriageRequest): TriageRuleResult {
  for (const rule of triageRules) {
    if (rule.match(input)) {
      const { explain, ...rest } = rule.result;
      return { ...rest, explainability: [explain] };
    }
  }
  // Default rule
  return {
    triageScore: 'Low',
    priorityLevel: 5,
    suggestedDepartments: [{ name: 'General Medicine', type: 'primary' }],
    explainability: ['No high-risk symptoms detected; defaulted to Low triage.']
  };
} 