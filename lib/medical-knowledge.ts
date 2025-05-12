interface MedicalCondition {
  name: string;
  description: string;
  symptoms: string[];
  riskFactors: string[];
  diagnosticTests: string[];
  treatments: string[];
  complications: string[];
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Critical';
  urgency: 'Immediate' | 'Urgent' | 'Routine';
  department: string;
}

interface SymptomPattern {
  name: string;
  associatedConditions: string[];
  severityIndicators: string[];
  riskFactors: string[];
  recommendedActions: string[];
}

export const MEDICAL_KNOWLEDGE: Record<string, MedicalCondition> = {
  'Acute Coronary Syndrome': {
    name: 'Acute Coronary Syndrome',
    description: 'A range of conditions associated with sudden, reduced blood flow to the heart',
    symptoms: ['chest pain', 'shortness of breath', 'nausea', 'sweating', 'lightheadedness'],
    riskFactors: ['Hypertension', 'Diabetes', 'Smoking', 'High Cholesterol', 'Family History'],
    diagnosticTests: ['ECG', 'Cardiac Enzymes', 'Chest X-ray', 'Echocardiogram'],
    treatments: ['Aspirin', 'Nitroglycerin', 'Oxygen Therapy', 'PCI if indicated'],
    complications: ['Heart Failure', 'Arrhythmias', 'Cardiac Arrest'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Cardiology'
  },
  'Stroke': {
    name: 'Stroke',
    description: 'Sudden interruption of blood supply to the brain',
    symptoms: ['facial drooping', 'arm weakness', 'speech difficulty', 'sudden headache', 'confusion'],
    riskFactors: ['Hypertension', 'Atrial Fibrillation', 'Diabetes', 'Smoking', 'Previous TIA'],
    diagnosticTests: ['CT Scan', 'MRI', 'Carotid Ultrasound', 'Blood Tests'],
    treatments: ['tPA if eligible', 'Mechanical Thrombectomy', 'Blood Pressure Control'],
    complications: ['Paralysis', 'Speech Problems', 'Memory Loss', 'Death'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Neurology'
  },
  'Pneumonia': {
    name: 'Pneumonia',
    description: 'Infection that inflames the air sacs in one or both lungs',
    symptoms: ['cough', 'fever', 'shortness of breath', 'chest pain', 'fatigue'],
    riskFactors: ['Age >65', 'Chronic Lung Disease', 'Smoking', 'Immunocompromised'],
    diagnosticTests: ['Chest X-ray', 'Blood Tests', 'Sputum Culture', 'Pulse Oximetry'],
    treatments: ['Antibiotics', 'Oxygen Therapy', 'Fluid Management', 'Chest Physiotherapy'],
    complications: ['Respiratory Failure', 'Sepsis', 'Lung Abscess'],
    severity: 'Severe',
    urgency: 'Urgent',
    department: 'Pulmonology'
  },
  'Appendicitis': {
    name: 'Appendicitis',
    description: 'Inflammation of the appendix, a small pouch attached to the large intestine',
    symptoms: ['abdominal pain', 'nausea', 'vomiting', 'fever', 'loss of appetite'],
    riskFactors: ['Age 10-30', 'Family History', 'Previous Abdominal Surgery'],
    diagnosticTests: ['Abdominal Ultrasound', 'CT Scan', 'Blood Tests', 'Physical Examination'],
    treatments: ['Appendectomy', 'Antibiotics', 'Pain Management'],
    complications: ['Peritonitis', 'Abscess Formation', 'Sepsis'],
    severity: 'Severe',
    urgency: 'Urgent',
    department: 'General Surgery'
  },
  'Asthma Attack': {
    name: 'Asthma Attack',
    description: 'Acute exacerbation of asthma causing severe breathing difficulties',
    symptoms: ['wheezing', 'shortness of breath', 'chest tightness', 'coughing', 'rapid breathing'],
    riskFactors: ['Allergies', 'Smoking', 'Respiratory Infections', 'Air Pollution'],
    diagnosticTests: ['Peak Flow Measurement', 'Spirometry', 'Pulse Oximetry', 'Chest X-ray'],
    treatments: ['Bronchodilators', 'Corticosteroids', 'Oxygen Therapy', 'Nebulizer Treatment'],
    complications: ['Respiratory Failure', 'Pneumothorax', 'Status Asthmaticus'],
    severity: 'Severe',
    urgency: 'Urgent',
    department: 'Pulmonology'
  },
  'Diabetic Ketoacidosis': {
    name: 'Diabetic Ketoacidosis',
    description: 'Life-threatening complication of diabetes with high blood sugar, ketones, and acidosis',
    symptoms: ['excessive thirst', 'frequent urination', 'nausea', 'vomiting', 'abdominal pain', 'weakness', 'fruity breath', 'confusion', 'hyperventilation'],
    riskFactors: ['Type 1 Diabetes', 'Insulin Omission', 'Infection', 'Myocardial Infarction', 'Emotional Stress', 'Trauma'],
    diagnosticTests: ['Blood Glucose', 'Ketones', 'Arterial Blood Gas', 'Electrolytes', 'Complete Blood Count', 'Renal Function'],
    treatments: ['IV Fluids', 'Insulin Therapy', 'Electrolyte Replacement', 'Treatment of Underlying Cause'],
    complications: ['Cerebral Edema', 'Acute Respiratory Distress Syndrome', 'Thromboembolism', 'Acute Kidney Injury', 'Death'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Emergency Medicine'
  },
  'Gastroenteritis': {
    name: 'Gastroenteritis',
    description: 'Inflammation of the stomach and intestines, typically due to infection',
    symptoms: ['diarrhea', 'vomiting', 'abdominal cramps', 'fever', 'dehydration'],
    riskFactors: ['Contaminated Food/Water', 'Close Contact with Infected', 'Immunocompromised'],
    diagnosticTests: ['Stool Culture', 'Blood Tests', 'Electrolytes', 'Physical Examination'],
    treatments: ['Oral Rehydration', 'IV Fluids if Severe', 'Antiemetics', 'Antibiotics if Bacterial'],
    complications: ['Dehydration', 'Electrolyte Imbalance', 'Kidney Failure'],
    severity: 'Moderate',
    urgency: 'Urgent',
    department: 'Gastroenterology'
  },
  'Sepsis': {
    name: 'Sepsis',
    description: 'Life-threatening condition caused by the body\'s response to infection',
    symptoms: ['fever', 'rapid heart rate', 'rapid breathing', 'confusion', 'low blood pressure'],
    riskFactors: ['Recent Surgery', 'Chronic Illness', 'Immunocompromised', 'Advanced Age'],
    diagnosticTests: ['Blood Cultures', 'Complete Blood Count', 'Lactate Levels', 'Inflammatory Markers'],
    treatments: ['Broad-Spectrum Antibiotics', 'IV Fluids', 'Vasopressors', 'Source Control'],
    complications: ['Septic Shock', 'Organ Failure', 'Death'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Intensive Care'
  },
  'Multiple Trauma': {
    name: 'Multiple Trauma',
    description: 'Life-threatening injuries affecting multiple body systems simultaneously',
    symptoms: ['multiple injuries', 'altered mental status', 'pain in multiple locations', 'shock', 'hemodynamic instability'],
    riskFactors: ['Motor Vehicle Collision', 'Fall from Height', 'Industrial Accidents', 'Violence'],
    diagnosticTests: ['Full Trauma Assessment', 'CT Trauma Series', 'FAST Ultrasound', 'X-rays', 'Blood Work'],
    treatments: ['Hemorrhage Control', 'Airway Management', 'Fluid Resuscitation', 'Blood Transfusion', 'Surgical Intervention'],
    complications: ['Hemorrhagic Shock', 'Organ Failure', 'Respiratory Failure', 'Infection', 'Death'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Trauma Surgery'
  },
  'Traumatic Brain Injury': {
    name: 'Traumatic Brain Injury',
    description: 'Brain dysfunction caused by an outside force, usually a violent blow to the head',
    symptoms: ['loss of consciousness', 'confusion', 'headache', 'vomiting', 'seizures', 'pupil changes', 'memory problems'],
    riskFactors: ['Falls', 'Motor Vehicle Accidents', 'Contact Sports', 'Violence', 'Combat Injuries'],
    diagnosticTests: ['CT Scan', 'MRI', 'Glasgow Coma Scale', 'Intracranial Pressure Monitoring'],
    treatments: ['Intracranial Pressure Management', 'Surgery', 'Seizure Prophylaxis', 'Neuroprotection', 'Rehabilitation'],
    complications: ['Brain Herniation', 'Seizures', 'Permanent Neurological Damage', 'Death'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Neurosurgery'
  },
  'Penetrating Trauma': {
    name: 'Penetrating Trauma',
    description: 'Injury caused by foreign object penetrating tissue (gunshot wound, stabbing, impalement)',
    symptoms: ['visible wounds', 'bleeding', 'pain', 'signs of internal bleeding', 'organ dysfunction'],
    riskFactors: ['Violence', 'Warfare', 'Industrial Accidents'],
    diagnosticTests: ['CT Scan', 'Exploratory Surgery', 'Angiography', 'FAST Ultrasound'],
    treatments: ['Hemorrhage Control', 'Surgical Exploration', 'Wound Debridement', 'Organ Repair'],
    complications: ['Hemorrhage', 'Infection', 'Organ Failure', 'Death'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Trauma Surgery'
  },
  'Drug Overdose': {
    name: 'Drug Overdose',
    description: 'Ingestion or exposure to toxic amounts of medications, recreational drugs, or other substances',
    symptoms: ['altered mental status', 'respiratory depression', 'constricted/dilated pupils', 'vomiting', 'seizures', 'coma'],
    riskFactors: ['Substance Abuse', 'Depression', 'Suicide Attempt', 'Medication Misuse', 'Young Children'],
    diagnosticTests: ['Toxicology Screen', 'Drug Levels', 'Liver Function Tests', 'Kidney Function Tests', 'ECG'],
    treatments: ['Activated Charcoal', 'Specific Antidotes', 'Supportive Care', 'Airway Management', 'Dialysis'],
    complications: ['Respiratory Failure', 'Cardiac Arrhythmias', 'Organ Damage', 'Brain Injury', 'Death'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Emergency Medicine'
  },
  'Carbon Monoxide Poisoning': {
    name: 'Carbon Monoxide Poisoning',
    description: 'Toxic exposure to carbon monoxide gas, preventing oxygen transport in the blood',
    symptoms: ['headache', 'dizziness', 'confusion', 'nausea', 'vomiting', 'fatigue', 'loss of consciousness'],
    riskFactors: ['Faulty Heating Systems', 'Enclosed Space Exposure', 'Fire Exposure', 'Winter Season'],
    diagnosticTests: ['Carboxyhemoglobin Levels', 'Arterial Blood Gas', 'ECG', 'Neurological Assessment'],
    treatments: ['100% Oxygen Therapy', 'Hyperbaric Oxygen Therapy', 'Supportive Care'],
    complications: ['Brain Damage', 'Heart Damage', 'Delayed Neurological Sequelae', 'Death'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Emergency Medicine'
  },
  'Acetaminophen Toxicity': {
    name: 'Acetaminophen Toxicity',
    description: 'Overdose of acetaminophen/paracetamol leading to liver damage and potential failure',
    symptoms: ['nausea', 'vomiting', 'right upper quadrant pain', 'jaundice', 'liver failure (delayed)'],
    riskFactors: ['Suicidal Intent', 'Pain Self-Treatment', 'Alcohol Use', 'Fasting State', 'Pre-existing Liver Disease'],
    diagnosticTests: ['Acetaminophen Level', 'Liver Function Tests', 'Coagulation Studies', 'Rumack-Matthew Nomogram'],
    treatments: ['N-acetylcysteine (NAC)', 'Activated Charcoal', 'Supportive Care', 'Liver Transplant (severe cases)'],
    complications: ['Acute Liver Failure', 'Renal Failure', 'Cerebral Edema', 'Death'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Emergency Medicine'
  },
  'Organophosphate Poisoning': {
    name: 'Organophosphate Poisoning',
    description: 'Exposure to organophosphate pesticides causing cholinergic crisis from acetylcholinesterase inhibition',
    symptoms: ['salivation', 'lacrimation', 'urination', 'defecation', 'gastrointestinal distress', 'emesis', 'miosis', 'muscle weakness', 'respiratory distress'],
    riskFactors: ['Agricultural Work', 'Pesticide Handling', 'Suicidal Intent', 'Chemical Warfare Exposure'],
    diagnosticTests: ['Cholinesterase Activity', 'Basic Metabolic Panel', 'Arterial Blood Gas', 'ECG'],
    treatments: ['Decontamination', 'Atropine', 'Pralidoxime', 'Airway Management', 'Supportive Care'],
    complications: ['Respiratory Failure', 'Seizures', 'Intermediate Syndrome', 'Delayed Neuropathy', 'Death'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Emergency Medicine'
  },
  'Thyroid Storm': {
    name: 'Thyroid Storm',
    description: 'Life-threatening hypermetabolic state from excess thyroid hormone with multisystem dysfunction',
    symptoms: ['high fever', 'tachycardia', 'arrhythmias', 'agitation', 'delirium', 'nausea', 'vomiting', 'diarrhea', 'tremor', 'seizures'],
    riskFactors: ['Graves Disease', 'Untreated Hyperthyroidism', 'Infection', 'Surgery', 'Trauma', 'Medication Non-compliance'],
    diagnosticTests: ['Thyroid Function Tests', 'Complete Blood Count', 'Electrolytes', 'Liver Function Tests', 'ECG'],
    treatments: ['Beta-blockers', 'Thionamides', 'Iodine Solutions', 'Corticosteroids', 'Supportive Care', 'Treatment of Precipitating Cause'],
    complications: ['Heart Failure', 'Shock', 'Multiple Organ Failure', 'Death'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Emergency Medicine'
  },
  'Adrenal Crisis': {
    name: 'Adrenal Crisis',
    description: 'Acute, life-threatening adrenal insufficiency requiring immediate treatment',
    symptoms: ['severe weakness', 'hypotension', 'shock', 'abdominal pain', 'nausea', 'vomiting', 'confusion', 'fever'],
    riskFactors: ['Primary Adrenal Insufficiency', 'Steroid Withdrawal', 'Pituitary Disease', 'Infection', 'Surgery', 'Trauma'],
    diagnosticTests: ['Cortisol Level', 'ACTH Stimulation Test', 'Electrolytes', 'Complete Blood Count', 'Blood Glucose'],
    treatments: ['IV Hydrocortisone', 'IV Fluids', 'Glucose', 'Treatment of Underlying Cause'],
    complications: ['Shock', 'Coma', 'Death'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Emergency Medicine'
  },
  'Severe Electrolyte Disorders': {
    name: 'Severe Electrolyte Disorders',
    description: 'Life-threatening abnormalities in serum electrolytes affecting multiple body systems',
    symptoms: ['altered mental status', 'muscle weakness', 'paralysis', 'seizures', 'arrhythmias', 'respiratory depression'],
    riskFactors: ['Kidney Disease', 'Heart Failure', 'Medications', 'Endocrine Disorders', 'Vomiting', 'Diarrhea', 'Burns'],
    diagnosticTests: ['Electrolyte Panel', 'Renal Function Tests', 'ECG', 'Arterial Blood Gas', 'Urinalysis'],
    treatments: ['Electrolyte Replacement/Removal', 'IV Fluids', 'Specific Antagonists', 'Dialysis', 'Treatment of Underlying Cause'],
    complications: ['Arrhythmias', 'Seizures', 'Respiratory Failure', 'Rhabdomyolysis', 'Death'],
    severity: 'Critical',
    urgency: 'Immediate',
    department: 'Emergency Medicine'
  }
};

export const SYMPTOM_PATTERNS: Record<string, SymptomPattern> = {
  'Chest Pain': {
    name: 'Chest Pain',
    associatedConditions: ['Acute Coronary Syndrome', 'Pulmonary Embolism', 'Aortic Dissection', 'Pneumonia'],
    severityIndicators: ['radiating pain', 'sweating', 'nausea', 'shortness of breath'],
    riskFactors: ['Hypertension', 'Diabetes', 'Smoking', 'Family History'],
    recommendedActions: ['ECG immediately', 'Cardiac enzymes', 'Chest X-ray', 'Monitor vital signs']
  },
  'Shortness of Breath': {
    name: 'Shortness of Breath',
    associatedConditions: ['Pulmonary Embolism', 'Heart Failure', 'Asthma', 'Pneumonia'],
    severityIndicators: ['rapid breathing', 'cyanosis', 'confusion', 'inability to speak'],
    riskFactors: ['Chronic Lung Disease', 'Heart Disease', 'Obesity', 'Smoking'],
    recommendedActions: ['Oxygen therapy', 'Pulse oximetry', 'Chest X-ray', 'ABG if severe']
  },
  'Headache': {
    name: 'Headache',
    associatedConditions: ['Migraine', 'Stroke', 'Meningitis', 'Hypertension'],
    severityIndicators: ['sudden onset', 'worst headache ever', 'fever', 'neurological symptoms'],
    riskFactors: ['Hypertension', 'Previous Stroke', 'Migraine History'],
    recommendedActions: ['Neurological assessment', 'CT scan if indicated', 'Blood pressure check']
  },
  'Abdominal Pain': {
    name: 'Abdominal Pain',
    associatedConditions: ['Appendicitis', 'Gastroenteritis', 'Peptic Ulcer', 'Gallstones'],
    severityIndicators: ['sudden onset', 'severe pain', 'rebound tenderness', 'fever'],
    riskFactors: ['Recent Surgery', 'Previous Abdominal Issues', 'Family History'],
    recommendedActions: ['Abdominal Examination', 'Blood Tests', 'Imaging if indicated']
  },
  'Dehydration': {
    name: 'Dehydration',
    associatedConditions: ['Gastroenteritis', 'Diabetic Ketoacidosis', 'Heat Stroke'],
    severityIndicators: ['dry mouth', 'sunken eyes', 'low blood pressure', 'confusion'],
    riskFactors: ['Elderly', 'Infants', 'Chronic Illness', 'Hot Environment'],
    recommendedActions: ['Oral Rehydration', 'IV Fluids if Severe', 'Electrolyte Monitoring']
  },
  'Fever': {
    name: 'Fever',
    associatedConditions: ['Infection', 'Sepsis', 'Inflammatory Conditions'],
    severityIndicators: ['high temperature', 'chills', 'sweating', 'confusion'],
    riskFactors: ['Immunocompromised', 'Recent Travel', 'Close Contact with Sick'],
    recommendedActions: ['Temperature Monitoring', 'Blood Tests', 'Infection Screening']
  }
};

export function getConditionInfo(conditionName: string): MedicalCondition | undefined {
  return MEDICAL_KNOWLEDGE[conditionName];
}

export function getSymptomInfo(symptomName: string): SymptomPattern | undefined {
  return SYMPTOM_PATTERNS[symptomName];
}

export function findConditionsBySymptoms(symptoms: string[]): string[] {
  const matchingConditions = new Set<string>();
  
  symptoms.forEach(symptom => {
    Object.entries(MEDICAL_KNOWLEDGE).forEach(([condition, info]) => {
      if (info.symptoms.some(s => s.toLowerCase().includes(symptom.toLowerCase()))) {
        matchingConditions.add(condition);
      }
    });
  });

  return Array.from(matchingConditions);
}

export function getRecommendedTests(condition: string): string[] {
  return MEDICAL_KNOWLEDGE[condition]?.diagnosticTests || [];
}

export function getUrgencyLevel(symptoms: string[]): 'Immediate' | 'Urgent' | 'Routine' {
  const urgentSymptoms = ['chest pain', 'shortness of breath', 'sudden severe headache', 'loss of consciousness'];
  const immediateSymptoms = ['cardiac arrest', 'stroke symptoms', 'severe trauma'];

  if (symptoms.some(s => immediateSymptoms.includes(s.toLowerCase()))) {
    return 'Immediate';
  }
  if (symptoms.some(s => urgentSymptoms.includes(s.toLowerCase()))) {
    return 'Urgent';
  }
  return 'Routine';
} 