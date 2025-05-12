import type { TriageRequest } from '@/types/triage';
import { EnhancedTriageRule } from './enhancedTriageRules';

/**
 * Geriatric-specific triage rules
 * 
 * These rules focus on special considerations for existing conditions in elderly patients
 * and can be incorporated alongside other domains in the main triage system.
 */
export const geriatricTriageRules: EnhancedTriageRule[] = [
  {
    id: 'GER-1',
    name: 'Geriatric Fall with Anticoagulation',
    category: 'Geriatric',
    weight: 9,
    match: (input) => {
      const age = input.age || 0;
      const isGeriatric = age >= 65;
      
      // Check for fall
      const hasFall = input.symptoms.some(s => 
        s.toLowerCase().includes('fall') || 
        s.toLowerCase().includes('fell')
      );
      
      // Check for anticoagulation therapy
      const onAnticoagulation = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('anticoagulation') ||
        h.toLowerCase().includes('warfarin') ||
        h.toLowerCase().includes('coumadin') ||
        h.toLowerCase().includes('xarelto') ||
        h.toLowerCase().includes('eliquis') ||
        h.toLowerCase().includes('apixaban') ||
        h.toLowerCase().includes('rivaroxaban') ||
        h.toLowerCase().includes('dabigatran') ||
        h.toLowerCase().includes('pradaxa') ||
        h.toLowerCase().includes('heparin')
      );
      
      return isGeriatric && hasFall && onAnticoagulation;
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Geriatric patient with fall while on anticoagulation: High risk for intracranial hemorrhage requiring urgent CT scan.',
      confidence: 0.95
    }
  },
  {
    id: 'GER-2',
    name: 'Geriatric Confusion/Delirium',
    category: 'Geriatric',
    weight: 8,
    match: (input) => {
      const age = input.age || 0;
      const isGeriatric = age >= 65;
      
      // Signs of acute confusion or delirium
      const mentalStatusChange = input.symptoms.some(s => 
        s.toLowerCase().includes('confusion') || 
        s.toLowerCase().includes('altered mental status') ||
        s.toLowerCase().includes('delirium') ||
        s.toLowerCase().includes('disoriented') ||
        s.toLowerCase().includes('agitated')
      );
      
      // Acute onset is important for delirium
      const acuteOnset = input.symptoms.some(s => 
        s.toLowerCase().includes('sudden') || 
        s.toLowerCase().includes('acute') ||
        s.toLowerCase().includes('new onset')
      );
      
      return isGeriatric && mentalStatusChange && acuteOnset;
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Geriatrics', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Acute confusion or delirium in geriatric patient: May indicate serious underlying condition like infection, stroke, or medication effect.',
      confidence: 0.9
    }
  },
  {
    id: 'GER-3',
    name: 'Geriatric Fever',
    category: 'Geriatric',
    weight: 8,
    match: (input) => {
      const age = input.age || 0;
      const isGeriatric = age >= 65;
      
      // Fever in elderly often presents differently - may have lower threshold
      const hasFever = input.symptoms.some(s => 
        s.toLowerCase().includes('fever') || 
        s.toLowerCase().includes('warm')
      ) || (input.vitals?.temperature !== undefined && input.vitals.temperature > 37.8);
      
      return isGeriatric && hasFever;
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'Geriatrics', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' }
      ],
      explain: 'Fever in geriatric patient: Elderly may have blunted fever response; even low-grade fever can indicate serious infection.',
      confidence: 0.85
    }
  },
  {
    id: 'GER-4',
    name: 'Geriatric Polypharmacy Adverse Effects',
    category: 'Geriatric',
    weight: 7,
    match: (input) => {
      const age = input.age || 0;
      const isGeriatric = age >= 65;
      
      // Adverse drug effects symptoms
      const adverseEffects = input.symptoms.some(s => 
        s.toLowerCase().includes('dizziness') || 
        s.toLowerCase().includes('unsteady') ||
        s.toLowerCase().includes('nausea') ||
        s.toLowerCase().includes('confusion') ||
        s.toLowerCase().includes('rash') ||
        s.toLowerCase().includes('falls')
      );
      
      // Recent medication change or multiple medications (if available)
      const medicationIssues = input.symptoms.some(s => 
        s.toLowerCase().includes('medication') || 
        s.toLowerCase().includes('drug') ||
        s.toLowerCase().includes('pills') ||
        s.toLowerCase().includes('prescription')
      );
      
      return isGeriatric && adverseEffects && medicationIssues;
    },
    result: {
      triageScore: 'Moderate',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'Geriatrics', type: 'primary' },
        { name: 'Clinical Pharmacy', type: 'secondary' }
      ],
      explain: 'Geriatric patient with potential adverse drug effects: Polypharmacy increases risk of drug interactions and side effects.',
      confidence: 0.8
    }
  },
  {
    id: 'GER-5',
    name: 'Geriatric Chest Pain',
    category: 'Geriatric',
    weight: 9,
    match: (input) => {
      const age = input.age || 0;
      const isGeriatric = age >= 65;
      
      // Chest pain or cardiac symptoms
      const hasChestPain = input.symptoms.some(s => 
        s.toLowerCase().includes('chest pain') || 
        s.toLowerCase().includes('chest pressure') ||
        s.toLowerCase().includes('chest tightness')
      );
      
      // Atypical presentations are common in elderly
      const atypicalSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('fatigue') || 
        s.toLowerCase().includes('weakness') ||
        s.toLowerCase().includes('shortness of breath') ||
        s.toLowerCase().includes('syncope') ||
        s.toLowerCase().includes('confusion')
      );
      
      return isGeriatric && (hasChestPain || (atypicalSymptoms && input.medicalHistory.some(h => 
        h.toLowerCase().includes('coronary') || 
        h.toLowerCase().includes('heart') ||
        h.toLowerCase().includes('cardiac')
      )));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Cardiology', type: 'primary' },
        { name: 'Emergency Medicine', type: 'secondary' }
      ],
      explain: 'Geriatric patient with chest pain or atypical cardiac symptoms: Elderly often present atypically for ACS/MI.',
      confidence: 0.9
    }
  },
  {
    id: 'GER-6',
    name: 'Geriatric Abdominal Pain',
    category: 'Geriatric',
    weight: 8,
    match: (input) => {
      const age = input.age || 0;
      const isGeriatric = age >= 65;
      
      // Abdominal pain
      const hasAbdominalPain = input.symptoms.some(s => 
        s.toLowerCase().includes('abdominal pain') || 
        s.toLowerCase().includes('belly pain') ||
        s.toLowerCase().includes('stomach pain')
      );
      
      return isGeriatric && hasAbdominalPain;
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Gastroenterology', type: 'secondary' }
      ],
      explain: 'Geriatric patient with abdominal pain: Elderly may have serious conditions like mesenteric ischemia or AAA with minimal symptoms.',
      confidence: 0.85
    }
  },
  {
    id: 'GER-7',
    name: 'Geriatric Urinary Tract Infection',
    category: 'Geriatric',
    weight: 7,
    match: (input) => {
      const age = input.age || 0;
      const isGeriatric = age >= 65;
      
      // Classic UTI symptoms
      const classicUTISymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('dysuria') || 
        s.toLowerCase().includes('urinary frequency') ||
        s.toLowerCase().includes('burning urination') ||
        s.toLowerCase().includes('urgency')
      );
      
      // Atypical UTI presentations in elderly
      const atypicalUTISymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('confusion') || 
        s.toLowerCase().includes('falls') ||
        s.toLowerCase().includes('altered mental status') ||
        s.toLowerCase().includes('decreased appetite') ||
        s.toLowerCase().includes('lethargy')
      );
      
      return isGeriatric && (classicUTISymptoms || atypicalUTISymptoms);
    },
    result: {
      triageScore: 'Moderate',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'Geriatrics', type: 'primary' },
        { name: 'Urology', type: 'secondary' }
      ],
      explain: 'Geriatric patient with UTI symptoms (possibly atypical): UTIs can present as confusion or falls in elderly without typical symptoms.',
      confidence: 0.85
    }
  },
  {
    id: 'GER-8',
    name: 'Geriatric Respiratory Infection',
    category: 'Geriatric',
    weight: 8,
    match: (input) => {
      const age = input.age || 0;
      const isGeriatric = age >= 65;
      
      // Respiratory infection symptoms
      const respiratorySymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('cough') || 
        s.toLowerCase().includes('shortness of breath') ||
        s.toLowerCase().includes('sputum') ||
        s.toLowerCase().includes('rhinorrhea')
      );
      
      // Fever or low-grade fever
      const hasFever = input.symptoms.some(s => s.toLowerCase().includes('fever')) || 
                      (input.vitals?.temperature !== undefined && input.vitals.temperature > 37.5);
      
      return isGeriatric && respiratorySymptoms && hasFever;
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Geriatrics', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Geriatric patient with respiratory infection: Elderly are at higher risk for pneumonia and respiratory failure.',
      confidence: 0.85
    }
  },
  {
    id: 'GER-9',
    name: 'Geriatric Stroke Symptoms',
    category: 'Geriatric',
    weight: 10,
    match: (input) => {
      const age = input.age || 0;
      const isGeriatric = age >= 65;
      
      // Classic stroke symptoms
      const strokeSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('facial droop') || 
        s.toLowerCase().includes('arm weakness') ||
        s.toLowerCase().includes('slurred speech') ||
        s.toLowerCase().includes('numbness') ||
        s.toLowerCase().includes('hemiparesis') ||
        s.toLowerCase().includes('aphasia') ||
        s.toLowerCase().includes('vision loss')
      );
      
      // Time-sensitive
      const acuteOnset = input.symptoms.some(s => 
        s.toLowerCase().includes('sudden') || 
        s.toLowerCase().includes('acute')
      );
      
      return isGeriatric && strokeSymptoms && acuteOnset;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Neurology', type: 'primary' },
        { name: 'Emergency Medicine', type: 'secondary' }
      ],
      explain: 'Geriatric patient with acute stroke symptoms: Time-critical assessment for potential thrombolysis candidates.',
      confidence: 0.95
    }
  },
  {
    id: 'GER-10',
    name: 'Geriatric Fracture Risk',
    category: 'Geriatric',
    weight: 8,
    match: (input) => {
      const age = input.age || 0;
      const isGeriatric = age >= 65;
      
      // Trauma or fall with potential fracture
      const potentialFracture = input.symptoms.some(s => 
        s.toLowerCase().includes('fall') || 
        s.toLowerCase().includes('trauma') ||
        s.toLowerCase().includes('pain') ||
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('deformity')
      );
      
      // Osteoporosis increases risk
      const hasOsteoporosis = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('osteoporosis') || 
        h.toLowerCase().includes('osteopenia') ||
        h.toLowerCase().includes('previous fracture')
      );
      
      return isGeriatric && potentialFracture && (hasOsteoporosis || age >= 80);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Geriatrics', type: 'primary' },
        { name: 'Orthopedics', type: 'secondary' }
      ],
      explain: 'Geriatric patient with potential fracture: Elderly with osteoporosis are at high risk for fractures even with minor trauma.',
      confidence: 0.9
    }
  }
]; 