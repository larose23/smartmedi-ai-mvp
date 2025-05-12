import type { TriageRequest } from '@/types/triage';
import { EnhancedTriageRule } from './enhancedTriageRules';

/**
 * Pediatric-specific triage rules
 * 
 * These rules focus on special considerations for existing conditions in children
 * and can be incorporated alongside other domains in the main triage system.
 */
export const pediatricTriageRules: EnhancedTriageRule[] = [
  {
    id: 'PED-1',
    name: 'Pediatric Fever - Infant',
    category: 'Pediatric',
    weight: 9,
    match: (input) => {
      const age = input.age || 0;
      const hasFever = input.symptoms.some(s => s.toLowerCase().includes('fever')) || 
                      (input.vitals?.temperature !== undefined && input.vitals.temperature > 38);
      
      // Infants under 3 months with fever require urgent assessment
      return hasFever && age < 0.25; // 3 months = 0.25 years
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Pediatrics', type: 'primary' },
        { name: 'Emergency Medicine', type: 'secondary' }
      ],
      explain: 'Fever in infant under 3 months: High risk for serious bacterial infection. Requires immediate full septic workup.',
      confidence: 0.95
    }
  },
  {
    id: 'PED-2',
    name: 'Pediatric Respiratory Distress',
    category: 'Pediatric',
    weight: 9,
    match: (input) => {
      const age = input.age || 0;
      const isPediatric = age < 18;
      
      // Signs of respiratory distress in children
      const respiratoryDistress = input.symptoms.some(s => 
        s.toLowerCase().includes('respiratory distress') || 
        s.toLowerCase().includes('breathing difficulty') ||
        s.toLowerCase().includes('retractions') ||
        s.toLowerCase().includes('grunting') ||
        s.toLowerCase().includes('nasal flaring')
      );
      
      // Different normal respiratory rate values based on age
      let abnormalRR = false;
      const rr = input.vitals?.respiratoryRate;
      
      if (rr !== undefined) {
        if (age < 1 && (rr > 60 || rr < 30)) abnormalRR = true;
        else if (age < 3 && (rr > 40 || rr < 24)) abnormalRR = true;
        else if (age < 6 && (rr > 34 || rr < 22)) abnormalRR = true;
        else if (age < 12 && (rr > 30 || rr < 20)) abnormalRR = true;
        else if (age < 18 && (rr > 20 || rr < 12)) abnormalRR = true;
      }
      
      return isPediatric && (respiratoryDistress || abnormalRR);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Pediatrics', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Pediatric respiratory distress with abnormal respiratory rate for age. Children can decompensate rapidly.',
      confidence: 0.9
    }
  },
  {
    id: 'PED-3',
    name: 'Pediatric Dehydration',
    category: 'Pediatric',
    weight: 8,
    match: (input) => {
      const age = input.age || 0;
      const isPediatric = age < 18;
      
      // Signs of dehydration
      const dehydrationSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('dehydration') || 
        s.toLowerCase().includes('dry mouth') ||
        s.toLowerCase().includes('sunken eyes') ||
        s.toLowerCase().includes('decreased urine') ||
        s.toLowerCase().includes('no tears') ||
        s.toLowerCase().includes('sunken fontanelle')
      );
      
      // Vomiting and diarrhea increase risk
      const gastroenteritis = input.symptoms.some(s => 
        s.toLowerCase().includes('vomiting') || 
        s.toLowerCase().includes('diarrhea')
      );
      
      return isPediatric && dehydrationSigns && gastroenteritis;
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Pediatrics', type: 'primary' },
        { name: 'Emergency Medicine', type: 'secondary' }
      ],
      explain: 'Pediatric dehydration with gastroenteritis. Children dehydrate more quickly than adults and require prompt fluid assessment.',
      confidence: 0.85
    }
  },
  {
    id: 'PED-4',
    name: 'Pediatric Congenital Heart Disease',
    category: 'Pediatric',
    weight: 8,
    match: (input) => {
      const age = input.age || 0;
      const isPediatric = age < 18;
      
      // Known congenital heart disease
      const knownCHD = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('congenital heart') || 
        h.toLowerCase().includes('chd') ||
        h.toLowerCase().includes('asd') ||
        h.toLowerCase().includes('vsd') ||
        h.toLowerCase().includes('tetralogy') ||
        h.toLowerCase().includes('hypoplastic')
      );
      
      // Concerning symptoms in a child with CHD
      const concerningSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('breathing difficulty') || 
        s.toLowerCase().includes('cyanosis') ||
        s.toLowerCase().includes('syncope') ||
        s.toLowerCase().includes('fatigue') ||
        s.toLowerCase().includes('poor feeding')
      );
      
      return isPediatric && knownCHD && concerningSymptoms;
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Pediatric Cardiology', type: 'primary' },
        { name: 'Pediatrics', type: 'secondary' }
      ],
      explain: 'Pediatric patient with known congenital heart disease and concerning symptoms. Requires specialized cardiac evaluation.',
      confidence: 0.9
    }
  },
  {
    id: 'PED-5',
    name: 'Pediatric Asthma Exacerbation',
    category: 'Pediatric',
    weight: 7,
    match: (input) => {
      const age = input.age || 0;
      const isPediatric = age < 18;
      
      // Known asthma
      const asthmaHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('asthma')
      );
      
      // Asthma symptoms
      const asthmaSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('wheezing') || 
        s.toLowerCase().includes('shortness of breath') ||
        s.toLowerCase().includes('breathing difficulty') ||
        s.toLowerCase().includes('cough')
      );
      
      return isPediatric && asthmaHistory && asthmaSymptoms;
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Pediatrics', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Pediatric asthma exacerbation. Children may deteriorate rapidly and require early intervention.',
      confidence: 0.85
    }
  },
  {
    id: 'PED-6',
    name: 'Pediatric Diabetes',
    category: 'Pediatric',
    weight: 8,
    match: (input) => {
      const age = input.age || 0;
      const isPediatric = age < 18;
      
      // Known diabetes or new onset
      const diabetesHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('diabetes') ||
        h.toLowerCase().includes('type 1')
      );
      
      // Concerning symptoms for DKA
      const dkaSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('vomiting') || 
        s.toLowerCase().includes('abdominal pain') ||
        s.toLowerCase().includes('dehydration') ||
        s.toLowerCase().includes('polyuria') ||
        s.toLowerCase().includes('polydipsia')
      );
      
      const highGlucose = input.vitals?.glucose !== undefined && input.vitals.glucose > 250;
      
      return isPediatric && (diabetesHistory || highGlucose) && dkaSymptoms;
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Pediatrics', type: 'primary' },
        { name: 'Endocrinology', type: 'secondary' }
      ],
      explain: 'Pediatric diabetes with possible DKA. Children can develop diabetic ketoacidosis more rapidly than adults.',
      confidence: 0.9
    }
  },
  {
    id: 'PED-7',
    name: 'Pediatric Seizure',
    category: 'Pediatric',
    weight: 8,
    match: (input) => {
      const age = input.age || 0;
      const isPediatric = age < 18;
      
      // Seizure or post-ictal
      const seizure = input.symptoms.some(s => 
        s.toLowerCase().includes('seizure') || 
        s.toLowerCase().includes('convulsion') ||
        s.toLowerCase().includes('post-ictal')
      );
      
      // First-time seizure is more concerning
      const knownEpilepsy = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('epilepsy') || 
        h.toLowerCase().includes('seizure disorder')
      );
      
      // Fever can trigger febrile seizures in young children
      const fever = input.symptoms.some(s => s.toLowerCase().includes('fever')) || 
                   (input.vitals?.temperature !== undefined && input.vitals.temperature > 38);
      
      const firstSeizure = seizure && !knownEpilepsy;
      const febrileSeizure = seizure && fever && age < 6;
      
      return isPediatric && (firstSeizure || febrileSeizure);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Pediatrics', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Pediatric seizure: first-time or febrile seizure requires evaluation. May indicate serious underlying conditions.',
      confidence: 0.85
    }
  },
  {
    id: 'PED-8',
    name: 'Pediatric Ingestion/Poisoning',
    category: 'Pediatric',
    weight: 9,
    match: (input) => {
      const age = input.age || 0;
      const isPediatric = age < 18;
      
      // Ingestion or poisoning
      const ingestion = input.symptoms.some(s => 
        s.toLowerCase().includes('ingestion') || 
        s.toLowerCase().includes('poisoning') ||
        s.toLowerCase().includes('swallowed') ||
        s.toLowerCase().includes('overdose')
      );
      
      // Higher risk in younger children
      return isPediatric && ingestion;
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Pediatrics', type: 'primary' },
        { name: 'Emergency Medicine', type: 'secondary' }
      ],
      explain: 'Pediatric ingestion/poisoning. Children are more vulnerable to toxic effects. Requires prompt evaluation and possible intervention.',
      confidence: 0.9
    }
  },
  {
    id: 'PED-9',
    name: 'Pediatric Rash with Fever',
    category: 'Pediatric',
    weight: 7,
    match: (input) => {
      const age = input.age || 0;
      const isPediatric = age < 18;
      
      // Rash
      const rash = input.symptoms.some(s => 
        s.toLowerCase().includes('rash') || 
        s.toLowerCase().includes('petechiae') ||
        s.toLowerCase().includes('purpura')
      );
      
      // Fever
      const fever = input.symptoms.some(s => s.toLowerCase().includes('fever')) || 
                   (input.vitals?.temperature !== undefined && input.vitals.temperature > 38);
      
      // Concerning additional symptoms
      const concerningSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('lethargy') || 
        s.toLowerCase().includes('headache') ||
        s.toLowerCase().includes('stiff neck') ||
        s.toLowerCase().includes('non-blanching')
      );
      
      return isPediatric && rash && fever && (age < 2 || concerningSymptoms);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Pediatrics', type: 'primary' },
        { name: 'Infectious Diseases', type: 'secondary' }
      ],
      explain: 'Pediatric rash with fever. May indicate serious infection like meningococcemia in children, especially with concerning features.',
      confidence: 0.85
    }
  },
  {
    id: 'PED-10',
    name: 'Pediatric Sickle Cell Crisis',
    category: 'Pediatric',
    weight: 8,
    match: (input) => {
      const age = input.age || 0;
      const isPediatric = age < 18;
      
      // Known sickle cell disease
      const sickleCellDisease = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('sickle cell') || 
        h.toLowerCase().includes('scd') ||
        h.toLowerCase().includes('hbs') ||
        h.toLowerCase().includes('hemoglobin s')
      );
      
      // Pain crisis symptoms
      const painCrisis = input.symptoms.some(s => 
        s.toLowerCase().includes('pain') || 
        s.toLowerCase().includes('crisis') ||
        s.toLowerCase().includes('chest') ||
        s.toLowerCase().includes('abdomen') ||
        s.toLowerCase().includes('joints')
      );
      
      return isPediatric && sickleCellDisease && painCrisis;
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Pediatrics', type: 'primary' },
        { name: 'Hematology', type: 'secondary' }
      ],
      explain: 'Pediatric sickle cell crisis. Requires prompt pain management and evaluation for complications.',
      confidence: 0.9
    }
  }
]; 