import type { TriageRequest, TriageRuleResult } from '@/types/triage';

export interface EnhancedTriageRule {
  id: string;
  name: string;
  category: string;
  weight: number;
  match: (input: TriageRequest) => boolean;
  result: Omit<TriageRuleResult, 'explainability'> & {
    explain: string;
    confidence?: number;
  };
}

export const enhancedTriageRules: EnhancedTriageRule[] = [
  // --- Cardiac & Circulatory Rules ---
  {
    id: 'CARD-1',
    name: 'STEMI (Suspected Acute MI)',
    category: 'Cardiac',
    weight: 10,
    match: (input) => {
      // Enhanced STEMI criteria using more comprehensive assessment
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain') || s.toLowerCase().includes('chest pressure') || s.toLowerCase().includes('chest discomfort'));
      const typicalFeatures = input.symptoms.some(s => 
        s.toLowerCase().includes('crushing') || 
        s.toLowerCase().includes('radiat') ||
        s.toLowerCase().includes('left arm') ||
        s.toLowerCase().includes('jaw') ||
        s.toLowerCase().includes('burning')
      );
      
      const highRiskHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('mi') || 
        h.toLowerCase().includes('coronary') || 
        h.toLowerCase().includes('stent') || 
        h.toLowerCase().includes('cabg')
      );
      
      const diabetesHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      
      const stFlag = input.flags?.includes('st_elevation') || input.flags?.includes('stemi');
      const troponinFlag = input.flags?.includes('troponin_positive');
      
      // Match classic presentation OR elevated troponin/ST elevation
      return (chestPain && typicalFeatures && (highRiskHistory || diabetesHistory || input.age > 50)) || stFlag || troponinFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected STEMI: classic chest pain with risk factors or positive cardiac markers. Immediate ECG and cardiac consult required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-1b',
    name: 'Suspected NSTEMI/Unstable Angina',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      // Core symptoms
      const chestPain = input.symptoms.some(s => 
        s.toLowerCase().includes('chest pain') || 
        s.toLowerCase().includes('chest pressure') || 
        s.toLowerCase().includes('chest discomfort')
      );
      
      // Rest pain or crescendo pattern is concerning for ACS
      const unstablePattern = input.symptoms.some(s => 
        s.toLowerCase().includes('rest') || 
        s.toLowerCase().includes('worsening') || 
        s.toLowerCase().includes('more frequent') || 
        s.toLowerCase().includes('prolonged')
      );
      
      // Associated symptoms
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('sweating') || 
        s.toLowerCase().includes('nausea')
      );
      
      return chestPain && (unstablePattern || associatedSymptoms) && !input.flags?.includes('st_elevation');
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected NSTEMI/Unstable Angina: chest pain with unstable pattern or associated symptoms. Immediate ECG and cardiac evaluation required.',
      confidence: 0.9
    }
  },
  {
    id: 'CARD-2',
    name: 'High-Risk Chest Pain',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain'));
      const age = input.age || 0;
      const diabetes = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      const priorMI = (input.medicalHistory || []).some(h => h.toLowerCase().includes('mi'));
      return chestPain && (age > 65 || diabetes || priorMI);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'High-risk chest pain (elderly, diabetes, or prior MI). Treat as ACS until proven otherwise.',
      confidence: 0.85
    }
  },
  {
    id: 'CARD-3',
    name: 'Cardiac Arrest',
    category: 'Cardiac',
    weight: 10,
    match: (input) => 
      input.flags?.includes('cardiac_arrest') || 
      input.flags?.includes('no_pulse') || 
      input.symptoms.some(s => s.toLowerCase().includes('cardiac arrest') || s.toLowerCase().includes('no pulse')),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Cardiac arrest detected. Immediate resuscitation and post-ROSC care required.',
      confidence: 0.99
    }
  },
  {
    id: 'CARD-4',
    name: 'Life-Threatening Arrhythmia',
    category: 'Cardiac',
    weight: 9,
    match: (input) => input.flags?.includes('vfib') || input.flags?.includes('vtach') || input.flags?.includes('bradycardia') || input.flags?.includes('heart_block'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Life-threatening arrhythmia detected (VF, VT, bradycardia, or heart block). Immediate intervention required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-5',
    name: 'Heart Failure with Respiratory Distress',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const heartFailureHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('heart failure'));
      const acuteDistress = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('dyspnea') || 
        s.toLowerCase().includes('orthopnea') || 
        s.toLowerCase().includes('paroxysmal nocturnal')
      );
      const hypoxemia = (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94);
      
      // Expanded to catch both known and new heart failure
      return (acuteDistress && (heartFailureHistory || input.symptoms.some(s => 
        s.toLowerCase().includes('edema') || 
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('jvd') ||
        s.toLowerCase().includes('heart failure')
      ))) && hypoxemia;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Acute heart failure with respiratory distress and hypoxemia. Immediate stabilization and treatment required.',
      confidence: 0.92
    }
  },
  {
    id: 'CARD-5b',
    id: 'CARD-6',
    name: 'Hypertensive Emergency',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const sbp = input.vitals?.systolicBP || 0;
      const endOrgan = input.flags?.includes('end_organ_damage');
      return sbp > 180 && endOrgan;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Hypertensive emergency: SBP >180 with end-organ damage. Immediate BP control and monitoring required.',
      confidence: 0.93
    }
  },
  // Airway, Breathing, Circulation (ABC)
  {
    id: 'ABC-1',
    name: 'Airway Compromise',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('airway_compromise') || input.flags?.includes('stridor') || input.symptoms.includes('unable_to_speak'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Anesthesiology', type: 'secondary' }
      ],
      explain: 'Airway compromise detected → Critical priority for immediate airway intervention.',
      confidence: 0.98
    }
  },
  {
    id: 'ABC-2',
    name: 'Respiratory Failure',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('no_breath') || input.flags?.includes('ineffective_breathing') || (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate < 8),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Respiratory failure or severe bradypnea detected → Critical priority for ventilatory support.',
      confidence: 0.97
    }
  },
  {
    id: 'ABC-3',
    name: 'Severe Hypoxemia',
    category: 'ABC',
    weight: 9,
    match: (input) => (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 85) || input.flags?.includes('cyanosis'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe hypoxemia (SpO₂ < 85%) → Critical priority for oxygenation.',
      confidence: 0.95
    }
  },
  // --- Respiratory Rules ---
  {
    id: 'RESP-1',
    name: 'Acute Respiratory Failure',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      const rr = input.vitals?.respiratoryRate;
      const spo2 = input.vitals?.oxygenSaturation;
      return (rr !== undefined && (rr > 30 || rr < 8)) || (spo2 !== undefined && spo2 < 90) || (input.flags?.includes('severe_respiratory_distress'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Acute respiratory failure: abnormal RR or SpO₂ < 90%, or severe distress. Immediate airway and ventilatory support required.',
      confidence: 0.95
    }
  },
  {
    id: 'RESP-2',
    name: 'Tension Pneumothorax',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('tension_pneumothorax') || (input.symptoms.some(s => s.toLowerCase().includes('chest pain')) && input.flags?.includes('deviated_trachea'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Tension pneumothorax suspected: chest pain with deviated trachea or flag. Immediate needle decompression required.',
      confidence: 0.97
    }
  },
  {
    id: 'RESP-3',
    name: 'Severe Asthma Exacerbation',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      // Life-threatening features
      const lifeThreatening = 
        input.flags?.includes('silent_chest') || 
        input.flags?.includes('cyanosis') || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis') || 
          s.toLowerCase().includes('altered consciousness') ||
          s.toLowerCase().includes('exhaustion')
        );
      
      // Severe features per GINA guidelines
      const severeFeatures = 
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 90) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('complete sentence')) ||
          (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('<50%')) ||
          (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('<50%')) ||
          s.toLowerCase().includes('accessory muscle') ||
          s.toLowerCase().includes('tripod position') ||
          (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe'))
        );
      
      // Direct mention of severe asthma
      const severeAsthma = input.symptoms.some(s => 
        (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe')) ||
        (s.toLowerCase().includes('status asthmaticus'))
      );
      
      // Include flag-based detection
      const severeFlag = 
        input.flags?.includes('severe_asthma') || 
        input.flags?.includes('status_asthmaticus');
      
      return lifeThreatening || severeFeatures || severeAsthma || severeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe asthma exacerbation with life-threatening or severe features. Immediate continuous bronchodilators, steroids, and possible respiratory support required.',
      confidence: 0.93
    }
  },
  {
    id: 'RESP-4',
    name: 'Pulmonary Embolism (High-Risk)',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      const spo2 = input.vitals?.oxygenSaturation;
      const hr = input.vitals?.heartRate;
      return input.flags?.includes('high_risk_pe') || (spo2 !== undefined && spo2 < 92 && hr !== undefined && hr > 110 && input.symptoms.some(s => s.toLowerCase().includes('pleuritic pain')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'High-risk pulmonary embolism: hypoxemia, tachycardia, pleuritic pain. Immediate imaging and anticoagulation required.',
      confidence: 0.92
    }
  },
  {
    id: 'RESP-5',
    name: 'Moderate Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      // Moderate features per GINA/GOLD guidelines
      const moderateFeatures = 
        ((input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation >= 90 && input.vitals.oxygenSaturation < 94) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 20 && input.vitals.respiratoryRate <= 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100 && input.vitals.heartRate <= 120)) &&
        // Not meeting severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma');
      
      // Not meeting moderate criteria
      const moderateFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          (s.toLowerCase().includes('moderate') || s.toLowerCase().includes('worse'))) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('walking'))
      );
      
      // Direct mention of moderate exacerbation
      const moderateExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('moderate')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('exacerbation') && 
        !s.toLowerCase().includes('severe') && 
        !s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const moderateFlag = input.flags?.includes('moderate_asthma') || input.flags?.includes('moderate_copd');
      
      return (moderateFeatures || moderateFunctional || moderateExacerbation || moderateFlag) && 
        // Exclude those meeting severe criteria
        !input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis')
        );
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Moderate asthma/COPD exacerbation: increased work of breathing but without severe features. Requires prompt bronchodilators, steroids, and monitoring.',
      confidence: 0.85
    }
  },
  {
    id: 'RESP-6',
    name: 'Community-Acquired Pneumonia (Concerning Vitals)',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumonia')) && (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 24);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Community-acquired pneumonia with tachypnea. Requires prompt antibiotics and monitoring.',
      confidence: 0.83
    }
  },
  {
    id: 'RESP-7',
    name: 'Spontaneous Pneumothorax (Stable)',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumothorax')) && !(input.flags?.includes('tension_pneumothorax'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Spontaneous pneumothorax (stable): requires monitoring and possible intervention.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-8',
    name: 'Hemoptysis with Risk Factors',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('hemoptysis')) && (input.medicalHistory || []).some(h => h.toLowerCase().includes('cancer') || h.toLowerCase().includes('tb'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Hemoptysis with risk factors (cancer, TB). Requires urgent evaluation for underlying cause.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-9',
    name: 'Mild Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 4,
    match: (input) => {
      // Mild features per GINA/GOLD guidelines
      const mildFeatures = 
        ((input.vitals?.oxygenSaturation === undefined || input.vitals.oxygenSaturation >= 94) &&
        (input.vitals?.respiratoryRate === undefined || input.vitals.respiratoryRate <= 20) &&
        (input.vitals?.heartRate === undefined || input.vitals.heartRate <= 100)) &&
        // Not meeting moderate or severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma') &&
        !input.flags?.includes('moderate_asthma');
      
      // Minimal functional limitations
      const mildFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('mild')) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('>80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('>80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('exertion'))
      );
      
      // Direct mention of mild exacerbation
      const mildExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('mild')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('exacerbation') && 
          s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const mildFlag = input.flags?.includes('mild_asthma') || input.flags?.includes('mild_copd');
      
      // Normal activities and sleep not affected significantly
      const minimalImpact = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('minimal impact')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('well controlled'))
      );
      
      return (mildFeatures || mildFunctional || mildExacerbation || mildFlag || minimalImpact) && 
        // Exclude those meeting moderate or severe criteria
        !input.symptoms.some(s => 
          s.toLowerCase().includes('moderate') || 
          s.toLowerCase().includes('severe') ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Mild asthma/COPD exacerbation with minimal impact on function and normal vital signs. Can be managed with bronchodilators and short-term steroids in outpatient setting.',
      confidence: 0.7
    }
  },
  {
    id: 'RESP-10',
    name: 'Upper Respiratory Infection (Normal Vitals)',
    category: 'Respiratory',
    weight: 3,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('uri') || s.toLowerCase().includes('upper respiratory infection')) && (!input.vitals || (input.vitals.respiratoryRate === undefined || input.vitals.respiratoryRate <= 20));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 4,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Upper respiratory infection with normal vitals: routine care.',
      confidence: 0.6
    }
  },
  {
    id: 'RESP-11',
    name: 'Chronic Cough (Stable)',
    category: 'Respiratory',
    weight: 2,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('chronic cough')) && (!input.vitals || (input.vitals.oxygenSaturation === undefined || input.vitals.oxygenSaturation >= 94));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 5,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Chronic cough with stable vitals: non-urgent evaluation.',
      confidence: 0.5
    }
  },
  // --- Neurological Rules ---
  {
    id: 'NEURO-1',
    name: 'Acute Stroke (FAST Positive)',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Enhanced stroke detection using expanded FAST-ED criteria
      const strokeSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('facial droop') || 
        s.toLowerCase().includes('face droop') || 
        s.toLowerCase().includes('arm weakness') || 
        s.toLowerCase().includes('leg weakness') || 
        (s.toLowerCase().includes('speech') && (
          s.toLowerCase().includes('slurred') || 
          s.toLowerCase().includes('difficulty') || 
          s.toLowerCase().includes('aphasia')
        )) ||
        s.toLowerCase().includes('stroke') ||
        s.toLowerCase().includes('hemiparesis') ||
        s.toLowerCase().includes('hemineglect') ||
        s.toLowerCase().includes('visual field')
      );
      
      // Time is brain - time factors are crucial
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_4.5h') || 
        input.flags?.includes('onset_under_24h') || 
        input.symptoms.some(s => s.toLowerCase().includes('last known well') && s.toLowerCase().includes('hour'));
      
      const strokeFlag = input.flags?.includes('stroke') || input.flags?.includes('cva');
      
      // Either explicit stroke symptoms or stroke flag, with time sensitivity
      return (strokeSigns || strokeFlag) && (timeFlag || !input.flags?.includes('onset_over_24h'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Acute stroke suspected: FAST positive (face, arm, speech, time). Immediate stroke protocol activation and time-sensitive imaging required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-1b',
    name: 'Suspected Large Vessel Occlusion Stroke',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Signs of severe neurological deficit suggesting LVO
      const lvoSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('gaze deviation') || 
        (s.toLowerCase().includes('severe') && s.toLowerCase().includes('deficit')) ||
        (s.toLowerCase().includes('multiple') && s.toLowerCase().includes('deficit')) ||
        s.toLowerCase().includes('aphasia') ||
        s.toLowerCase().includes('neglect')
      );
      
      // High NIHSS or specific flag
      const severityFlag = 
        input.flags?.includes('lvo') || 
        input.flags?.includes('high_nihss') || 
        input.flags?.includes('severe_stroke');
      
      // Time window for endovascular intervention is longer
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_24h');
      
      return (lvoSigns || severityFlag) && timeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' },
        { name: 'Interventional Radiology', type: 'tertiary' }
      ],
      explain: 'Suspected large vessel occlusion stroke: severe deficits within intervention window. Immediate CTA and thrombectomy evaluation required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-2',
    name: 'Status Epilepticus',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('status_epilepticus') || 
        input.flags?.includes('ongoing_seizure') || 
        input.symptoms.some(s => s.toLowerCase().includes('seizure') && (s.toLowerCase().includes('continuous') || s.toLowerCase().includes('multiple')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Status epilepticus: ongoing seizure or multiple seizures without recovery. Immediate anticonvulsant therapy required.',
      confidence: 0.98
    }
  },
  {
    id: 'NEURO-3',
    name: 'Altered Mental Status (GCS < 9)',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      return (input.vitals?.gcs !== undefined && input.vitals.gcs < 9) || 
        input.flags?.includes('unresponsive') || 
        input.symptoms.some(s => s.toLowerCase().includes('unconscious'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Severe altered mental status: GCS < 9 or unresponsive. Immediate airway management and neurological evaluation required.',
      confidence: 0.96
    }
  },
  {
    id: 'NEURO-4',
    name: 'Thunderclap Headache',
    category: 'Neurological',
    weight: 9,
    match: (input) => {
      // Enhanced criteria for thunderclap headache
      const thunderclapFeatures = input.symptoms.some(s => 
        (s.toLowerCase().includes('headache') && (
          s.toLowerCase().includes('worst') || 
          s.toLowerCase().includes('thunderclap') || 
          s.toLowerCase().includes('sudden') ||
          s.toLowerCase().includes('severe') ||
          s.toLowerCase().includes('explosive')
        )) ||
        s.toLowerCase().includes('subarachnoid')
      );
      
      // Associated signs that increase concern
      const concerningSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('neck stiffness') || 
        s.toLowerCase().includes('photophobia') ||
        s.toLowerCase().includes('vomiting') ||
        s.toLowerCase().includes('altered') ||
        s.toLowerCase().includes('neurological')
      ) || input.flags?.includes('meningeal_signs');
      
      return thunderclapFeatures || 
        input.flags?.includes('thunderclap_headache') || 
        (input.symptoms.some(s => s.toLowerCase().includes('headache')) && concerningSigns);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Thunderclap headache: sudden, severe, worst-ever or with concerning features. Immediate evaluation for subarachnoid hemorrhage required.',
      confidence: 0.93
    }
  },
  {
    id: 'NEURO-5',
    name: 'Acute Spinal Cord Compression',
    category: 'Neurological',
    weight: 9,
    match: (input) => {
      return input.flags?.includes('cord_compression') || 
        input.symptoms.some(s => 
          (s.toLowerCase().includes('paralysis') || s.toLowerCase().includes('weakness')) && 
          (s.toLowerCase().includes('legs') || s.toLowerCase().includes('arms'))
        ) && input.symptoms.some(s => s.toLowerCase().includes('bladder') || s.toLowerCase().includes('bowel'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' }
      ],
      explain: 'Acute spinal cord compression: limb weakness with bowel/bladder dysfunction. Immediate imaging and neurosurgical consultation required.',
      confidence: 0.92
  },
  {
    id: 'NEURO-6',
    name: 'First-Time Seizure',
    category: 'Neurological',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('seizure') && s.toLowerCase().includes('first')) && 
        !input.medicalHistory?.some(h => h.toLowerCase().includes('epilepsy') || h.toLowerCase().includes('seizure'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'First-time seizure (now resolved): requires prompt evaluation for underlying cause.',
      confidence: 0.89
    }
  },
  {
    id: 'NEURO-7',
    name: 'Transient Ischemic Attack',
    category: 'Neurological',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('tia') || 
        (s.toLowerCase().includes('stroke') && s.toLowerCase().includes('resolved')));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Transient Ischemic Attack: resolved focal neurological symptoms. Requires prompt evaluation to prevent stroke.',
      confidence: 0.85
    }
  },
  {
    id: 'NEURO-8',
    name: 'Migraine with Neurological Deficits',
    category: 'Neurological',
    weight: 6,
    match: (input) => {
      // Enhanced detection of migraine with aura
      const migraine = input.symptoms.some(s => s.toLowerCase().includes('migraine'));
      
      const auraSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('aura') || 
        s.toLowerCase().includes('visual') || 
        s.toLowerCase().includes('scintillating') || 
        s.toLowerCase().includes('scotoma') || 
        s.toLowerCase().includes('numbness') || 
        s.toLowerCase().includes('tingling') ||
        s.toLowerCase().includes('paresthesia')
      );
      
      // History of similar episodes reduces concern
      const knownHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('migraine with aura') || 
        h.toLowerCase().includes('complex migraine')
      );
      
      // First time is more concerning than recurrent with same pattern
      const firstTimeFlag = input.flags?.includes('first_time') || input.symptoms.some(s => s.toLowerCase().includes('first') && s.toLowerCase().includes('time'));
      
      // Concerning if first time or different from usual pattern
      return migraine && auraSymptoms && (firstTimeFlag || input.symptoms.some(s => s.toLowerCase().includes('different')) || !knownHistory);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Migraine with neurological deficits (atypical or first-time): requires evaluation to rule out more serious conditions.',
      confidence: 0.8
    }
  },
  {
    id: 'NEURO-9',
    name: 'Vertigo with Neurological Symptoms',
    category: 'Neurological',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('vertigo')) && 
        (input.symptoms.some(s => 
          s.toLowerCase().includes('double vision') || 
          s.toLowerCase().includes('diplopia') || 
          s.toLowerCase().includes('dysarthria') || 
          s.toLowerCase().includes('ataxia') || 
          s.toLowerCase().includes('weakness')
        ) || 
        input.flags?.includes('central_vertigo'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Vertigo with neurological symptoms: concerning for central cause. Requires neurological evaluation.',
      confidence: 0.82
    }
  },
  {
    id: 'NEURO-10',
    name: 'Uncomplicated Syncope in Young, Healthy Patient',
    category: 'Neurological',
    weight: 4,
    match: (input) => {
      const age = input.age || 0;
      return input.symptoms.some(s => s.toLowerCase().includes('syncope') || s.toLowerCase().includes('fainting')) && 
        age < 40 && 
        !(input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('heart') || 
          h.toLowerCase().includes('cardiac') || 
          h.toLowerCase().includes('epilepsy')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Uncomplicated syncope in young, healthy patient: likely vasovagal. Requires standard evaluation.',
      confidence: 0.75
    }
  },
  {
    id: 'NEURO-11',
    name: 'Chronic Stable Headache',
    category: 'Neurological',
    weight: 3,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('headache') && (s.toLowerCase().includes('chronic') || s.toLowerCase().includes('recurring'))) && 
        !input.symptoms.some(s => 
          s.toLowerCase().includes('worst') || 
          s.toLowerCase().includes('new') || 
          s.toLowerCase().includes('neurological') || 
          s.toLowerCase().includes('fever')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 4,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Chronic stable headache pattern: routine evaluation for management.',
      confidence: 0.7
    }
  },
  // --- Ophthalmological Rules ---
  {
    id: 'OPHTHAL-1',
    name: 'Chemical Eye Burn',
    category: 'Ophthalmological',
    weight: 10,
    match: (input) => {
      // Chemical exposure to the eye
      const chemicalExposure = input.symptoms.some(s => 
        s.toLowerCase().includes('chemical') || 
        s.toLowerCase().includes('acid') || 
        s.toLowerCase().includes('alkali') || 
        s.toLowerCase().includes('bleach') || 
        s.toLowerCase().includes('caustic') || 
        s.toLowerCase().includes('irritant') || 
        s.toLowerCase().includes('corrosive')
      );
      
      // Eye pain, burning, vision changes
      const eyeSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('eye pain') || 
        s.toLowerCase().includes('burning') || 
        s.toLowerCase().includes('vision change') || 
        s.toLowerCase().includes('blurry vision') || 
        s.toLowerCase().includes('red eye') || 
        s.toLowerCase().includes('tearing')
      );
      
      // Time-critical nature and risk of permanent vision loss
      const timeCritical = input.symptoms.some(s => 
        s.toLowerCase().includes('immediate') || 
        s.toLowerCase().includes('urgent') || 
        s.toLowerCase().includes('now') || 
        s.toLowerCase().includes('within minutes')
      );
      
      return chemicalExposure && eyeSymptoms && timeCritical;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Chemical eye burn: immediate ophthalmological evaluation and irrigation required to prevent permanent vision loss within minutes.',
      confidence: 0.95
    }
  },
  {
    id: 'OPHTHAL-2',
    name: 'Acute Angle-Closure Glaucoma',
    category: 'Ophthalmological',
    weight: 9,
    match: (input) => {
      // Severe eye pain, vision changes, halos around lights
      const severeSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('severe eye pain') || 
        s.toLowerCase().includes('vision change') || 
        s.toLowerCase().includes('halo') || 
        s.toLowerCase().includes('blurry vision') || 
        s.toLowerCase().includes('red eye') || 
        s.toLowerCase().includes('tearing')
      );
      
      // Associated symptoms: headache, nausea, vomiting
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('headache') || 
        s.toLowerCase().includes('nausea') || 
        s.toLowerCase().includes('vomiting')
      );
      
      // Risk of permanent vision loss if delayed >6-12 hours
      const timeCritical = input.symptoms.some(s => 
        s.toLowerCase().includes('urgent') || 
        s.toLowerCase().includes('now') || 
        s.toLowerCase().includes('immediate') || 
        s.toLowerCase().includes('within hours')
      );
      
      return severeSymptoms && associatedSymptoms && timeCritical;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Acute angle-closure glaucoma: immediate ophthalmological evaluation and IOP reduction required to prevent permanent vision loss within hours.',
      confidence: 0.92
    }
  },
  {
    id: 'OPHTHAL-3',
    name: 'Retinal Detachment',
    category: 'Ophthalmological',
    weight: 8,
    match: (input) => {
      // Classic symptoms: floaters, flashes of light, curtain/shadow in vision
      const classicSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('floaters') || 
        s.toLowerCase().includes('flashes') || 
        s.toLowerCase().includes('curtain') || 
        s.toLowerCase().includes('shadow') || 
        s.toLowerCase().includes('vision loss')
      );
      
      // Risk factors: myopia, previous detachment, trauma
      const riskFactors = input.symptoms.some(s => 
        s.toLowerCase().includes('myopia') || 
        s.toLowerCase().includes('detachment') || 
        s.toLowerCase().includes('trauma') || 
        s.toLowerCase().includes('injury')
      );
      
      // Same-day evaluation and surgical intervention required
      const timeCritical = input.symptoms.some(s => 
        s.toLowerCase().includes('urgent') || 
        s.toLowerCase().includes('now') || 
        s.toLowerCase().includes('immediate') || 
        s.toLowerCase().includes('today')
      );
      
      return classicSymptoms && (riskFactors || timeCritical);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Retinal detachment: same-day ophthalmological evaluation and surgical intervention required to prevent permanent vision loss.',
      confidence: 0.9
    }
  },
  // --- ENT Rules ---
  {
    id: 'ENT-1',
    name: 'Severe Epistaxis',
    category: 'ENT',
    weight: 8,
    match: (input) => {
      // Severe or uncontrolled nosebleeds
      const severeNosebleed = input.symptoms.some(s => 
        s.toLowerCase().includes('epistaxis') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('uncontrolled') || 
          s.toLowerCase().includes('profuse') || 
          s.toLowerCase().includes('recurrent')
        )
      );
      
      // Hypovolemic signs: dizziness, lightheadedness, syncope
      const hypovolemicSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('dizziness') || 
        s.toLowerCase().includes('lightheaded') || 
        s.toLowerCase().includes('syncope')
      );
      
      // Posterior bleeding, anticoagulation risk
      const posteriorBleeding = input.symptoms.some(s => 
        s.toLowerCase().includes('posterior') || 
        s.toLowerCase().includes('back') || 
        s.toLowerCase().includes('anticoagulation') || 
        s.toLowerCase().includes('blood thinner')
      );
      
      // Potential for life-threatening blood loss and airway compromise
      const airwayConcern = input.symptoms.some(s => 
        s.toLowerCase().includes('airway') || 
        s.toLowerCase().includes('breathing') || 
        s.toLowerCase().includes('difficulty')
      );
      
      return severeNosebleed && (hypovolemicSigns || posteriorBleeding || airwayConcern);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'ENT', type: 'secondary' }
      ],
      explain: 'Severe epistaxis: life-threatening condition requiring immediate ENT evaluation and intervention to control bleeding and assess airway.',
      confidence: 0.9
    }
  },
  {
    id: 'ENT-2',
    name: 'Airway Foreign Body',
    category: 'ENT',
    weight: 10,
    match: (input) => {
      // Choking, foreign bodies in the airway/throat
      const choking = input.symptoms.some(s => 
        s.toLowerCase().includes('choking') || 
        s.toLowerCase().includes('foreign body') || 
        s.toLowerCase().includes('obstruction') || 
        s.toLowerCase().includes('airway')
      );
      
      // Signs of airway obstruction: coughing, gagging, difficulty breathing
      const obstructionSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('coughing') || 
        s.toLowerCase().includes('gagging') || 
        s.toLowerCase().includes('difficulty breathing')
      );
      
      // Aspiration history: coughing up blood, foreign material
      const aspirationHistory = input.symptoms.some(s => 
        s.toLowerCase().includes('blood') || 
        s.toLowerCase().includes('foreign material') || 
        s.toLowerCase().includes('aspiration')
      );
      
      // Life-threatening nature requiring rapid intervention
      const lifeThreatening = input.symptoms.some(s => 
        s.toLowerCase().includes('urgent') || 
        s.toLowerCase().includes('emergency') || 
        s.toLowerCase().includes('immediate')
      );
      
      return choking && (obstructionSigns || aspirationHistory || lifeThreatening);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'ENT', type: 'secondary' }
      ],
      explain: 'Airway foreign body: life-threatening condition requiring immediate ENT evaluation and intervention to remove foreign body and assess airway.',
      confidence: 0.95
    }
  },
  {
    id: 'ENT-3',
    name: 'Deep Space Neck Infection',
    category: 'ENT',
    weight: 9,
    match: (input) => {
      // Conditions like Ludwig's angina, retropharyngeal abscess, peritonsillar abscess
      const deepSpaceInfections = input.symptoms.some(s => 
        s.toLowerCase().includes('ludwig') || 
        s.toLowerCase().includes('retropharyngeal') || 
        s.toLowerCase().includes('peritonsillar') || 
        s.toLowerCase().includes('abscess')
      );
      
      // Neck symptoms: pain, swelling, difficulty swallowing
      const neckSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('neck pain') || 
        s.toLowerCase().includes('swelling') || 
        s.toLowerCase().includes('difficulty swallowing')
      );
      
      // Systemic infection signs: fever, malaise, leukocytosis
      const systemicInfectionSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('fever') || 
        s.toLowerCase().includes('malaise') || 
        s.toLowerCase().includes('leukocytosis')
      );
      
      // Airway compromise: drooling, difficulty breathing
      const airwayCompromise = input.symptoms.some(s => 
        s.toLowerCase().includes('drooling') || 
        s.toLowerCase().includes('difficulty breathing')
      );
      
      // Rapid progression, risk of airway compromise, mediastinal spread, sepsis
      const rapidProgression = input.symptoms.some(s => 
        s.toLowerCase().includes('rapid') || 
        s.toLowerCase().includes('progression') || 
        s.toLowerCase().includes('sepsis')
      );
      
      return deepSpaceInfections && (neckSymptoms || systemicInfectionSigns || airwayCompromise || rapidProgression);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'ENT', type: 'secondary' }
      ],
      explain: 'Deep space neck infection: life-threatening condition requiring immediate ENT evaluation and intervention to control infection and assess airway.',
      confidence: 0.92
    }
  },
  // --- Musculoskeletal Rules ---
  {
    id: 'MSK-1',
    name: 'Compartment Syndrome',
    category: 'Musculoskeletal',
    weight: 10,
    match: (input) => {
      // The "6 P's" of compartment syndrome: Pain, Pressure/Pallor, Paresthesia, Paralysis, Pulselessness
      const pain = input.symptoms.some(s => 
        s.toLowerCase().includes('pain') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('disproportionate')
        )
      );
      
      const pressurePallor = input.symptoms.some(s => 
        s.toLowerCase().includes('pressure') || 
        s.toLowerCase().includes('pallor')
      );
      
      const paresthesia = input.symptoms.some(s => 
        s.toLowerCase().includes('tingling') || 
        s.toLowerCase().includes('numbness') || 
        s.toLowerCase().includes('paresthesia')
      );
      
      const paralysis = input.symptoms.some(s => 
        s.toLowerCase().includes('paralysis') || 
        s.toLowerCase().includes('weakness')
      );
      
      const pulselessness = input.symptoms.some(s => 
        s.toLowerCase().includes('pulseless') || 
        s.toLowerCase().includes('no pulse')
      );
      
      // Risk factors: fractures, crush injuries, tight casts, burns
      const riskFactors = input.symptoms.some(s => 
        s.toLowerCase().includes('fracture') || 
        s.toLowerCase().includes('crush injury') || 
        s.toLowerCase().includes('cast') || 
        s.toLowerCase().includes('burn')
      );
      
      // Surgical emergency nature, 6-8 hour time window before irreversible damage
      const surgicalEmergency = input.symptoms.some(s => 
        s.toLowerCase().includes('urgent') || 
        s.toLowerCase().includes('emergency') || 
        s.toLowerCase().includes('immediate')
      );
      
      return (pain && pressurePallor && paresthesia && paralysis && pulselessness) || (riskFactors && surgicalEmergency);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Orthopedics', type: 'secondary' },
        { name: 'Vascular Surgery', type: 'tertiary' }
      ],
      explain: 'Compartment syndrome: surgical emergency requiring immediate fasciotomy to prevent irreversible nerve and muscle damage within 6-8 hours.',
      confidence: 0.95
    }
  },
  {
    id: 'MSK-2',
    name: 'Septic Arthritis',
    category: 'Musculoskeletal',
    weight: 9,
    match: (input) => {
      // Joint symptoms: pain, swelling, redness, warmth
      const jointSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('joint pain') || 
        s.toLowerCase().includes('swelling') || 
        s.toLowerCase().includes('redness') || 
        s.toLowerCase().includes('warmth')
      );
      
      // Reduced mobility, systemic infection signs
      const reducedMobility = input.symptoms.some(s => 
        s.toLowerCase().includes('mobility') || 
        s.toLowerCase().includes('limited') || 
        s.toLowerCase().includes('stiff')
      );
      
      const systemicInfectionSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('fever') || 
        s.toLowerCase().includes('chills') || 
        s.toLowerCase().includes('malaise')
      );
      
      // Key risk factors: immunosuppression, diabetes, prosthetic joints, IV drug use
      const immunosuppression = input.flags?.includes('immunosuppression') || input.medicalHistory?.some(h => h.toLowerCase().includes('immunosuppression'));
      const diabetes = input.flags?.includes('diabetes') || input.medicalHistory?.some(h => h.toLowerCase().includes('diabetes'));
      const prostheticJoint = input.symptoms.some(s => s.toLowerCase().includes('prosthetic'));
      const ivDrugUse = input.flags?.includes('iv_drug_use') || input.medicalHistory?.some(h => h.toLowerCase().includes('iv drug use'));
      
      // Need for immediate joint aspiration, antibiotics, possible surgical intervention
      const urgentIntervention = input.symptoms.some(s => 
        s.toLowerCase().includes('urgent') || 
        s.toLowerCase().includes('emergency') || 
        s.toLowerCase().includes('immediate')
      );
      
      return jointSymptoms && reducedMobility && systemicInfectionSigns && (immunosuppression || diabetes || prostheticJoint || ivDrugUse || urgentIntervention);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Orthopedics', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Septic arthritis: medical emergency requiring joint aspiration, IV antibiotics, and possible surgical irrigation to prevent permanent joint destruction within days.',
      confidence: 0.9
    }
  },
  // --- Dermatological/Cutaneous Rules ---
  {
    id: 'DERM-1',
    name: 'Stevens-Johnson Syndrome / Toxic Epidermal Necrolysis',
    category: 'Dermatological',
    weight: 10,
    match: (input) => {
      // Recent medication exposure (common triggers)
      const medicationExposure = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('medication') || 
          s.toLowerCase().includes('drug') || 
          s.toLowerCase().includes('antibiotic') ||
          s.toLowerCase().includes('anticonvulsant') ||
          s.toLowerCase().includes('allopurinol') ||
          s.toLowerCase().includes('sulfa') ||
          s.toLowerCase().includes('nsaid')
        ) || 
        input.flags?.includes('new_medication') ||
        input.flags?.includes('medication_reaction');
      
      // Prodromal symptoms
      const prodromalSymptoms = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('malaise') ||
          s.toLowerCase().includes('sore throat') ||
          s.toLowerCase().includes('cough') ||
          s.toLowerCase().includes('burning eyes')
        );
      
      // Skin manifestations
      const skinManifestations = input.symptoms.some(s => 
        s.toLowerCase().includes('rash') || 
        s.toLowerCase().includes('blisters') || 
        s.toLowerCase().includes('skin peeling') ||
        s.toLowerCase().includes('skin detachment') ||
        s.toLowerCase().includes('nikolsky sign') ||
        s.toLowerCase().includes('target lesions') ||
        s.toLowerCase().includes('erythema multiforme') ||
        s.toLowerCase().includes('painful skin')
      );
      
      // Critical mucosal involvement (pathognomonic for SJS/TEN)
      const mucosalInvolvement = input.symptoms.some(s => 
        s.toLowerCase().includes('mouth sores') || 
        s.toLowerCase().includes('oral ulcers') || 
        s.toLowerCase().includes('eye pain') || 
        s.toLowerCase().includes('genital sores') ||
        s.toLowerCase().includes('conjunctivitis') ||
        s.toLowerCase().includes('mucosal lesions') ||
        s.toLowerCase().includes('mucosal ulcers')
      );
      
      // Extensive skin involvement (percentage BSA)
      const extensiveSkinInvolvement = input.symptoms.some(s => 
        s.toLowerCase().includes('widespread') || 
        s.toLowerCase().includes('extensive') || 
        s.toLowerCase().includes('all over body') ||
        s.toLowerCase().includes('large area') ||
        s.toLowerCase().includes('entire torso') ||
        s.toLowerCase().includes('multiple regions') ||
        s.toLowerCase().includes('detachment')
      );
      
      // Direct mention of the condition
      const sjstenMention = 
        input.flags?.includes('sjs') ||
        input.flags?.includes('ten') ||
        input.flags?.includes('stevens_johnson') ||
        input.flags?.includes('toxic_epidermal_necrolysis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('stevens-johnson') || 
          s.toLowerCase().includes('toxic epidermal necrolysis') ||
          s.toLowerCase().includes('sjs') ||
          s.toLowerCase().includes('ten') ||
          (s.toLowerCase().includes('skin') && s.toLowerCase().includes('sloughing'))
        );
      
      return sjstenMention || 
        // Classic presentation
        (skinManifestations && mucosalInvolvement && (medicationExposure || prodromalSymptoms)) ||
        // Severe presentation
        (skinManifestations && mucosalInvolvement && extensiveSkinInvolvement);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Dermatology', type: 'secondary' },
        { name: 'Burn Unit', type: 'tertiary' }
      ],
      explain: 'Stevens-Johnson Syndrome/TEN: dermatological emergency with mortality up to 30%. Immediate discontinuation of suspected triggers, fluid resuscitation, specialized wound care, and ocular/mucosal protection required. Cases with >10% BSA involvement (TEN) may need burn unit care.',
      confidence: 0.95
    }
  },
  {
    id: 'DERM-2',
    name: 'Necrotizing Soft Tissue Infection',
    category: 'Dermatological',
    weight: 10,
    match: (input) => {
      // Pain out of proportion (cardinal feature)
      const severeDisproportionatePain = input.symptoms.some(s => 
        (s.toLowerCase().includes('pain') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('extreme') ||
          s.toLowerCase().includes('excruciating') ||
          s.toLowerCase().includes('disproportionate') ||
          s.toLowerCase().includes('out of proportion')
        )) ||
        s.toLowerCase().includes('pain out of proportion')
      );
      
      // Early skin findings (may be subtle initially)
      const earlySkinSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('erythema') ||
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('warm skin') ||
        s.toLowerCase().includes('cellulitis') ||
        s.toLowerCase().includes('induration') ||
        s.toLowerCase().includes('tense skin')
      );
      
      // Late skin findings (more specific but later)
      const lateSkinSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('bullae') ||
        s.toLowerCase().includes('blisters') ||
        s.toLowerCase().includes('skin discoloration') ||
        s.toLowerCase().includes('purple') ||
        s.toLowerCase().includes('dusky') ||
        s.toLowerCase().includes('mottled') ||
        s.toLowerCase().includes('blue') ||
        s.toLowerCase().includes('gray') ||
        s.toLowerCase().includes('black') ||
        s.toLowerCase().includes('necrosis') ||
        s.toLowerCase().includes('crepitus')
      );
      
      // Systemic toxicity
      const systemicToxicity = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.5) || 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100) || 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        input.flags?.includes('toxic_appearance') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') || 
          s.toLowerCase().includes('toxic appearance') ||
          s.toLowerCase().includes('tachycardia') ||
          s.toLowerCase().includes('hypotension') ||
          s.toLowerCase().includes('altered mental status') ||
          s.toLowerCase().includes('weakness')
        );
      
      // Risk factors
      const riskFactors = 
        input.flags?.includes('diabetes') ||
        input.flags?.includes('immunocompromised') ||
        input.flags?.includes('iv_drug_use') ||
        input.flags?.includes('recent_trauma') ||
        input.flags?.includes('recent_surgery') ||
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('diabetes') ||
          h.toLowerCase().includes('immunocompromised') ||
          h.toLowerCase().includes('cancer') ||
          h.toLowerCase().includes('cirrhosis') ||
          h.toLowerCase().includes('renal failure') ||
          h.toLowerCase().includes('alcoholism')
        );
      
      // Direct mention
      const necrotizingMention = 
        input.flags?.includes('necrotizing_fasciitis') ||
        input.flags?.includes('nsti') ||
        input.flags?.includes('necrotizing_infection') ||
        input.flags?.includes('gas_gangrene') ||
        input.flags?.includes('flesh_eating_bacteria') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('necrotizing fasciitis') ||
          s.toLowerCase().includes('necrotizing infection') ||
          s.toLowerCase().includes('nsti') ||
          s.toLowerCase().includes('flesh eating') ||
          s.toLowerCase().includes('gas gangrene')
        );
      
      return necrotizingMention || 
        // Early presentation with high suspicion
        (severeDisproportionatePain && earlySkinSigns && systemicToxicity) ||
        // Late or obvious presentation
        (severeDisproportionatePain && lateSkinSigns) ||
        // High-risk presentation
        (earlySkinSigns && lateSkinSigns && (systemicToxicity || riskFactors));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'General Surgery', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Necrotizing soft tissue infection: cutaneous/surgical emergency with mortality of 20-40%. Requires immediate broad-spectrum antibiotics and urgent surgical debridement. High clinical suspicion is critical as early manifestations may be subtle.',
      confidence: 0.95
    }
  }
];

export const enhancedTriageRules: EnhancedTriageRule[] = [
  // --- Cardiac & Circulatory Rules ---
  {
    id: 'CARD-1',
    name: 'STEMI (Suspected Acute MI)',
    category: 'Cardiac',
    weight: 10,
    match: (input) => {
      // Enhanced STEMI criteria using more comprehensive assessment
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain') || s.toLowerCase().includes('chest pressure') || s.toLowerCase().includes('chest discomfort'));
      const typicalFeatures = input.symptoms.some(s => 
        s.toLowerCase().includes('crushing') || 
        s.toLowerCase().includes('radiat') ||
        s.toLowerCase().includes('left arm') ||
        s.toLowerCase().includes('jaw') ||
        s.toLowerCase().includes('burning')
      );
      
      const highRiskHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('mi') || 
        h.toLowerCase().includes('coronary') || 
        h.toLowerCase().includes('stent') || 
        h.toLowerCase().includes('cabg')
      );
      
      const diabetesHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      
      const stFlag = input.flags?.includes('st_elevation') || input.flags?.includes('stemi');
      const troponinFlag = input.flags?.includes('troponin_positive');
      
      // Match classic presentation OR elevated troponin/ST elevation
      return (chestPain && typicalFeatures && (highRiskHistory || diabetesHistory || input.age > 50)) || stFlag || troponinFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected STEMI: classic chest pain with risk factors or positive cardiac markers. Immediate ECG and cardiac consult required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-1b',
    name: 'Suspected NSTEMI/Unstable Angina',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      // Core symptoms
      const chestPain = input.symptoms.some(s => 
        s.toLowerCase().includes('chest pain') || 
        s.toLowerCase().includes('chest pressure') || 
        s.toLowerCase().includes('chest discomfort')
      );
      
      // Rest pain or crescendo pattern is concerning for ACS
      const unstablePattern = input.symptoms.some(s => 
        s.toLowerCase().includes('rest') || 
        s.toLowerCase().includes('worsening') || 
        s.toLowerCase().includes('more frequent') || 
        s.toLowerCase().includes('prolonged')
      );
      
      // Associated symptoms
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('sweating') || 
        s.toLowerCase().includes('nausea')
      );
      
      return chestPain && (unstablePattern || associatedSymptoms) && !input.flags?.includes('st_elevation');
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected NSTEMI/Unstable Angina: chest pain with unstable pattern or associated symptoms. Immediate ECG and cardiac evaluation required.',
      confidence: 0.9
    }
  },
  {
    id: 'CARD-2',
    name: 'High-Risk Chest Pain',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain'));
      const age = input.age || 0;
      const diabetes = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      const priorMI = (input.medicalHistory || []).some(h => h.toLowerCase().includes('mi'));
      return chestPain && (age > 65 || diabetes || priorMI);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'High-risk chest pain (elderly, diabetes, or prior MI). Treat as ACS until proven otherwise.',
      confidence: 0.85
    }
  },
  {
    id: 'CARD-3',
    name: 'Cardiac Arrest',
    category: 'Cardiac',
    weight: 10,
    match: (input) => 
      input.flags?.includes('cardiac_arrest') || 
      input.flags?.includes('no_pulse') || 
      input.symptoms.some(s => s.toLowerCase().includes('cardiac arrest') || s.toLowerCase().includes('no pulse')),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Cardiac arrest detected. Immediate resuscitation and post-ROSC care required.',
      confidence: 0.99
    }
  },
  {
    id: 'CARD-4',
    name: 'Life-Threatening Arrhythmia',
    category: 'Cardiac',
    weight: 9,
    match: (input) => input.flags?.includes('vfib') || input.flags?.includes('vtach') || input.flags?.includes('bradycardia') || input.flags?.includes('heart_block'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Life-threatening arrhythmia detected (VF, VT, bradycardia, or heart block). Immediate intervention required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-5',
    name: 'Heart Failure with Respiratory Distress',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const heartFailureHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('heart failure'));
      const acuteDistress = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('dyspnea') || 
        s.toLowerCase().includes('orthopnea') || 
        s.toLowerCase().includes('paroxysmal nocturnal')
      );
      const hypoxemia = (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94);
      
      // Expanded to catch both known and new heart failure
      return (acuteDistress && (heartFailureHistory || input.symptoms.some(s => 
        s.toLowerCase().includes('edema') || 
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('jvd') ||
        s.toLowerCase().includes('heart failure')
      ))) && hypoxemia;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Acute heart failure with respiratory distress and hypoxemia. Immediate stabilization and treatment required.',
      confidence: 0.92
    }
  },
  {
    id: 'CARD-5b',
    id: 'CARD-6',
    name: 'Hypertensive Emergency',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const sbp = input.vitals?.systolicBP || 0;
      const endOrgan = input.flags?.includes('end_organ_damage');
      return sbp > 180 && endOrgan;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Hypertensive emergency: SBP >180 with end-organ damage. Immediate BP control and monitoring required.',
      confidence: 0.93
    }
  },
  // Airway, Breathing, Circulation (ABC)
  {
    id: 'ABC-1',
    name: 'Airway Compromise',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('airway_compromise') || input.flags?.includes('stridor') || input.symptoms.includes('unable_to_speak'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Anesthesiology', type: 'secondary' }
      ],
      explain: 'Airway compromise detected → Critical priority for immediate airway intervention.',
      confidence: 0.98
    }
  },
  {
    id: 'ABC-2',
    name: 'Respiratory Failure',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('no_breath') || input.flags?.includes('ineffective_breathing') || (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate < 8),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Respiratory failure or severe bradypnea detected → Critical priority for ventilatory support.',
      confidence: 0.97
    }
  },
  {
    id: 'ABC-3',
    name: 'Severe Hypoxemia',
    category: 'ABC',
    weight: 9,
    match: (input) => (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 85) || input.flags?.includes('cyanosis'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe hypoxemia (SpO₂ < 85%) → Critical priority for oxygenation.',
      confidence: 0.95
    }
  },
  // --- Respiratory Rules ---
  {
    id: 'RESP-1',
    name: 'Acute Respiratory Failure',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      const rr = input.vitals?.respiratoryRate;
      const spo2 = input.vitals?.oxygenSaturation;
      return (rr !== undefined && (rr > 30 || rr < 8)) || (spo2 !== undefined && spo2 < 90) || (input.flags?.includes('severe_respiratory_distress'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Acute respiratory failure: abnormal RR or SpO₂ < 90%, or severe distress. Immediate airway and ventilatory support required.',
      confidence: 0.95
    }
  },
  {
    id: 'RESP-2',
    name: 'Tension Pneumothorax',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('tension_pneumothorax') || (input.symptoms.some(s => s.toLowerCase().includes('chest pain')) && input.flags?.includes('deviated_trachea'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Tension pneumothorax suspected: chest pain with deviated trachea or flag. Immediate needle decompression required.',
      confidence: 0.97
    }
  },
  {
    id: 'RESP-3',
    name: 'Severe Asthma Exacerbation',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      // Life-threatening features
      const lifeThreatening = 
        input.flags?.includes('silent_chest') || 
        input.flags?.includes('cyanosis') || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis') || 
          s.toLowerCase().includes('altered consciousness') ||
          s.toLowerCase().includes('exhaustion')
        );
      
      // Severe features per GINA guidelines
      const severeFeatures = 
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 90) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('complete sentence')) ||
          (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('<50%')) ||
          (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('<50%')) ||
          s.toLowerCase().includes('accessory muscle') ||
          s.toLowerCase().includes('tripod position') ||
          (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe'))
        );
      
      // Direct mention of severe asthma
      const severeAsthma = input.symptoms.some(s => 
        (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe')) ||
        (s.toLowerCase().includes('status asthmaticus'))
      );
      
      // Include flag-based detection
      const severeFlag = 
        input.flags?.includes('severe_asthma') || 
        input.flags?.includes('status_asthmaticus');
      
      return lifeThreatening || severeFeatures || severeAsthma || severeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe asthma exacerbation with life-threatening or severe features. Immediate continuous bronchodilators, steroids, and possible respiratory support required.',
      confidence: 0.93
    }
  },
  {
    id: 'RESP-4',
    name: 'Pulmonary Embolism (High-Risk)',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      const spo2 = input.vitals?.oxygenSaturation;
      const hr = input.vitals?.heartRate;
      return input.flags?.includes('high_risk_pe') || (spo2 !== undefined && spo2 < 92 && hr !== undefined && hr > 110 && input.symptoms.some(s => s.toLowerCase().includes('pleuritic pain')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'High-risk pulmonary embolism: hypoxemia, tachycardia, pleuritic pain. Immediate imaging and anticoagulation required.',
      confidence: 0.92
    }
  },
  {
    id: 'RESP-5',
    name: 'Moderate Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      // Moderate features per GINA/GOLD guidelines
      const moderateFeatures = 
        ((input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation >= 90 && input.vitals.oxygenSaturation < 94) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 20 && input.vitals.respiratoryRate <= 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100 && input.vitals.heartRate <= 120)) &&
        // Not meeting severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma');
      
      // Functional limitations but not severe
      const moderateFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          (s.toLowerCase().includes('moderate') || s.toLowerCase().includes('worse'))) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('walking'))
      );
      
      // Direct mention of moderate exacerbation
      const moderateExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('moderate')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('exacerbation') && 
        !s.toLowerCase().includes('severe') && 
        !s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const moderateFlag = input.flags?.includes('moderate_asthma') || input.flags?.includes('moderate_copd');
      
      return (moderateFeatures || moderateFunctional || moderateExacerbation || moderateFlag) && 
        // Exclude those meeting severe criteria
        !input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis')
        );
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Moderate asthma/COPD exacerbation: increased work of breathing but without severe features. Requires prompt bronchodilators, steroids, and monitoring.',
      confidence: 0.85
    }
  },
  {
    id: 'RESP-6',
    name: 'Community-Acquired Pneumonia (Concerning Vitals)',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumonia')) && (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 24);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Community-acquired pneumonia with tachypnea. Requires prompt antibiotics and monitoring.',
      confidence: 0.83
    }
  },
  {
    id: 'RESP-7',
    name: 'Spontaneous Pneumothorax (Stable)',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumothorax')) && !(input.flags?.includes('tension_pneumothorax'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Spontaneous pneumothorax (stable): requires monitoring and possible intervention.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-8',
    name: 'Hemoptysis with Risk Factors',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('hemoptysis')) && (input.medicalHistory || []).some(h => h.toLowerCase().includes('cancer') || h.toLowerCase().includes('tb'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Hemoptysis with risk factors (cancer, TB). Requires urgent evaluation for underlying cause.',
      confidence: 0.8
    }
  },
  // --- Ophthalmological Rules ---
  {
    id: 'OPHTHAL-1',
    name: 'Chemical Eye Burn',
    category: 'Ophthalmological',
    weight: 10,
    match: (input) => {
      // Chemical exposures
      const chemicalExposure = input.symptoms.some(s => 
        s.toLowerCase().includes('chemical') || 
        s.toLowerCase().includes('acid') || 
        s.toLowerCase().includes('alkali') || 
        s.toLowerCase().includes('bleach') || 
        s.toLowerCase().includes('cleaner') || 
        s.toLowerCase().includes('irritant') || 
        s.toLowerCase().includes('corrosive')
      );
      
      // Eye pain, burning, vision changes
      const eyeSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('eye pain') || 
        s.toLowerCase().includes('burning') || 
        s.toLowerCase().includes('vision change') || 
        s.toLowerCase().includes('blurry vision') || 
        s.toLowerCase().includes('red eye') || 
        s.toLowerCase().includes('tearing')
      );
      
      // Exposure within minutes
      const recentExposure = input.symptoms.some(s => 
        s.toLowerCase().includes('just now') || 
        s.toLowerCase().includes('minutes ago') || 
        s.toLowerCase().includes('seconds ago')
      );
      
      return chemicalExposure && eyeSymptoms && recentExposure;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Chemical eye burn: time-critical emergency with risk of permanent vision loss within minutes. Immediate irrigation, antibiotics, and ophthalmology consult required.',
      confidence: 0.98
    }
  },
  {
    id: 'OPHTHAL-2',
    name: 'Acute Angle-Closure Glaucoma',
    category: 'Ophthalmological',
    weight: 9,
    match: (input) => {
      // Severe eye pain, vision changes, halos around lights
      const severeEyePain = input.symptoms.some(s => 
        s.toLowerCase().includes('eye pain') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('intense') || 
          s.toLowerCase().includes('excruciating')
        )
      );
      
      const visionChanges = input.symptoms.some(s => 
        s.toLowerCase().includes('vision change') || 
        s.toLowerCase().includes('blurry vision') || 
        s.toLowerCase().includes('halo') || 
        s.toLowerCase().includes('light')
      );
      
      // Associated symptoms
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('headache') || 
        s.toLowerCase().includes('nausea') || 
        s.toLowerCase().includes('vomiting')
      );
      
      return severeEyePain && visionChanges && associatedSymptoms;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Acute angle-closure glaucoma: severe eye pain, vision changes, and associated symptoms. Immediate IOP reduction and ophthalmology consult required. Risk of permanent vision loss if delayed >6-12 hours.',
      confidence: 0.95
    }
  },
  {
    id: 'OPHTHAL-3',
    name: 'Retinal Detachment',
    category: 'Ophthalmological',
    weight: 8,
    match: (input) => {
      // Classic symptoms
      const classicSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('floaters') || 
        s.toLowerCase().includes('flashes') || 
        s.toLowerCase().includes('curtain') || 
        s.toLowerCase().includes('shadow') || 
        s.toLowerCase().includes('vision loss')
      );
      
      // Risk factors
      const riskFactors = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('myopia') || 
        h.toLowerCase().includes('retinal detachment') || 
        h.toLowerCase().includes('trauma')
      );
      
      return classicSymptoms && riskFactors;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Retinal detachment: classic symptoms and risk factors. Same-day evaluation and surgical intervention required to prevent permanent vision loss.',
      confidence: 0.9
    }
  },
  // --- Pediatric-Specific Rules ---
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
  }
];

export const enhancedTriageRules: EnhancedTriageRule[] = [
  // --- Cardiac & Circulatory Rules ---
  {
    id: 'CARD-1',
    name: 'STEMI (Suspected Acute MI)',
    category: 'Cardiac',
    weight: 10,
    match: (input) => {
      // Enhanced STEMI criteria using more comprehensive assessment
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain') || s.toLowerCase().includes('chest pressure') || s.toLowerCase().includes('chest discomfort'));
      const typicalFeatures = input.symptoms.some(s => 
        s.toLowerCase().includes('crushing') || 
        s.toLowerCase().includes('radiat') ||
        s.toLowerCase().includes('left arm') ||
        s.toLowerCase().includes('jaw') ||
        s.toLowerCase().includes('burning')
      );
      
      const highRiskHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('mi') || 
        h.toLowerCase().includes('coronary') || 
        h.toLowerCase().includes('stent') || 
        h.toLowerCase().includes('cabg')
      );
      
      const diabetesHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      
      const stFlag = input.flags?.includes('st_elevation') || input.flags?.includes('stemi');
      const troponinFlag = input.flags?.includes('troponin_positive');
      
      // Match classic presentation OR elevated troponin/ST elevation
      return (chestPain && typicalFeatures && (highRiskHistory || diabetesHistory || input.age > 50)) || stFlag || troponinFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected STEMI: classic chest pain with risk factors or positive cardiac markers. Immediate ECG and cardiac consult required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-1b',
    name: 'Suspected NSTEMI/Unstable Angina',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      // Core symptoms
      const chestPain = input.symptoms.some(s => 
        s.toLowerCase().includes('chest pain') || 
        s.toLowerCase().includes('chest pressure') || 
        s.toLowerCase().includes('chest discomfort')
      );
      
      // Rest pain or crescendo pattern is concerning for ACS
      const unstablePattern = input.symptoms.some(s => 
        s.toLowerCase().includes('rest') || 
        s.toLowerCase().includes('worsening') || 
        s.toLowerCase().includes('more frequent') || 
        s.toLowerCase().includes('prolonged')
      );
      
      // Associated symptoms
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('sweating') || 
        s.toLowerCase().includes('nausea')
      );
      
      return chestPain && (unstablePattern || associatedSymptoms) && !input.flags?.includes('st_elevation');
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected NSTEMI/Unstable Angina: chest pain with unstable pattern or associated symptoms. Immediate ECG and cardiac evaluation required.',
      confidence: 0.9
    }
  },
  {
    id: 'CARD-2',
    name: 'High-Risk Chest Pain',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain'));
      const age = input.age || 0;
      const diabetes = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      const priorMI = (input.medicalHistory || []).some(h => h.toLowerCase().includes('mi'));
      return chestPain && (age > 65 || diabetes || priorMI);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'High-risk chest pain (elderly, diabetes, or prior MI). Treat as ACS until proven otherwise.',
      confidence: 0.85
    }
  },
  {
    id: 'CARD-3',
    name: 'Cardiac Arrest',
    category: 'Cardiac',
    weight: 10,
    match: (input) => 
      input.flags?.includes('cardiac_arrest') || 
      input.flags?.includes('no_pulse') || 
      input.symptoms.some(s => s.toLowerCase().includes('cardiac arrest') || s.toLowerCase().includes('no pulse')),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Cardiac arrest detected. Immediate resuscitation and post-ROSC care required.',
      confidence: 0.99
    }
  },
  {
    id: 'CARD-4',
    name: 'Life-Threatening Arrhythmia',
    category: 'Cardiac',
    weight: 9,
    match: (input) => input.flags?.includes('vfib') || input.flags?.includes('vtach') || input.flags?.includes('bradycardia') || input.flags?.includes('heart_block'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Life-threatening arrhythmia detected (VF, VT, bradycardia, or heart block). Immediate intervention required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-5',
    name: 'Heart Failure with Respiratory Distress',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const heartFailureHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('heart failure'));
      const acuteDistress = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('dyspnea') || 
        s.toLowerCase().includes('orthopnea') || 
        s.toLowerCase().includes('paroxysmal nocturnal')
      );
      const hypoxemia = (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94);
      
      // Expanded to catch both known and new heart failure
      return (acuteDistress && (heartFailureHistory || input.symptoms.some(s => 
        s.toLowerCase().includes('edema') || 
        s.toLowerCase().includes('swelling') ||
import type { TriageRequest, TriageRuleResult } from '@/types/triage';

export interface EnhancedTriageRule {
  id: string;
  name: string;
  category: string;
  weight: number;
  match: (input: TriageRequest) => boolean;
  result: Omit<TriageRuleResult, 'explainability'> & {
    explain: string;
    confidence?: number;
  };
}

export const enhancedTriageRules: EnhancedTriageRule[] = [
  // --- Cardiac & Circulatory Rules ---
  {
    id: 'CARD-1',
    name: 'STEMI (Suspected Acute MI)',
    category: 'Cardiac',
    weight: 10,
    match: (input) => {
      // Enhanced STEMI criteria using more comprehensive assessment
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain') || s.toLowerCase().includes('chest pressure') || s.toLowerCase().includes('chest discomfort'));
      const typicalFeatures = input.symptoms.some(s => 
        s.toLowerCase().includes('crushing') || 
        s.toLowerCase().includes('radiat') ||
        s.toLowerCase().includes('left arm') ||
        s.toLowerCase().includes('jaw') ||
        s.toLowerCase().includes('burning')
      );
      
      const highRiskHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('mi') || 
        h.toLowerCase().includes('coronary') || 
        h.toLowerCase().includes('stent') || 
        h.toLowerCase().includes('cabg')
      );
      
      const diabetesHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      
      const stFlag = input.flags?.includes('st_elevation') || input.flags?.includes('stemi');
      const troponinFlag = input.flags?.includes('troponin_positive');
      
      // Match classic presentation OR elevated troponin/ST elevation
      return (chestPain && typicalFeatures && (highRiskHistory || diabetesHistory || input.age > 50)) || stFlag || troponinFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected STEMI: classic chest pain with risk factors or positive cardiac markers. Immediate ECG and cardiac consult required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-1b',
    name: 'Suspected NSTEMI/Unstable Angina',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      // Core symptoms
      const chestPain = input.symptoms.some(s => 
        s.toLowerCase().includes('chest pain') || 
        s.toLowerCase().includes('chest pressure') || 
        s.toLowerCase().includes('chest discomfort')
      );
      
      // Rest pain or crescendo pattern is concerning for ACS
      const unstablePattern = input.symptoms.some(s => 
        s.toLowerCase().includes('rest') || 
        s.toLowerCase().includes('worsening') || 
        s.toLowerCase().includes('more frequent') || 
        s.toLowerCase().includes('prolonged')
      );
      
      // Associated symptoms
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('sweating') || 
        s.toLowerCase().includes('nausea')
      );
      
      return chestPain && (unstablePattern || associatedSymptoms) && !input.flags?.includes('st_elevation');
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected NSTEMI/Unstable Angina: chest pain with unstable pattern or associated symptoms. Immediate ECG and cardiac evaluation required.',
      confidence: 0.9
    }
  },
  {
    id: 'CARD-2',
    name: 'High-Risk Chest Pain',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain'));
      const age = input.age || 0;
      const diabetes = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      const priorMI = (input.medicalHistory || []).some(h => h.toLowerCase().includes('mi'));
      return chestPain && (age > 65 || diabetes || priorMI);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'High-risk chest pain (elderly, diabetes, or prior MI). Treat as ACS until proven otherwise.',
      confidence: 0.85
    }
  },
  {
    id: 'CARD-3',
    name: 'Cardiac Arrest',
    category: 'Cardiac',
    weight: 10,
    match: (input) => 
      input.flags?.includes('cardiac_arrest') || 
      input.flags?.includes('no_pulse') || 
      input.symptoms.some(s => s.toLowerCase().includes('cardiac arrest') || s.toLowerCase().includes('no pulse')),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Cardiac arrest detected. Immediate resuscitation and post-ROSC care required.',
      confidence: 0.99
    }
  },
  {
    id: 'CARD-4',
    name: 'Life-Threatening Arrhythmia',
    category: 'Cardiac',
    weight: 9,
    match: (input) => input.flags?.includes('vfib') || input.flags?.includes('vtach') || input.flags?.includes('bradycardia') || input.flags?.includes('heart_block'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Life-threatening arrhythmia detected (VF, VT, bradycardia, or heart block). Immediate intervention required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-5',
    name: 'Heart Failure with Respiratory Distress',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const heartFailureHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('heart failure'));
      const acuteDistress = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('dyspnea') || 
        s.toLowerCase().includes('orthopnea') || 
        s.toLowerCase().includes('paroxysmal nocturnal')
      );
      const hypoxemia = (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94);
      
      // Expanded to catch both known and new heart failure
      return (acuteDistress && (heartFailureHistory || input.symptoms.some(s => 
        s.toLowerCase().includes('edema') || 
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('jvd') ||
        s.toLowerCase().includes('heart failure')
      ))) && hypoxemia;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Acute heart failure with respiratory distress and hypoxemia. Immediate stabilization and treatment required.',
      confidence: 0.92
    }
  },
  {
    id: 'CARD-5b',
    id: 'CARD-6',
    name: 'Hypertensive Emergency',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const sbp = input.vitals?.systolicBP || 0;
      const endOrgan = input.flags?.includes('end_organ_damage');
      return sbp > 180 && endOrgan;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Hypertensive emergency: SBP >180 with end-organ damage. Immediate BP control and monitoring required.',
      confidence: 0.93
    }
  },
  // Airway, Breathing, Circulation (ABC)
  {
    id: 'ABC-1',
    name: 'Airway Compromise',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('airway_compromise') || input.flags?.includes('stridor') || input.symptoms.includes('unable_to_speak'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Anesthesiology', type: 'secondary' }
      ],
      explain: 'Airway compromise detected → Critical priority for immediate airway intervention.',
      confidence: 0.98
    }
  },
  {
    id: 'ABC-2',
    name: 'Respiratory Failure',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('no_breath') || input.flags?.includes('ineffective_breathing') || (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate < 8),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Respiratory failure or severe bradypnea detected → Critical priority for ventilatory support.',
      confidence: 0.97
    }
  },
  {
    id: 'ABC-3',
    name: 'Severe Hypoxemia',
    category: 'ABC',
    weight: 9,
    match: (input) => (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 85) || input.flags?.includes('cyanosis'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe hypoxemia (SpO₂ < 85%) → Critical priority for oxygenation.',
      confidence: 0.95
    }
  },
  // --- Respiratory Rules ---
  {
    id: 'RESP-1',
    name: 'Acute Respiratory Failure',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      const rr = input.vitals?.respiratoryRate;
      const spo2 = input.vitals?.oxygenSaturation;
      return (rr !== undefined && (rr > 30 || rr < 8)) || (spo2 !== undefined && spo2 < 90) || (input.flags?.includes('severe_respiratory_distress'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Acute respiratory failure: abnormal RR or SpO₂ < 90%, or severe distress. Immediate airway and ventilatory support required.',
      confidence: 0.95
    }
  },
  {
    id: 'RESP-2',
    name: 'Tension Pneumothorax',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('tension_pneumothorax') || (input.symptoms.some(s => s.toLowerCase().includes('chest pain')) && input.flags?.includes('deviated_trachea'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Tension pneumothorax suspected: chest pain with deviated trachea or flag. Immediate needle decompression required.',
      confidence: 0.97
    }
  },
  {
    id: 'RESP-3',
    name: 'Severe Asthma Exacerbation',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      // Life-threatening features
      const lifeThreatening = 
        input.flags?.includes('silent_chest') || 
        input.flags?.includes('cyanosis') || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis') || 
          s.toLowerCase().includes('altered consciousness') ||
          s.toLowerCase().includes('exhaustion')
        );
      
      // Severe features per GINA guidelines
      const severeFeatures = 
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 90) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('complete sentence')) ||
          (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('<50%')) ||
          (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('<50%')) ||
          s.toLowerCase().includes('accessory muscle') ||
          s.toLowerCase().includes('tripod position') ||
          (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe'))
        );
      
      // Direct mention of severe asthma
      const severeAsthma = input.symptoms.some(s => 
        (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe')) ||
        (s.toLowerCase().includes('status asthmaticus'))
      );
      
      // Include flag-based detection
      const severeFlag = 
        input.flags?.includes('severe_asthma') || 
        input.flags?.includes('status_asthmaticus');
      
      return lifeThreatening || severeFeatures || severeAsthma || severeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe asthma exacerbation with life-threatening or severe features. Immediate continuous bronchodilators, steroids, and possible respiratory support required.',
      confidence: 0.93
    }
  },
  {
    id: 'RESP-4',
    name: 'Pulmonary Embolism (High-Risk)',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      const spo2 = input.vitals?.oxygenSaturation;
      const hr = input.vitals?.heartRate;
      return input.flags?.includes('high_risk_pe') || (spo2 !== undefined && spo2 < 92 && hr !== undefined && hr > 110 && input.symptoms.some(s => s.toLowerCase().includes('pleuritic pain')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'High-risk pulmonary embolism: hypoxemia, tachycardia, pleuritic pain. Immediate imaging and anticoagulation required.',
      confidence: 0.92
    }
  },
  {
    id: 'RESP-5',
    name: 'Moderate Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      // Moderate features per GINA/GOLD guidelines
      const moderateFeatures = 
        ((input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation >= 90 && input.vitals.oxygenSaturation < 94) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 20 && input.vitals.respiratoryRate <= 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100 && input.vitals.heartRate <= 120)) &&
        // Not meeting severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma');
      
      // Not meeting moderate criteria
      const moderateFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          (s.toLowerCase().includes('moderate') || s.toLowerCase().includes('worse'))) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('walking'))
      );
      
      // Direct mention of moderate exacerbation
      const moderateExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('moderate')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('exacerbation') && 
        !s.toLowerCase().includes('severe') && 
        !s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const moderateFlag = input.flags?.includes('moderate_asthma') || input.flags?.includes('moderate_copd');
      
      return (moderateFeatures || moderateFunctional || moderateExacerbation || moderateFlag) && 
        // Exclude those meeting severe criteria
        !input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis')
        );
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Moderate asthma/COPD exacerbation: increased work of breathing but without severe features. Requires prompt bronchodilators, steroids, and monitoring.',
      confidence: 0.85
    }
  },
  {
    id: 'RESP-6',
    name: 'Community-Acquired Pneumonia (Concerning Vitals)',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumonia')) && (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 24);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Community-acquired pneumonia with tachypnea. Requires prompt antibiotics and monitoring.',
      confidence: 0.83
    }
  },
  {
    id: 'RESP-7',
    name: 'Spontaneous Pneumothorax (Stable)',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumothorax')) && !(input.flags?.includes('tension_pneumothorax'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Spontaneous pneumothorax (stable): requires monitoring and possible intervention.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-8',
    name: 'Hemoptysis with Risk Factors',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('hemoptysis')) && (input.medicalHistory || []).some(h => h.toLowerCase().includes('cancer') || h.toLowerCase().includes('tb'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Hemoptysis with risk factors (cancer, TB). Requires urgent evaluation for underlying cause.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-9',
    name: 'Mild Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 4,
    match: (input) => {
      // Mild features per GINA/GOLD guidelines
      const mildFeatures = 
        ((input.vitals?.oxygenSaturation === undefined || input.vitals.oxygenSaturation >= 94) &&
        (input.vitals?.respiratoryRate === undefined || input.vitals.respiratoryRate <= 20) &&
        (input.vitals?.heartRate === undefined || input.vitals.heartRate <= 100)) &&
        // Not meeting moderate or severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma') &&
        !input.flags?.includes('moderate_asthma');
      
      // Minimal functional limitations
      const mildFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('mild')) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('>80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('>80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('exertion'))
      );
      
      // Direct mention of mild exacerbation
      const mildExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('mild')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('exacerbation') && 
          s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const mildFlag = input.flags?.includes('mild_asthma') || input.flags?.includes('mild_copd');
      
      // Normal activities and sleep not affected significantly
      const minimalImpact = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('minimal impact')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('well controlled'))
      );
      
      return (mildFeatures || mildFunctional || mildExacerbation || mildFlag || minimalImpact) && 
        // Exclude those meeting moderate or severe criteria
        !input.symptoms.some(s => 
          s.toLowerCase().includes('moderate') || 
          s.toLowerCase().includes('severe') ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Mild asthma/COPD exacerbation with minimal impact on function and normal vital signs. Can be managed with bronchodilators and short-term steroids in outpatient setting.',
      confidence: 0.7
    }
  },
  {
    id: 'RESP-10',
    name: 'Upper Respiratory Infection (Normal Vitals)',
    category: 'Respiratory',
    weight: 3,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('uri') || s.toLowerCase().includes('upper respiratory infection')) && (!input.vitals || (input.vitals.respiratoryRate === undefined || input.vitals.respiratoryRate <= 20));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 4,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Upper respiratory infection with normal vitals: routine care.',
      confidence: 0.6
    }
  },
  {
    id: 'RESP-11',
    name: 'Chronic Cough (Stable)',
    category: 'Respiratory',
    weight: 2,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('chronic cough')) && (!input.vitals || (input.vitals.oxygenSaturation === undefined || input.vitals.oxygenSaturation >= 94));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 5,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Chronic cough with stable vitals: non-urgent evaluation.',
      confidence: 0.5
    }
  },
  // --- Neurological Rules ---
  {
    id: 'NEURO-1',
    name: 'Acute Stroke (FAST Positive)',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Enhanced stroke detection using expanded FAST-ED criteria
      const strokeSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('facial droop') || 
        s.toLowerCase().includes('face droop') || 
        s.toLowerCase().includes('arm weakness') || 
        s.toLowerCase().includes('leg weakness') || 
        (s.toLowerCase().includes('speech') && (
          s.toLowerCase().includes('slurred') || 
          s.toLowerCase().includes('difficulty') || 
          s.toLowerCase().includes('aphasia')
        )) ||
        s.toLowerCase().includes('stroke') ||
        s.toLowerCase().includes('hemiparesis') ||
        s.toLowerCase().includes('hemineglect') ||
        s.toLowerCase().includes('visual field')
      );
      
      // Time is brain - time factors are crucial
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_4.5h') || 
        input.flags?.includes('onset_under_24h') || 
        input.symptoms.some(s => s.toLowerCase().includes('last known well') && s.toLowerCase().includes('hour'));
      
      const strokeFlag = input.flags?.includes('stroke') || input.flags?.includes('cva');
      
      // Either explicit stroke symptoms or stroke flag, with time sensitivity
      return (strokeSigns || strokeFlag) && (timeFlag || !input.flags?.includes('onset_over_24h'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Acute stroke suspected: FAST positive (face, arm, speech, time). Immediate stroke protocol activation and time-sensitive imaging required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-1b',
    name: 'Suspected Large Vessel Occlusion Stroke',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Signs of severe neurological deficit suggesting LVO
      const lvoSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('gaze deviation') || 
        (s.toLowerCase().includes('severe') && s.toLowerCase().includes('deficit')) ||
        (s.toLowerCase().includes('multiple') && s.toLowerCase().includes('deficit')) ||
        s.toLowerCase().includes('aphasia') ||
        s.toLowerCase().includes('neglect')
      );
      
      // High NIHSS or specific flag
      const severityFlag = 
        input.flags?.includes('lvo') || 
        input.flags?.includes('high_nihss') || 
        input.flags?.includes('severe_stroke');
      
      // Time window for endovascular intervention is longer
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_24h');
      
      return (lvoSigns || severityFlag) && timeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' },
        { name: 'Interventional Radiology', type: 'tertiary' }
      ],
      explain: 'Suspected large vessel occlusion stroke: severe deficits within intervention window. Immediate CTA and thrombectomy evaluation required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-2',
    name: 'Status Epilepticus',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('status_epilepticus') || 
        input.flags?.includes('ongoing_seizure') || 
        input.symptoms.some(s => s.toLowerCase().includes('seizure') && (s.toLowerCase().includes('continuous') || s.toLowerCase().includes('multiple')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Status epilepticus: ongoing seizure or multiple seizures without recovery. Immediate anticonvulsant therapy required.',
      confidence: 0.98
    }
  },
  {
    id: 'NEURO-3',
    name: 'Altered Mental Status (GCS < 9)',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      return (input.vitals?.gcs !== undefined && input.vitals.gcs < 9) || 
        input.flags?.includes('unresponsive') || 
        input.symptoms.some(s => s.toLowerCase().includes('unconscious'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Severe altered mental status: GCS < 9 or unresponsive. Immediate airway management and neurological evaluation required.',
      confidence: 0.96
    }
  },
  {
    id: 'NEURO-4',
    name: 'Thunderclap Headache',
    category: 'Neurological',
    weight: 9,
    match: (input) => {
      // Enhanced criteria for thunderclap headache
      const thunderclapFeatures = input.symptoms.some(s => 
        (s.toLowerCase().includes('headache') && (
          s.toLowerCase().includes('worst') || 
          s.toLowerCase().includes('thunderclap') || 
          s.toLowerCase().includes('sudden') ||
          s.toLowerCase().includes('severe') ||
          s.toLowerCase().includes('explosive')
        )) ||
        s.toLowerCase().includes('subarachnoid')
      );
      
      // Associated signs that increase concern
      const concerningSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('neck stiffness') || 
        s.toLowerCase().includes('photophobia') ||
        s.toLowerCase().includes('vomiting') ||
        s.toLowerCase().includes('altered') ||
        s.toLowerCase().includes('neurological')
      ) || input.flags?.includes('meningeal_signs');
      
      return thunderclapFeatures || 
        input.flags?.includes('thunderclap_headache') || 
        (input.symptoms.some(s => s.toLowerCase().includes('headache')) && concerningSigns);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Thunderclap headache: sudden, severe, worst-ever or with concerning features. Immediate evaluation for subarachnoid hemorrhage required.',
      confidence: 0.93
    }
  },
  {
    id: 'NEURO-5',
    name: 'Acute Spinal Cord Compression',
    category: 'Neurological',
    weight: 9,
    match: (input) => {
      return input.flags?.includes('cord_compression') || 
        input.symptoms.some(s => 
          (s.toLowerCase().includes('paralysis') || s.toLowerCase().includes('weakness')) && 
          (s.toLowerCase().includes('legs') || s.toLowerCase().includes('arms'))
        ) && input.symptoms.some(s => s.toLowerCase().includes('bladder') || s.toLowerCase().includes('bowel'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' }
      ],
      explain: 'Acute spinal cord compression: limb weakness with bowel/bladder dysfunction. Immediate imaging and neurosurgical consultation required.',
      confidence: 0.92
    }
  },
  {
    id: 'NEURO-5b',
    name: 'Intracranial Hemorrhage',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Direct mention or signs
      const bleedSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('intracranial hemorrhage') || 
        s.toLowerCase().includes('ich') || 
        s.toLowerCase().includes('cerebral hemorrhage') ||
        s.toLowerCase().includes('brain bleed') ||
        s.toLowerCase().includes('hemorrhagic stroke')
      );
      
      // With neurological deficit
      const deficits = input.symptoms.some(s => 
        s.toLowerCase().includes('weakness') || 
        s.toLowerCase().includes('numbness') ||
        s.toLowerCase().includes('speech') ||
        s.toLowerCase().includes('vision') ||
        s.toLowerCase().includes('level of consciousness')
      );
      
      // Flag for any intracranial bleed
      const bleedFlag = 
        input.flags?.includes('intracranial_hemorrhage') || 
        input.flags?.includes('brain_bleed') || 
        input.flags?.includes('hemorrhagic_stroke');
      
      return bleedSigns || bleedFlag || (input.symptoms.some(s => s.toLowerCase().includes('severe headache')) && deficits);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' },
        { name: 'Neurology', type: 'tertiary' }
      ],
      explain: 'Suspected intracranial hemorrhage. Immediate head CT and neurosurgical evaluation required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-6',
    name: 'First-Time Seizure',
    category: 'Neurological',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('seizure') && s.toLowerCase().includes('first')) && 
        !input.medicalHistory?.some(h => h.toLowerCase().includes('epilepsy') || h.toLowerCase().includes('seizure'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'First-time seizure (now resolved): requires prompt evaluation for underlying cause.',
      confidence: 0.89
    }
  },
  {
    id: 'NEURO-7',
    name: 'Transient Ischemic Attack',
    category: 'Neurological',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('tia') || 
        (s.toLowerCase().includes('stroke') && s.toLowerCase().includes('resolved')));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Transient Ischemic Attack: resolved focal neurological symptoms. Requires prompt evaluation to prevent stroke.',
      confidence: 0.85
    }
  },
  {
    id: 'NEURO-8',
    name: 'Migraine with Neurological Deficits',
    category: 'Neurological',
    weight: 6,
    match: (input) => {
      // Enhanced detection of migraine with aura
      const migraine = input.symptoms.some(s => s.toLowerCase().includes('migraine'));
      
      const auraSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('aura') || 
        s.toLowerCase().includes('visual') || 
        s.toLowerCase().includes('scintillating') || 
        s.toLowerCase().includes('scotoma') || 
        s.toLowerCase().includes('numbness') || 
        s.toLowerCase().includes('tingling') ||
        s.toLowerCase().includes('paresthesia')
      );
      
      // History of similar episodes reduces concern
      const knownHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('migraine with aura') || 
        h.toLowerCase().includes('complex migraine')
      );
      
      // First time is more concerning than recurrent with same pattern
      const firstTimeFlag = input.flags?.includes('first_time') || input.symptoms.some(s => s.toLowerCase().includes('first') && s.toLowerCase().includes('time'));
      
      // Concerning if first time or different from usual pattern
      return migraine && auraSymptoms && (firstTimeFlag || input.symptoms.some(s => s.toLowerCase().includes('different')) || !knownHistory);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Migraine with neurological deficits (atypical or first-time): requires evaluation to rule out more serious conditions.',
      confidence: 0.8
    }
  },
  {
    id: 'NEURO-9',
    name: 'Vertigo with Neurological Symptoms',
    category: 'Neurological',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('vertigo')) && 
        (input.symptoms.some(s => 
          s.toLowerCase().includes('double vision') || 
          s.toLowerCase().includes('diplopia') || 
          s.toLowerCase().includes('dysarthria') || 
          s.toLowerCase().includes('ataxia') || 
          s.toLowerCase().includes('weakness')
        ) || 
        input.flags?.includes('central_vertigo'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Vertigo with neurological symptoms: concerning for central cause. Requires neurological evaluation.',
      confidence: 0.82
    }
  },
  {
    id: 'NEURO-10',
    name: 'Uncomplicated Syncope in Young, Healthy Patient',
    category: 'Neurological',
    weight: 4,
    match: (input) => {
      const age = input.age || 0;
      return input.symptoms.some(s => s.toLowerCase().includes('syncope') || s.toLowerCase().includes('fainting')) && 
        age < 40 && 
        !(input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('heart') || 
          h.toLowerCase().includes('cardiac') || 
          h.toLowerCase().includes('epilepsy')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Uncomplicated syncope in young, healthy patient: likely vasovagal. Requires standard evaluation.',
      confidence: 0.75
    }
  },
  {
    id: 'NEURO-11',
    name: 'Chronic Stable Headache',
    category: 'Neurological',
    weight: 3,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('headache') && (s.toLowerCase().includes('chronic') || s.toLowerCase().includes('recurring'))) && 
        !input.symptoms.some(s => 
          s.toLowerCase().includes('worst') || 
          s.toLowerCase().includes('new') || 
          s.toLowerCase().includes('neurological') || 
          s.toLowerCase().includes('fever')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 4,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Chronic stable headache pattern: routine evaluation for management.',
      confidence: 0.7
    }
  },
  // --- Ophthalmological Rules ---
  {
    id: 'OPHTHAL-1',
    name: 'Chemical Eye Burn',
    category: 'Ophthalmological',
    weight: 10,
    match: (input) => {
      // Chemical exposure to the eye
      const chemicalExposure = input.symptoms.some(s => 
        s.toLowerCase().includes('chemical') || 
        s.toLowerCase().includes('acid') || 
        s.toLowerCase().includes('alkali') || 
        s.toLowerCase().includes('bleach') || 
        s.toLowerCase().includes('caustic') || 
        s.toLowerCase().includes('irritant') || 
        s.toLowerCase().includes('corrosive')
      );
      
      // Eye pain, burning, vision changes
      const eyeSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('eye pain') || 
        s.toLowerCase().includes('burning') || 
        s.toLowerCase().includes('vision change') || 
        s.toLowerCase().includes('blurry vision') || 
        s.toLowerCase().includes('red eye') || 
        s.toLowerCase().includes('tearing')
      );
      
      // Time-critical nature and risk of permanent vision loss
      const timeCritical = input.symptoms.some(s => 
        s.toLowerCase().includes('immediate') || 
        s.toLowerCase().includes('urgent') || 
        s.toLowerCase().includes('now') || 
        s.toLowerCase().includes('within minutes')
      );
      
      return chemicalExposure && eyeSymptoms && timeCritical;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Chemical eye burn: immediate ophthalmological evaluation and irrigation required to prevent permanent vision loss within minutes.',
      confidence: 0.95
    }
  },
  {
    id: 'OPHTHAL-2',
    name: 'Acute Angle-Closure Glaucoma',
    category: 'Ophthalmological',
    weight: 9,
    match: (input) => {
      // Severe eye pain, vision changes, halos around lights
      const severeSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('severe eye pain') || 
        s.toLowerCase().includes('vision change') || 
        s.toLowerCase().includes('halo') || 
        s.toLowerCase().includes('blurry vision') || 
        s.toLowerCase().includes('red eye') || 
        s.toLowerCase().includes('tearing')
      );
      
      // Associated symptoms: headache, nausea, vomiting
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('headache') || 
        s.toLowerCase().includes('nausea') || 
        s.toLowerCase().includes('vomiting')
      );
      
      // Risk of permanent vision loss if delayed >6-12 hours
      const timeCritical = input.symptoms.some(s => 
        s.toLowerCase().includes('urgent') || 
        s.toLowerCase().includes('now') || 
        s.toLowerCase().includes('immediate') || 
        s.toLowerCase().includes('within hours')
      );
      
      return severeSymptoms && associatedSymptoms && timeCritical;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Acute angle-closure glaucoma: immediate ophthalmological evaluation and IOP reduction required to prevent permanent vision loss within hours.',
      confidence: 0.92
    }
  },
  {
    id: 'OPHTHAL-3',
    name: 'Retinal Detachment',
    category: 'Ophthalmological',
    weight: 8,
    match: (input) => {
      // Classic symptoms: floaters, flashes of light, curtain/shadow in vision
      const classicSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('floaters') || 
        s.toLowerCase().includes('flashes') || 
        s.toLowerCase().includes('curtain') || 
        s.toLowerCase().includes('shadow') || 
        s.toLowerCase().includes('vision loss')
      );
      
      // Risk factors: myopia, previous detachment, trauma
      const riskFactors = input.symptoms.some(s => 
        s.toLowerCase().includes('myopia') || 
        s.toLowerCase().includes('detachment') || 
        s.toLowerCase().includes('trauma') || 
        s.toLowerCase().includes('injury')
      );
      
      // Same-day evaluation and surgical intervention required
      const timeCritical = input.symptoms.some(s => 
        s.toLowerCase().includes('urgent') || 
        s.toLowerCase().includes('now') || 
        s.toLowerCase().includes('immediate') || 
        s.toLowerCase().includes('today')
      );
      
      return classicSymptoms && (riskFactors || timeCritical);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Retinal detachment: same-day ophthalmological evaluation and surgical intervention required to prevent permanent vision loss.',
      confidence: 0.9
    }
  },
  // --- ENT Rules ---
  {
    id: 'ENT-1',
    name: 'Severe Epistaxis',
    category: 'ENT',
    weight: 8,
    match: (input) => {
      // Severe or uncontrolled nosebleeds
      const severeNosebleed = input.symptoms.some(s => 
        s.toLowerCase().includes('epistaxis') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('uncontrolled') || 
          s.toLowerCase().includes('profuse') || 
          s.toLowerCase().includes('recurrent')
        )
      );
      
      // Hypovolemic signs: dizziness, lightheadedness, syncope
      const hypovolemicSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('dizziness') || 
        s.toLowerCase().includes('lightheaded') || 
        s.toLowerCase().includes('syncope')
      );
      
      // Posterior bleeding, anticoagulation risk
      const posteriorBleeding = input.symptoms.some(s => 
        s.toLowerCase().includes('posterior') || 
        s.toLowerCase().includes('back') || 
        s.toLowerCase().includes('anticoagulation') || 
        s.toLowerCase().includes('blood thinner')
      );
      
      // Potential for life-threatening blood loss and airway compromise
      const airwayConcern = input.symptoms.some(s => 
        s.toLowerCase().includes('airway') || 
        s.toLowerCase().includes('breathing') || 
        s.toLowerCase().includes('difficulty')
      );
      
      return severeNosebleed && (hypovolemicSigns || posteriorBleeding || airwayConcern);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'ENT', type: 'secondary' }
      ],
      explain: 'Severe epistaxis: life-threatening condition requiring immediate ENT evaluation and intervention to control bleeding and assess airway.',
      confidence: 0.9
    }
  },
  {
    id: 'ENT-2',
    name: 'Airway Foreign Body',
    category: 'ENT',
    weight: 10,
    match: (input) => {
      // Choking, foreign bodies in the airway/throat
      const choking = input.symptoms.some(s => 
        s.toLowerCase().includes('choking') || 
        s.toLowerCase().includes('foreign body') || 
        s.toLowerCase().includes('obstruction') || 
        s.toLowerCase().includes('airway')
      );
      
      // Signs of airway obstruction: coughing, gagging, difficulty breathing
      const obstructionSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('coughing') || 
        s.toLowerCase().includes('gagging') || 
        s.toLowerCase().includes('difficulty breathing')
      );
      
      // Aspiration history: coughing up blood, foreign material
      const aspirationHistory = input.symptoms.some(s => 
        s.toLowerCase().includes('blood') || 
        s.toLowerCase().includes('foreign material') || 
        s.toLowerCase().includes('aspiration')
      );
      
      // Life-threatening nature requiring rapid intervention
      const lifeThreatening = input.symptoms.some(s => 
        s.toLowerCase().includes('urgent') || 
        s.toLowerCase().includes('emergency') || 
        s.toLowerCase().includes('immediate')
      );
      
      return choking && (obstructionSigns || aspirationHistory || lifeThreatening);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'ENT', type: 'secondary' }
      ],
      explain: 'Airway foreign body: life-threatening condition requiring immediate ENT evaluation and intervention to remove foreign body and assess airway.',
      confidence: 0.95
    }
  },
  {
    id: 'ENT-3',
    name: 'Deep Space Neck Infection',
    category: 'ENT',
    weight: 9,
    match: (input) => {
      // Conditions like Ludwig's angina, retropharyngeal abscess, peritonsillar abscess
      const deepSpaceInfections = input.symptoms.some(s => 
        s.toLowerCase().includes('ludwig') || 
        s.toLowerCase().includes('retropharyngeal') || 
        s.toLowerCase().includes('peritonsillar') || 
        s.toLowerCase().includes('abscess')
      );
      
      // Neck symptoms: pain, swelling, difficulty swallowing
      const neckSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('neck pain') || 
        s.toLowerCase().includes('swelling') || 
        s.toLowerCase().includes('difficulty swallowing')
      );
      
      // Systemic infection signs: fever, malaise, leukocytosis
      const systemicInfectionSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('fever') || 
        s.toLowerCase().includes('malaise') || 
        s.toLowerCase().includes('leukocytosis')
      );
      
      // Airway compromise: drooling, difficulty breathing
      const airwayCompromise = input.symptoms.some(s => 
        s.toLowerCase().includes('drooling') || 
        s.toLowerCase().includes('difficulty breathing')
      );
      
      // Rapid progression, risk of airway compromise, mediastinal spread, sepsis
      const rapidProgression = input.symptoms.some(s => 
        s.toLowerCase().includes('rapid') || 
        s.toLowerCase().includes('progression') || 
        s.toLowerCase().includes('sepsis')
      );
      
      return deepSpaceInfections && (neckSymptoms || systemicInfectionSigns || airwayCompromise || rapidProgression);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'ENT', type: 'secondary' }
      ],
      explain: 'Deep space neck infection: life-threatening condition requiring immediate ENT evaluation and intervention to control infection and assess airway.',
      confidence: 0.92
    }
  },
  // --- Musculoskeletal Rules ---
  {
    id: 'MSK-1',
    name: 'Compartment Syndrome',
    category: 'Musculoskeletal',
    weight: 10,
    match: (input) => {
      // The "6 P's" of compartment syndrome: Pain, Pressure/Pallor, Paresthesia, Paralysis, Pulselessness
      const pain = input.symptoms.some(s => 
        s.toLowerCase().includes('pain') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('disproportionate')
        )
      );
      
      const pressurePallor = input.symptoms.some(s => 
        s.toLowerCase().includes('pressure') || 
        s.toLowerCase().includes('pallor')
      );
      
      const paresthesia = input.symptoms.some(s => 
        s.toLowerCase().includes('tingling') || 
        s.toLowerCase().includes('numbness') || 
        s.toLowerCase().includes('paresthesia')
      );
      
      const paralysis = input.symptoms.some(s => 
        s.toLowerCase().includes('paralysis') || 
        s.toLowerCase().includes('weakness')
      );
      
      const pulselessness = input.symptoms.some(s => 
        s.toLowerCase().includes('pulseless') || 
        s.toLowerCase().includes('no pulse')
      );
      
      // Risk factors: fractures, crush injuries, tight casts, burns
      const riskFactors = input.symptoms.some(s => 
        s.toLowerCase().includes('fracture') || 
        s.toLowerCase().includes('crush injury') || 
        s.toLowerCase().includes('cast') || 
        s.toLowerCase().includes('burn')
      );
      
      // Surgical emergency nature, 6-8 hour time window before irreversible damage
      const surgicalEmergency = input.symptoms.some(s => 
        s.toLowerCase().includes('urgent') || 
        s.toLowerCase().includes('emergency') || 
        s.toLowerCase().includes('immediate')
      );
      
      return (pain && pressurePallor && paresthesia && paralysis && pulselessness) || (riskFactors && surgicalEmergency);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Orthopedics', type: 'secondary' },
        { name: 'Vascular Surgery', type: 'tertiary' }
      ],
      explain: 'Compartment syndrome: surgical emergency requiring immediate fasciotomy to prevent irreversible nerve and muscle damage within 6-8 hours.',
      confidence: 0.95
    }
  },
  {
    id: 'MSK-2',
    name: 'Septic Arthritis',
    category: 'Musculoskeletal',
    weight: 9,
    match: (input) => {
      // Joint symptoms: pain, swelling, redness, warmth
      const jointSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('joint pain') || 
        s.toLowerCase().includes('swelling') || 
        s.toLowerCase().includes('redness') || 
        s.toLowerCase().includes('warmth')
      );
      
      // Reduced mobility, systemic infection signs
      const reducedMobility = input.symptoms.some(s => 
        s.toLowerCase().includes('mobility') || 
        s.toLowerCase().includes('limited') || 
        s.toLowerCase().includes('stiff')
      );
      
      const systemicInfectionSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('fever') || 
        s.toLowerCase().includes('chills') || 
        s.toLowerCase().includes('malaise')
      );
      
      // Key risk factors: immunosuppression, diabetes, prosthetic joints, IV drug use
      const immunosuppression = input.flags?.includes('immunosuppression') || input.medicalHistory?.some(h => h.toLowerCase().includes('immunosuppression'));
      const diabetes = input.flags?.includes('diabetes') || input.medicalHistory?.some(h => h.toLowerCase().includes('diabetes'));
      const prostheticJoint = input.symptoms.some(s => s.toLowerCase().includes('prosthetic'));
      const ivDrugUse = input.flags?.includes('iv_drug_use') || input.medicalHistory?.some(h => h.toLowerCase().includes('iv drug use'));
      
      // Need for immediate joint aspiration, antibiotics, possible surgical intervention
      const urgentIntervention = input.symptoms.some(s => 
        s.toLowerCase().includes('urgent') || 
        s.toLowerCase().includes('emergency') || 
        s.toLowerCase().includes('immediate')
      );
      
      return jointSymptoms && reducedMobility && systemicInfectionSigns && (immunosuppression || diabetes || prostheticJoint || ivDrugUse || urgentIntervention);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Orthopedics', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Septic arthritis: medical emergency requiring joint aspiration, IV antibiotics, and possible surgical irrigation to prevent permanent joint destruction within days.',
      confidence: 0.9
    }
  },
  // --- Dermatological/Cutaneous Rules ---
  {
    id: 'DERM-1',
    name: 'Stevens-Johnson Syndrome / Toxic Epidermal Necrolysis',
    category: 'Dermatological',
    weight: 10,
    match: (input) => {
      // Recent medication exposure (common triggers)
      const medicationExposure = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('medication') || 
          s.toLowerCase().includes('drug') || 
          s.toLowerCase().includes('antibiotic') ||
          s.toLowerCase().includes('anticonvulsant') ||
          s.toLowerCase().includes('allopurinol') ||
          s.toLowerCase().includes('sulfa') ||
          s.toLowerCase().includes('nsaid')
        ) || 
        input.flags?.includes('new_medication') ||
        input.flags?.includes('medication_reaction');
      
      // Prodromal symptoms
      const prodromalSymptoms = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('malaise') ||
          s.toLowerCase().includes('sore throat') ||
          s.toLowerCase().includes('cough') ||
          s.toLowerCase().includes('burning eyes')
        );
      
      // Skin manifestations
      const skinManifestations = input.symptoms.some(s => 
        s.toLowerCase().includes('rash') || 
        s.toLowerCase().includes('blisters') || 
        s.toLowerCase().includes('skin peeling') ||
        s.toLowerCase().includes('skin detachment') ||
        s.toLowerCase().includes('nikolsky sign') ||
        s.toLowerCase().includes('target lesions') ||
        s.toLowerCase().includes('erythema multiforme') ||
        s.toLowerCase().includes('painful skin')
      );
      
      // Critical mucosal involvement (pathognomonic for SJS/TEN)
      const mucosalInvolvement = input.symptoms.some(s => 
        s.toLowerCase().includes('mouth sores') || 
        s.toLowerCase().includes('oral ulcers') || 
        s.toLowerCase().includes('eye pain') || 
        s.toLowerCase().includes('genital sores') ||
        s.toLowerCase().includes('conjunctivitis') ||
        s.toLowerCase().includes('mucosal lesions') ||
        s.toLowerCase().includes('mucosal ulcers')
      );
      
      // Extensive skin involvement (percentage BSA)
      const extensiveSkinInvolvement = input.symptoms.some(s => 
        s.toLowerCase().includes('widespread') || 
        s.toLowerCase().includes('extensive') || 
        s.toLowerCase().includes('all over body') ||
        s.toLowerCase().includes('large area') ||
        s.toLowerCase().includes('entire torso') ||
        s.toLowerCase().includes('multiple regions') ||
        s.toLowerCase().includes('detachment')
      );
      
      // Direct mention of the condition
      const sjstenMention = 
        input.flags?.includes('sjs') ||
        input.flags?.includes('ten') ||
        input.flags?.includes('stevens_johnson') ||
        input.flags?.includes('toxic_epidermal_necrolysis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('stevens-johnson') || 
          s.toLowerCase().includes('toxic epidermal necrolysis') ||
          s.toLowerCase().includes('sjs') ||
          s.toLowerCase().includes('ten') ||
          (s.toLowerCase().includes('skin') && s.toLowerCase().includes('sloughing'))
        );
      
      return sjstenMention || 
        // Classic presentation
        (skinManifestations && mucosalInvolvement && (medicationExposure || prodromalSymptoms)) ||
        // Severe presentation
        (skinManifestations && mucosalInvolvement && extensiveSkinInvolvement);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Dermatology', type: 'secondary' },
        { name: 'Burn Unit', type: 'tertiary' }
      ],
      explain: 'Stevens-Johnson Syndrome/TEN: dermatological emergency with mortality up to 30%. Immediate discontinuation of suspected triggers, fluid resuscitation, specialized wound care, and ocular/mucosal protection required. Cases with >10% BSA involvement (TEN) may need burn unit care.',
      confidence: 0.95
    }
  },
  {
    id: 'DERM-2',
    name: 'Necrotizing Soft Tissue Infection',
    category: 'Dermatological',
    weight: 10,
    match: (input) => {
      // Pain out of proportion (cardinal feature)
      const severeDisproportionatePain = input.symptoms.some(s => 
        (s.toLowerCase().includes('pain') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('extreme') ||
          s.toLowerCase().includes('excruciating') ||
          s.toLowerCase().includes('disproportionate') ||
          s.toLowerCase().includes('out of proportion')
        )) ||
        s.toLowerCase().includes('pain out of proportion')
      );
      
      // Early skin findings (may be subtle initially)
      const earlySkinSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('erythema') ||
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('warm skin') ||
        s.toLowerCase().includes('cellulitis') ||
        s.toLowerCase().includes('induration') ||
        s.toLowerCase().includes('tense skin')
      );
      
      // Late skin findings (more specific but later)
      const lateSkinSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('bullae') ||
        s.toLowerCase().includes('blisters') ||
        s.toLowerCase().includes('skin discoloration') ||
        s.toLowerCase().includes('purple') ||
        s.toLowerCase().includes('dusky') ||
        s.toLowerCase().includes('mottled') ||
        s.toLowerCase().includes('blue') ||
        s.toLowerCase().includes('gray') ||
        s.toLowerCase().includes('black') ||
        s.toLowerCase().includes('necrosis') ||
        s.toLowerCase().includes('crepitus')
      );
      
      // Systemic toxicity
      const systemicToxicity = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.5) || 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100) || 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        input.flags?.includes('toxic_appearance') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') || 
          s.toLowerCase().includes('toxic appearance') ||
          s.toLowerCase().includes('tachycardia') ||
          s.toLowerCase().includes('hypotension') ||
          s.toLowerCase().includes('altered mental status') ||
          s.toLowerCase().includes('weakness')
        );
      
      // Risk factors
      const riskFactors = 
        input.flags?.includes('diabetes') ||
        input.flags?.includes('immunocompromised') ||
        input.flags?.includes('iv_drug_use') ||
        input.flags?.includes('recent_trauma') ||
        input.flags?.includes('recent_surgery') ||
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('diabetes') ||
          h.toLowerCase().includes('immunocompromised') ||
          h.toLowerCase().includes('cancer') ||
          h.toLowerCase().includes('cirrhosis') ||
          h.toLowerCase().includes('renal failure') ||
          h.toLowerCase().includes('alcoholism')
        );
      
      // Direct mention
      const necrotizingMention = 
        input.flags?.includes('necrotizing_fasciitis') ||
        input.flags?.includes('nsti') ||
        input.flags?.includes('necrotizing_infection') ||
        input.flags?.includes('gas_gangrene') ||
        input.flags?.includes('flesh_eating_bacteria') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('necrotizing fasciitis') ||
          s.toLowerCase().includes('necrotizing infection') ||
          s.toLowerCase().includes('nsti') ||
          s.toLowerCase().includes('flesh eating') ||
          s.toLowerCase().includes('gas gangrene')
        );
      
      return necrotizingMention || 
        // Early presentation with high suspicion
        (severeDisproportionatePain && earlySkinSigns && systemicToxicity) ||
        // Late or obvious presentation
        (severeDisproportionatePain && lateSkinSigns) ||
        // High-risk presentation
        (earlySkinSigns && lateSkinSigns && (systemicToxicity || riskFactors));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'General Surgery', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Necrotizing soft tissue infection: cutaneous/surgical emergency with mortality of 20-40%. Requires immediate broad-spectrum antibiotics and urgent surgical debridement. High clinical suspicion is critical as early manifestations may be subtle.',
      confidence: 0.95
    }
  }
];

export const enhancedTriageRules: EnhancedTriageRule[] = [
  // --- Cardiac & Circulatory Rules ---
  {
    id: 'CARD-1',
    name: 'STEMI (Suspected Acute MI)',
    category: 'Cardiac',
    weight: 10,
    match: (input) => {
      // Enhanced STEMI criteria using more comprehensive assessment
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain') || s.toLowerCase().includes('chest pressure') || s.toLowerCase().includes('chest discomfort'));
      const typicalFeatures = input.symptoms.some(s => 
        s.toLowerCase().includes('crushing') || 
        s.toLowerCase().includes('radiat') ||
        s.toLowerCase().includes('left arm') ||
        s.toLowerCase().includes('jaw') ||
        s.toLowerCase().includes('burning')
      );
      
      const highRiskHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('mi') || 
        h.toLowerCase().includes('coronary') || 
        h.toLowerCase().includes('stent') || 
        h.toLowerCase().includes('cabg')
      );
      
      const diabetesHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      
      const stFlag = input.flags?.includes('st_elevation') || input.flags?.includes('stemi');
      const troponinFlag = input.flags?.includes('troponin_positive');
      
      // Match classic presentation OR elevated troponin/ST elevation
      return (chestPain && typicalFeatures && (highRiskHistory || diabetesHistory || input.age > 50)) || stFlag || troponinFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected STEMI: classic chest pain with risk factors or positive cardiac markers. Immediate ECG and cardiac consult required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-1b',
    name: 'Suspected NSTEMI/Unstable Angina',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      // Core symptoms
      const chestPain = input.symptoms.some(s => 
        s.toLowerCase().includes('chest pain') || 
        s.toLowerCase().includes('chest pressure') || 
        s.toLowerCase().includes('chest discomfort')
      );
      
      // Rest pain or crescendo pattern is concerning for ACS
      const unstablePattern = input.symptoms.some(s => 
        s.toLowerCase().includes('rest') || 
        s.toLowerCase().includes('worsening') || 
        s.toLowerCase().includes('more frequent') || 
        s.toLowerCase().includes('prolonged')
      );
      
      // Associated symptoms
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('sweating') || 
        s.toLowerCase().includes('nausea')
      );
      
      return chestPain && (unstablePattern || associatedSymptoms) && !input.flags?.includes('st_elevation');
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected NSTEMI/Unstable Angina: chest pain with unstable pattern or associated symptoms. Immediate ECG and cardiac evaluation required.',
      confidence: 0.9
    }
  },
  {
    id: 'CARD-2',
    name: 'High-Risk Chest Pain',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain'));
      const age = input.age || 0;
      const diabetes = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      const priorMI = (input.medicalHistory || []).some(h => h.toLowerCase().includes('mi'));
      return chestPain && (age > 65 || diabetes || priorMI);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'High-risk chest pain (elderly, diabetes, or prior MI). Treat as ACS until proven otherwise.',
      confidence: 0.85
    }
  },
  {
    id: 'CARD-3',
    name: 'Cardiac Arrest',
    category: 'Cardiac',
    weight: 10,
    match: (input) => 
      input.flags?.includes('cardiac_arrest') || 
      input.flags?.includes('no_pulse') || 
      input.symptoms.some(s => s.toLowerCase().includes('cardiac arrest') || s.toLowerCase().includes('no pulse')),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Cardiac arrest detected. Immediate resuscitation and post-ROSC care required.',
      confidence: 0.99
    }
  },
  {
    id: 'CARD-4',
    name: 'Life-Threatening Arrhythmia',
    category: 'Cardiac',
    weight: 9,
    match: (input) => input.flags?.includes('vfib') || input.flags?.includes('vtach') || input.flags?.includes('bradycardia') || input.flags?.includes('heart_block'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Life-threatening arrhythmia detected (VF, VT, bradycardia, or heart block). Immediate intervention required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-5',
    name: 'Heart Failure with Respiratory Distress',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const heartFailureHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('heart failure'));
      const acuteDistress = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('dyspnea') || 
        s.toLowerCase().includes('orthopnea') || 
        s.toLowerCase().includes('paroxysmal nocturnal')
      );
      const hypoxemia = (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94);
      
      // Expanded to catch both known and new heart failure
      return (acuteDistress && (heartFailureHistory || input.symptoms.some(s => 
        s.toLowerCase().includes('edema') || 
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('jvd') ||
        s.toLowerCase().includes('heart failure')
      ))) && hypoxemia;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Acute heart failure with respiratory distress and hypoxemia. Immediate stabilization and treatment required.',
      confidence: 0.92
    }
  },
  {
    id: 'CARD-5b',
    id: 'CARD-6',
    name: 'Hypertensive Emergency',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const sbp = input.vitals?.systolicBP || 0;
      const endOrgan = input.flags?.includes('end_organ_damage');
      return sbp > 180 && endOrgan;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Hypertensive emergency: SBP >180 with end-organ damage. Immediate BP control and monitoring required.',
      confidence: 0.93
    }
  },
  // Airway, Breathing, Circulation (ABC)
  {
    id: 'ABC-1',
    name: 'Airway Compromise',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('airway_compromise') || input.flags?.includes('stridor') || input.symptoms.includes('unable_to_speak'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Anesthesiology', type: 'secondary' }
      ],
      explain: 'Airway compromise detected → Critical priority for immediate airway intervention.',
      confidence: 0.98
    }
  },
  {
    id: 'ABC-2',
    name: 'Respiratory Failure',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('no_breath') || input.flags?.includes('ineffective_breathing') || (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate < 8),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Respiratory failure or severe bradypnea detected → Critical priority for ventilatory support.',
      confidence: 0.97
    }
  },
  {
    id: 'ABC-3',
    name: 'Severe Hypoxemia',
    category: 'ABC',
    weight: 9,
    match: (input) => (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 85) || input.flags?.includes('cyanosis'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe hypoxemia (SpO₂ < 85%) → Critical priority for oxygenation.',
      confidence: 0.95
    }
  },
  // --- Respiratory Rules ---
  {
    id: 'RESP-1',
    name: 'Acute Respiratory Failure',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      const rr = input.vitals?.respiratoryRate;
      const spo2 = input.vitals?.oxygenSaturation;
      return (rr !== undefined && (rr > 30 || rr < 8)) || (spo2 !== undefined && spo2 < 90) || (input.flags?.includes('severe_respiratory_distress'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Acute respiratory failure: abnormal RR or SpO₂ < 90%, or severe distress. Immediate airway and ventilatory support required.',
      confidence: 0.95
    }
  },
  {
    id: 'RESP-2',
    name: 'Tension Pneumothorax',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('tension_pneumothorax') || (input.symptoms.some(s => s.toLowerCase().includes('chest pain')) && input.flags?.includes('deviated_trachea'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Tension pneumothorax suspected: chest pain with deviated trachea or flag. Immediate needle decompression required.',
      confidence: 0.97
    }
  },
  {
    id: 'RESP-3',
    name: 'Severe Asthma Exacerbation',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      // Life-threatening features
      const lifeThreatening = 
        input.flags?.includes('silent_chest') || 
        input.flags?.includes('cyanosis') || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis') || 
          s.toLowerCase().includes('altered consciousness') ||
          s.toLowerCase().includes('exhaustion')
        );
      
      // Severe features per GINA guidelines
      const severeFeatures = 
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 90) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('complete sentence')) ||
          (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('<50%')) ||
          (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('<50%')) ||
          s.toLowerCase().includes('accessory muscle') ||
          s.toLowerCase().includes('tripod position') ||
          (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe'))
        );
      
      // Direct mention of severe asthma
      const severeAsthma = input.symptoms.some(s => 
        (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe')) ||
        (s.toLowerCase().includes('status asthmaticus'))
      );
      
      // Include flag-based detection
      const severeFlag = 
        input.flags?.includes('severe_asthma') || 
        input.flags?.includes('status_asthmaticus');
      
      return lifeThreatening || severeFeatures || severeAsthma || severeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe asthma exacerbation with life-threatening or severe features. Immediate continuous bronchodilators, steroids, and possible respiratory support required.',
      confidence: 0.93
    }
  },
  {
    id: 'RESP-4',
    name: 'Pulmonary Embolism (High-Risk)',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      const spo2 = input.vitals?.oxygenSaturation;
      const hr = input.vitals?.heartRate;
      return input.flags?.includes('high_risk_pe') || (spo2 !== undefined && spo2 < 92 && hr !== undefined && hr > 110 && input.symptoms.some(s => s.toLowerCase().includes('pleuritic pain')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'High-risk pulmonary embolism: hypoxemia, tachycardia, pleuritic pain. Immediate imaging and anticoagulation required.',
      confidence: 0.92
    }
  },
  {
    id: 'RESP-5',
    name: 'Moderate Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      // Moderate features per GINA/GOLD guidelines
      const moderateFeatures = 
        ((input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation >= 90 && input.vitals.oxygenSaturation < 94) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 20 && input.vitals.respiratoryRate <= 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100 && input.vitals.heartRate <= 120)) &&
        // Not meeting severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma');
      
      // Functional limitations but not severe
      const moderateFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          (s.toLowerCase().includes('moderate') || s.toLowerCase().includes('worse'))) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('walking'))
      );
      
      // Direct mention of moderate exacerbation
      const moderateExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('moderate')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('exacerbation') && 
        !s.toLowerCase().includes('severe') && 
        !s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const moderateFlag = input.flags?.includes('moderate_asthma') || input.flags?.includes('moderate_copd');
      
      return (moderateFeatures || moderateFunctional || moderateExacerbation || moderateFlag) && 
        // Exclude those meeting severe criteria
        !input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis')
        );
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Moderate asthma/COPD exacerbation: increased work of breathing but without severe features. Requires prompt bronchodilators, steroids, and monitoring.',
      confidence: 0.85
    }
  },
  {
    id: 'RESP-6',
    name: 'Community-Acquired Pneumonia (Concerning Vitals)',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumonia')) && (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 24);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Community-acquired pneumonia with tachypnea. Requires prompt antibiotics and monitoring.',
      confidence: 0.83
    }
  },
  {
    id: 'RESP-7',
    name: 'Spontaneous Pneumothorax (Stable)',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumothorax')) && !(input.flags?.includes('tension_pneumothorax'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Spontaneous pneumothorax (stable): requires monitoring and possible intervention.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-8',
    name: 'Hemoptysis with Risk Factors',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('hemoptysis')) && (input.medicalHistory || []).some(h => h.toLowerCase().includes('cancer') || h.toLowerCase().includes('tb'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Hemoptysis with risk factors (cancer, TB). Requires urgent evaluation for underlying cause.',
      confidence: 0.8
    }
  },
  // --- Ophthalmological Rules ---
  {
    id: 'OPHTHAL-1',
    name: 'Chemical Eye Burn',
    category: 'Ophthalmological',
    weight: 10,
    match: (input) => {
      // Chemical exposures
      const chemicalExposure = input.symptoms.some(s => 
        s.toLowerCase().includes('chemical') || 
        s.toLowerCase().includes('acid') || 
        s.toLowerCase().includes('alkali') || 
        s.toLowerCase().includes('bleach') || 
        s.toLowerCase().includes('cleaner') || 
        s.toLowerCase().includes('irritant') || 
        s.toLowerCase().includes('corrosive')
      );
      
      // Eye pain, burning, vision changes
      const eyeSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('eye pain') || 
        s.toLowerCase().includes('burning') || 
        s.toLowerCase().includes('vision change') || 
        s.toLowerCase().includes('blurry vision') || 
        s.toLowerCase().includes('red eye') || 
        s.toLowerCase().includes('tearing')
      );
      
      // Exposure within minutes
      const recentExposure = input.symptoms.some(s => 
        s.toLowerCase().includes('just now') || 
        s.toLowerCase().includes('minutes ago') || 
        s.toLowerCase().includes('seconds ago')
      );
      
      return chemicalExposure && eyeSymptoms && recentExposure;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Chemical eye burn: time-critical emergency with risk of permanent vision loss within minutes. Immediate irrigation, antibiotics, and ophthalmology consult required.',
      confidence: 0.98
    }
  },
  {
    id: 'OPHTHAL-2',
    name: 'Acute Angle-Closure Glaucoma',
    category: 'Ophthalmological',
    weight: 9,
    match: (input) => {
      // Severe eye pain, vision changes, halos around lights
      const severeEyePain = input.symptoms.some(s => 
        s.toLowerCase().includes('eye pain') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('intense') || 
          s.toLowerCase().includes('excruciating')
        )
      );
      
      const visionChanges = input.symptoms.some(s => 
        s.toLowerCase().includes('vision change') || 
        s.toLowerCase().includes('blurry vision') || 
        s.toLowerCase().includes('halo') || 
        s.toLowerCase().includes('light')
      );
      
      // Associated symptoms
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('headache') || 
        s.toLowerCase().includes('nausea') || 
        s.toLowerCase().includes('vomiting')
      );
      
      return severeEyePain && visionChanges && associatedSymptoms;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Acute angle-closure glaucoma: severe eye pain, vision changes, and associated symptoms. Immediate IOP reduction and ophthalmology consult required. Risk of permanent vision loss if delayed >6-12 hours.',
      confidence: 0.95
    }
  },
  {
    id: 'OPHTHAL-3',
    name: 'Retinal Detachment',
    category: 'Ophthalmological',
    weight: 8,
    match: (input) => {
      // Classic symptoms
      const classicSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('floaters') || 
        s.toLowerCase().includes('flashes') || 
        s.toLowerCase().includes('curtain') || 
        s.toLowerCase().includes('shadow') || 
        s.toLowerCase().includes('vision loss')
      );
      
      // Risk factors
      const riskFactors = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('myopia') || 
        h.toLowerCase().includes('retinal detachment') || 
        h.toLowerCase().includes('trauma')
      );
      
      return classicSymptoms && riskFactors;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Retinal detachment: classic symptoms and risk factors. Same-day evaluation and surgical intervention required to prevent permanent vision loss.',
      confidence: 0.9
    }
  },
import type { TriageRequest, TriageRuleResult } from '@/types/triage';

export interface EnhancedTriageRule {
  id: string;
  name: string;
  category: string;
  weight: number;
  match: (input: TriageRequest) => boolean;
  result: Omit<TriageRuleResult, 'explainability'> & {
    explain: string;
    confidence?: number;
  };
}

export const enhancedTriageRules: EnhancedTriageRule[] = [
  // --- Cardiac & Circulatory Rules ---
  {
    id: 'CARD-1',
    name: 'STEMI (Suspected Acute MI)',
    category: 'Cardiac',
    weight: 10,
    match: (input) => {
      // Enhanced STEMI criteria using more comprehensive assessment
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain') || s.toLowerCase().includes('chest pressure') || s.toLowerCase().includes('chest discomfort'));
      const typicalFeatures = input.symptoms.some(s => 
        s.toLowerCase().includes('crushing') || 
        s.toLowerCase().includes('radiat') ||
        s.toLowerCase().includes('left arm') ||
        s.toLowerCase().includes('jaw') ||
        s.toLowerCase().includes('burning')
      );
      
      const highRiskHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('mi') || 
        h.toLowerCase().includes('coronary') || 
        h.toLowerCase().includes('stent') || 
        h.toLowerCase().includes('cabg')
      );
      
      const diabetesHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      
      const stFlag = input.flags?.includes('st_elevation') || input.flags?.includes('stemi');
      const troponinFlag = input.flags?.includes('troponin_positive');
      
      // Match classic presentation OR elevated troponin/ST elevation
      return (chestPain && typicalFeatures && (highRiskHistory || diabetesHistory || input.age > 50)) || stFlag || troponinFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected STEMI: classic chest pain with risk factors or positive cardiac markers. Immediate ECG and cardiac consult required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-1b',
    name: 'Suspected NSTEMI/Unstable Angina',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      // Core symptoms
      const chestPain = input.symptoms.some(s => 
        s.toLowerCase().includes('chest pain') || 
        s.toLowerCase().includes('chest pressure') || 
        s.toLowerCase().includes('chest discomfort')
      );
      
      // Rest pain or crescendo pattern is concerning for ACS
      const unstablePattern = input.symptoms.some(s => 
        s.toLowerCase().includes('rest') || 
        s.toLowerCase().includes('worsening') || 
        s.toLowerCase().includes('more frequent') || 
        s.toLowerCase().includes('prolonged')
      );
      
      // Associated symptoms
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('sweating') || 
        s.toLowerCase().includes('nausea')
      );
      
      return chestPain && (unstablePattern || associatedSymptoms) && !input.flags?.includes('st_elevation');
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected NSTEMI/Unstable Angina: chest pain with unstable pattern or associated symptoms. Immediate ECG and cardiac evaluation required.',
      confidence: 0.9
    }
  },
  {
    id: 'CARD-2',
    name: 'High-Risk Chest Pain',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain'));
      const age = input.age || 0;
      const diabetes = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      const priorMI = (input.medicalHistory || []).some(h => h.toLowerCase().includes('mi'));
      return chestPain && (age > 65 || diabetes || priorMI);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'High-risk chest pain (elderly, diabetes, or prior MI). Treat as ACS until proven otherwise.',
      confidence: 0.85
    }
  },
  {
    id: 'CARD-3',
    name: 'Cardiac Arrest',
    category: 'Cardiac',
    weight: 10,
    match: (input) => 
      input.flags?.includes('cardiac_arrest') || 
      input.flags?.includes('no_pulse') || 
      input.symptoms.some(s => s.toLowerCase().includes('cardiac arrest') || s.toLowerCase().includes('no pulse')),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Cardiac arrest detected. Immediate resuscitation and post-ROSC care required.',
      confidence: 0.99
    }
  },
  {
    id: 'CARD-4',
    name: 'Life-Threatening Arrhythmia',
    category: 'Cardiac',
    weight: 9,
    match: (input) => input.flags?.includes('vfib') || input.flags?.includes('vtach') || input.flags?.includes('bradycardia') || input.flags?.includes('heart_block'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Life-threatening arrhythmia detected (VF, VT, bradycardia, or heart block). Immediate intervention required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-5',
    name: 'Heart Failure with Respiratory Distress',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const heartFailureHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('heart failure'));
      const acuteDistress = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('dyspnea') || 
        s.toLowerCase().includes('orthopnea') || 
        s.toLowerCase().includes('paroxysmal nocturnal')
      );
      const hypoxemia = (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94);
      
      // Expanded to catch both known and new heart failure
      return (acuteDistress && (heartFailureHistory || input.symptoms.some(s => 
        s.toLowerCase().includes('edema') || 
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('jvd') ||
        s.toLowerCase().includes('heart failure')
      ))) && hypoxemia;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Acute heart failure with respiratory distress and hypoxemia. Immediate stabilization and treatment required.',
      confidence: 0.92
    }
  },
  {
    id: 'CARD-5b',
    id: 'CARD-6',
    name: 'Hypertensive Emergency',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const sbp = input.vitals?.systolicBP || 0;
      const endOrgan = input.flags?.includes('end_organ_damage');
      return sbp > 180 && endOrgan;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Hypertensive emergency: SBP >180 with end-organ damage. Immediate BP control and monitoring required.',
      confidence: 0.93
    }
  },
  // Airway, Breathing, Circulation (ABC)
  {
    id: 'ABC-1',
    name: 'Airway Compromise',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('airway_compromise') || input.flags?.includes('stridor') || input.symptoms.includes('unable_to_speak'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Anesthesiology', type: 'secondary' }
      ],
      explain: 'Airway compromise detected → Critical priority for immediate airway intervention.',
      confidence: 0.98
    }
  },
  {
    id: 'ABC-2',
    name: 'Respiratory Failure',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('no_breath') || input.flags?.includes('ineffective_breathing') || (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate < 8),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Respiratory failure or severe bradypnea detected → Critical priority for ventilatory support.',
      confidence: 0.97
    }
  },
  {
    id: 'ABC-3',
    name: 'Severe Hypoxemia',
    category: 'ABC',
    weight: 9,
    match: (input) => (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 85) || input.flags?.includes('cyanosis'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe hypoxemia (SpO₂ < 85%) → Critical priority for oxygenation.',
      confidence: 0.95
    }
  },
  // --- Respiratory Rules ---
  {
    id: 'RESP-1',
    name: 'Acute Respiratory Failure',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      const rr = input.vitals?.respiratoryRate;
      const spo2 = input.vitals?.oxygenSaturation;
      return (rr !== undefined && (rr > 30 || rr < 8)) || (spo2 !== undefined && spo2 < 90) || (input.flags?.includes('severe_respiratory_distress'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Acute respiratory failure: abnormal RR or SpO₂ < 90%, or severe distress. Immediate airway and ventilatory support required.',
      confidence: 0.95
    }
  },
  {
    id: 'RESP-2',
    name: 'Tension Pneumothorax',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('tension_pneumothorax') || (input.symptoms.some(s => s.toLowerCase().includes('chest pain')) && input.flags?.includes('deviated_trachea'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Tension pneumothorax suspected: chest pain with deviated trachea or flag. Immediate needle decompression required.',
      confidence: 0.97
    }
  },
  {
    id: 'RESP-3',
    name: 'Severe Asthma Exacerbation',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      // Life-threatening features
      const lifeThreatening = 
        input.flags?.includes('silent_chest') || 
        input.flags?.includes('cyanosis') || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis') || 
          s.toLowerCase().includes('altered consciousness') ||
          s.toLowerCase().includes('exhaustion')
        );
      
      // Severe features per GINA guidelines
      const severeFeatures = 
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 90) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('complete sentence')) ||
          (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('<50%')) ||
          (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('<50%')) ||
          s.toLowerCase().includes('accessory muscle') ||
          s.toLowerCase().includes('tripod position') ||
          (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe'))
        );
      
      // Direct mention of severe asthma
      const severeAsthma = input.symptoms.some(s => 
        (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe')) ||
        (s.toLowerCase().includes('status asthmaticus'))
      );
      
      // Include flag-based detection
      const severeFlag = 
        input.flags?.includes('severe_asthma') || 
        input.flags?.includes('status_asthmaticus');
      
      return lifeThreatening || severeFeatures || severeAsthma || severeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe asthma exacerbation with life-threatening or severe features. Immediate continuous bronchodilators, steroids, and possible respiratory support required.',
      confidence: 0.93
    }
  },
  {
    id: 'RESP-4',
    name: 'Pulmonary Embolism (High-Risk)',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      const spo2 = input.vitals?.oxygenSaturation;
      const hr = input.vitals?.heartRate;
      return input.flags?.includes('high_risk_pe') || (spo2 !== undefined && spo2 < 92 && hr !== undefined && hr > 110 && input.symptoms.some(s => s.toLowerCase().includes('pleuritic pain')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'High-risk pulmonary embolism: hypoxemia, tachycardia, pleuritic pain. Immediate imaging and anticoagulation required.',
      confidence: 0.92
    }
  },
  {
    id: 'RESP-5',
    name: 'Moderate Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      // Moderate features per GINA/GOLD guidelines
      const moderateFeatures = 
        ((input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation >= 90 && input.vitals.oxygenSaturation < 94) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 20 && input.vitals.respiratoryRate <= 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100 && input.vitals.heartRate <= 120)) &&
        // Not meeting severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma');
      
      // Functional limitations but not severe
      const moderateFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          (s.toLowerCase().includes('moderate') || s.toLowerCase().includes('worse'))) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('walking'))
      );
      
      // Direct mention of moderate exacerbation
      const moderateExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('moderate')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('exacerbation') && 
        !s.toLowerCase().includes('severe') && 
        !s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const moderateFlag = input.flags?.includes('moderate_asthma') || input.flags?.includes('moderate_copd');
      
      return (moderateFeatures || moderateFunctional || moderateExacerbation || moderateFlag) && 
        // Exclude those meeting severe criteria
        !input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis')
        );
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Moderate asthma/COPD exacerbation: increased work of breathing but without severe features. Requires prompt bronchodilators, steroids, and monitoring.',
      confidence: 0.85
    }
  },
  {
    id: 'RESP-6',
    name: 'Community-Acquired Pneumonia (Concerning Vitals)',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumonia')) && (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 24);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Community-acquired pneumonia with tachypnea. Requires prompt antibiotics and monitoring.',
      confidence: 0.83
    }
  },
  {
    id: 'RESP-7',
    name: 'Spontaneous Pneumothorax (Stable)',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumothorax')) && !(input.flags?.includes('tension_pneumothorax'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Spontaneous pneumothorax (stable): requires monitoring and possible intervention.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-8',
    name: 'Hemoptysis with Risk Factors',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('hemoptysis')) && (input.medicalHistory || []).some(h => h.toLowerCase().includes('cancer') || h.toLowerCase().includes('tb'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Hemoptysis with risk factors (cancer, TB). Requires urgent evaluation for underlying cause.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-9',
    name: 'Mild Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 4,
    match: (input) => {
      // Mild features per GINA/GOLD guidelines
      const mildFeatures = 
        ((input.vitals?.oxygenSaturation === undefined || input.vitals.oxygenSaturation >= 94) &&
        (input.vitals?.respiratoryRate === undefined || input.vitals.respiratoryRate <= 20) &&
        (input.vitals?.heartRate === undefined || input.vitals.heartRate <= 100)) &&
        // Not meeting moderate or severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma') &&
        !input.flags?.includes('moderate_asthma');
      
      // Minimal functional limitations
      const mildFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('mild')) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('>80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('>80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('exertion'))
      );
      
      // Direct mention of mild exacerbation
      const mildExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('mild')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('exacerbation') && 
          s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const mildFlag = input.flags?.includes('mild_asthma') || input.flags?.includes('mild_copd');
      
      // Normal activities and sleep not affected significantly
      const minimalImpact = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('minimal impact')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('well controlled'))
      );
      
      return (mildFeatures || mildFunctional || mildExacerbation || mildFlag || minimalImpact) && 
        // Exclude those meeting moderate or severe criteria
        !input.symptoms.some(s => 
          s.toLowerCase().includes('moderate') || 
          s.toLowerCase().includes('severe') ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Mild asthma/COPD exacerbation with minimal impact on function and normal vital signs. Can be managed with bronchodilators and short-term steroids in outpatient setting.',
      confidence: 0.7
    }
  },
  {
    id: 'RESP-10',
    name: 'Upper Respiratory Infection (Normal Vitals)',
    category: 'Respiratory',
    weight: 3,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('uri') || s.toLowerCase().includes('upper respiratory infection')) && (!input.vitals || (input.vitals.respiratoryRate === undefined || input.vitals.respiratoryRate <= 20));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 4,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Upper respiratory infection with normal vitals: routine care.',
      confidence: 0.6
    }
  },
  {
    id: 'RESP-11',
    name: 'Chronic Cough (Stable)',
    category: 'Respiratory',
    weight: 2,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('chronic cough')) && (!input.vitals || (input.vitals.oxygenSaturation === undefined || input.vitals.oxygenSaturation >= 94));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 5,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Chronic cough with stable vitals: non-urgent evaluation.',
      confidence: 0.5
    }
  },
  // --- Neurological Rules ---
  {
    id: 'NEURO-1',
    name: 'Acute Stroke (FAST Positive)',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Enhanced stroke detection using expanded FAST-ED criteria
      const strokeSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('facial droop') || 
        s.toLowerCase().includes('face droop') || 
        s.toLowerCase().includes('arm weakness') || 
        s.toLowerCase().includes('leg weakness') || 
        (s.toLowerCase().includes('speech') && (
          s.toLowerCase().includes('slurred') || 
          s.toLowerCase().includes('difficulty') || 
          s.toLowerCase().includes('aphasia')
        )) ||
        s.toLowerCase().includes('stroke') ||
        s.toLowerCase().includes('hemiparesis') ||
        s.toLowerCase().includes('hemineglect') ||
        s.toLowerCase().includes('visual field')
      );
      
      // Time is brain - time factors are crucial
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_4.5h') || 
        input.flags?.includes('onset_under_24h') || 
        input.symptoms.some(s => s.toLowerCase().includes('last known well') && s.toLowerCase().includes('hour'));
      
      const strokeFlag = input.flags?.includes('stroke') || input.flags?.includes('cva');
      
      // Either explicit stroke symptoms or stroke flag, with time sensitivity
      return (strokeSigns || strokeFlag) && (timeFlag || !input.flags?.includes('onset_over_24h'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Acute stroke suspected: FAST positive (face, arm, speech, time). Immediate stroke protocol activation and time-sensitive imaging required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-1b',
    name: 'Suspected Large Vessel Occlusion Stroke',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Signs of severe neurological deficit suggesting LVO
      const lvoSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('gaze deviation') || 
        (s.toLowerCase().includes('severe') && s.toLowerCase().includes('deficit')) ||
        (s.toLowerCase().includes('multiple') && s.toLowerCase().includes('deficit')) ||
        s.toLowerCase().includes('aphasia') ||
        s.toLowerCase().includes('neglect')
      );
      
      // High NIHSS or specific flag
      const severityFlag = 
        input.flags?.includes('lvo') || 
        input.flags?.includes('high_nihss') || 
        input.flags?.includes('severe_stroke');
      
      // Time window for endovascular intervention is longer
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_24h');
      
      return (lvoSigns || severityFlag) && timeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' },
        { name: 'Interventional Radiology', type: 'tertiary' }
      ],
      explain: 'Suspected large vessel occlusion stroke: severe deficits within intervention window. Immediate CTA and thrombectomy evaluation required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-2',
    name: 'Status Epilepticus',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('status_epilepticus') || 
        input.flags?.includes('ongoing_seizure') || 
        input.symptoms.some(s => s.toLowerCase().includes('seizure') && (s.toLowerCase().includes('continuous') || s.toLowerCase().includes('multiple')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Status epilepticus: ongoing seizure or multiple seizures without recovery. Immediate anticonvulsant therapy required.',
      confidence: 0.98
    }
  },
  {
    id: 'NEURO-3',
    name: 'Altered Mental Status (GCS < 9)',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      return (input.vitals?.gcs !== undefined && input.vitals.gcs < 9) || 
        input.flags?.includes('unresponsive') || 
        input.symptoms.some(s => s.toLowerCase().includes('unconscious'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Severe altered mental status: GCS < 9 or unresponsive. Immediate airway management and neurological evaluation required.',
      confidence: 0.96
    }
  },
  {
    id: 'NEURO-4',
    name: 'Thunderclap Headache',
    category: 'Neurological',
    weight: 9,
    match: (input) => {
      // Enhanced criteria for thunderclap headache
      const thunderclapFeatures = input.symptoms.some(s => 
        (s.toLowerCase().includes('headache') && (
          s.toLowerCase().includes('worst') || 
          s.toLowerCase().includes('thunderclap') || 
          s.toLowerCase().includes('sudden') ||
          s.toLowerCase().includes('severe') ||
          s.toLowerCase().includes('explosive')
        )) ||
        s.toLowerCase().includes('subarachnoid')
      );
      
      // Associated signs that increase concern
      const concerningSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('neck stiffness') || 
        s.toLowerCase().includes('photophobia') ||
        s.toLowerCase().includes('vomiting') ||
        s.toLowerCase().includes('altered') ||
        s.toLowerCase().includes('neurological')
      ) || input.flags?.includes('meningeal_signs');
      
      return thunderclapFeatures || 
        input.flags?.includes('thunderclap_headache') || 
        (input.symptoms.some(s => s.toLowerCase().includes('headache')) && concerningSigns);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Thunderclap headache: sudden, severe, worst-ever or with concerning features. Immediate evaluation for subarachnoid hemorrhage required.',
      confidence: 0.93
    }
  },
  {
    id: 'NEURO-5',
    name: 'Acute Spinal Cord Compression',
    category: 'Neurological',
    weight: 9,
    match: (input) => {
      return input.flags?.includes('cord_compression') || 
        input.symptoms.some(s => 
          (s.toLowerCase().includes('paralysis') || s.toLowerCase().includes('weakness')) && 
          (s.toLowerCase().includes('legs') || s.toLowerCase().includes('arms'))
        ) && input.symptoms.some(s => s.toLowerCase().includes('bladder') || s.toLowerCase().includes('bowel'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' }
      ],
      explain: 'Acute spinal cord compression: limb weakness with bowel/bladder dysfunction. Immediate imaging and neurosurgical consultation required.',
      confidence: 0.92
    }
  },
  {
    id: 'NEURO-5b',
    name: 'Intracranial Hemorrhage',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Direct mention or signs
      const bleedSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('intracranial hemorrhage') || 
        s.toLowerCase().includes('ich') || 
        s.toLowerCase().includes('cerebral hemorrhage') ||
        s.toLowerCase().includes('brain bleed') ||
        s.toLowerCase().includes('hemorrhagic stroke')
      );
      
      // With neurological deficit
      const deficits = input.symptoms.some(s => 
        s.toLowerCase().includes('weakness') || 
        s.toLowerCase().includes('numbness') ||
        s.toLowerCase().includes('speech') ||
        s.toLowerCase().includes('vision') ||
        s.toLowerCase().includes('level of consciousness')
      );
      
      // Flag for any intracranial bleed
      const bleedFlag = 
        input.flags?.includes('intracranial_hemorrhage') || 
        input.flags?.includes('brain_bleed') || 
        input.flags?.includes('hemorrhagic_stroke');
      
      return bleedSigns || bleedFlag || (input.symptoms.some(s => s.toLowerCase().includes('severe headache')) && deficits);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' },
        { name: 'Neurology', type: 'tertiary' }
      ],
      explain: 'Suspected intracranial hemorrhage. Immediate head CT and neurosurgical evaluation required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-6',
    name: 'First-Time Seizure',
    category: 'Neurological',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('seizure') && s.toLowerCase().includes('first')) && 
        !input.medicalHistory?.some(h => h.toLowerCase().includes('epilepsy') || h.toLowerCase().includes('seizure'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'First-time seizure (now resolved): requires prompt evaluation for underlying cause.',
      confidence: 0.89
    }
  },
  {
    id: 'NEURO-7',
    name: 'Transient Ischemic Attack',
    category: 'Neurological',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('tia') || 
        (s.toLowerCase().includes('stroke') && s.toLowerCase().includes('resolved')));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Transient Ischemic Attack: resolved focal neurological symptoms. Requires prompt evaluation to prevent stroke.',
      confidence: 0.85
    }
  },
  {
    id: 'NEURO-8',
    name: 'Migraine with Neurological Deficits',
    category: 'Neurological',
    weight: 6,
    match: (input) => {
      // Enhanced detection of migraine with aura
      const migraine = input.symptoms.some(s => s.toLowerCase().includes('migraine'));
      
      const auraSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('aura') || 
        s.toLowerCase().includes('visual') || 
        s.toLowerCase().includes('scintillating') || 
        s.toLowerCase().includes('scotoma') || 
        s.toLowerCase().includes('numbness') || 
        s.toLowerCase().includes('tingling') ||
        s.toLowerCase().includes('paresthesia')
      );
      
      // History of similar episodes reduces concern
      const knownHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('migraine with aura') || 
        h.toLowerCase().includes('complex migraine')
      );
      
      // First time is more concerning than recurrent with same pattern
      const firstTimeFlag = input.flags?.includes('first_time') || input.symptoms.some(s => s.toLowerCase().includes('first') && s.toLowerCase().includes('time'));
      
      // Concerning if first time or different from usual pattern
      return migraine && auraSymptoms && (firstTimeFlag || input.symptoms.some(s => s.toLowerCase().includes('different')) || !knownHistory);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Migraine with neurological deficits (atypical or first-time): requires evaluation to rule out more serious conditions.',
      confidence: 0.8
    }
  },
  {
    id: 'NEURO-9',
    name: 'Vertigo with Neurological Symptoms',
    category: 'Neurological',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('vertigo')) && 
        (input.symptoms.some(s => 
          s.toLowerCase().includes('double vision') || 
          s.toLowerCase().includes('diplopia') || 
          s.toLowerCase().includes('dysarthria') || 
          s.toLowerCase().includes('ataxia') || 
          s.toLowerCase().includes('weakness')
        ) || 
        input.flags?.includes('central_vertigo'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Vertigo with neurological symptoms: concerning for central cause. Requires neurological evaluation.',
      confidence: 0.82
    }
  },
  {
    id: 'NEURO-10',
    name: 'Uncomplicated Syncope in Young, Healthy Patient',
    category: 'Neurological',
    weight: 4,
    match: (input) => {
      const age = input.age || 0;
      return input.symptoms.some(s => s.toLowerCase().includes('syncope') || s.toLowerCase().includes('fainting')) && 
        age < 40 && 
        !(input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('heart') || 
          h.toLowerCase().includes('cardiac') || 
          h.toLowerCase().includes('epilepsy')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Uncomplicated syncope in young, healthy patient: likely vasovagal. Requires standard evaluation.',
      confidence: 0.75
    }
  },
  {
    id: 'NEURO-11',
    name: 'Chronic Stable Headache',
    category: 'Neurological',
    weight: 3,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('headache') && (s.toLowerCase().includes('chronic') || s.toLowerCase().includes('recurring'))) && 
        !input.symptoms.some(s => 
          s.toLowerCase().includes('worst') || 
          s.toLowerCase().includes('new') || 
          s.toLowerCase().includes('neurological') || 
          s.toLowerCase().includes('fever')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 4,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Chronic stable headache pattern: routine evaluation for management.',
      confidence: 0.7
    }
import type { TriageRequest, TriageRuleResult } from '@/types/triage';

export interface EnhancedTriageRule {
  id: string;
  name: string;
  category: string;
  weight: number;
  match: (input: TriageRequest) => boolean;
  result: Omit<TriageRuleResult, 'explainability'> & {
    explain: string;
    confidence?: number;
  };
}

export const enhancedTriageRules: EnhancedTriageRule[] = [
  // --- Cardiac & Circulatory Rules ---
  {
    id: 'CARD-1',
    name: 'STEMI (Suspected Acute MI)',
    category: 'Cardiac',
    weight: 10,
    match: (input) => {
      // Enhanced STEMI criteria using more comprehensive assessment
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain') || s.toLowerCase().includes('chest pressure') || s.toLowerCase().includes('chest discomfort'));
      const typicalFeatures = input.symptoms.some(s => 
        s.toLowerCase().includes('crushing') || 
        s.toLowerCase().includes('radiat') ||
        s.toLowerCase().includes('left arm') ||
        s.toLowerCase().includes('jaw') ||
        s.toLowerCase().includes('burning')
      );
      
      const highRiskHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('mi') || 
        h.toLowerCase().includes('coronary') || 
        h.toLowerCase().includes('stent') || 
        h.toLowerCase().includes('cabg')
      );
      
      const diabetesHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      
      const stFlag = input.flags?.includes('st_elevation') || input.flags?.includes('stemi');
      const troponinFlag = input.flags?.includes('troponin_positive');
      
      // Match classic presentation OR elevated troponin/ST elevation
      return (chestPain && typicalFeatures && (highRiskHistory || diabetesHistory || input.age > 50)) || stFlag || troponinFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected STEMI: classic chest pain with risk factors or positive cardiac markers. Immediate ECG and cardiac consult required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-1b',
    name: 'Suspected NSTEMI/Unstable Angina',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      // Core symptoms
      const chestPain = input.symptoms.some(s => 
        s.toLowerCase().includes('chest pain') || 
        s.toLowerCase().includes('chest pressure') || 
        s.toLowerCase().includes('chest discomfort')
      );
      
      // Rest pain or crescendo pattern is concerning for ACS
      const unstablePattern = input.symptoms.some(s => 
        s.toLowerCase().includes('rest') || 
        s.toLowerCase().includes('worsening') || 
        s.toLowerCase().includes('more frequent') || 
        s.toLowerCase().includes('prolonged')
      );
      
      // Associated symptoms
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('sweating') || 
        s.toLowerCase().includes('nausea')
      );
      
      return chestPain && (unstablePattern || associatedSymptoms) && !input.flags?.includes('st_elevation');
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected NSTEMI/Unstable Angina: chest pain with unstable pattern or associated symptoms. Immediate ECG and cardiac evaluation required.',
      confidence: 0.9
    }
  },
  {
    id: 'CARD-2',
    name: 'High-Risk Chest Pain',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain'));
      const age = input.age || 0;
      const diabetes = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      const priorMI = (input.medicalHistory || []).some(h => h.toLowerCase().includes('mi'));
      return chestPain && (age > 65 || diabetes || priorMI);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'High-risk chest pain (elderly, diabetes, or prior MI). Treat as ACS until proven otherwise.',
      confidence: 0.85
    }
  },
  {
    id: 'CARD-3',
    name: 'Cardiac Arrest',
    category: 'Cardiac',
    weight: 10,
    match: (input) => 
      input.flags?.includes('cardiac_arrest') || 
      input.flags?.includes('no_pulse') || 
      input.symptoms.some(s => s.toLowerCase().includes('cardiac arrest') || s.toLowerCase().includes('no pulse')),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Cardiac arrest detected. Immediate resuscitation and post-ROSC care required.',
      confidence: 0.99
    }
  },
  {
    id: 'CARD-4',
    name: 'Life-Threatening Arrhythmia',
    category: 'Cardiac',
    weight: 9,
    match: (input) => input.flags?.includes('vfib') || input.flags?.includes('vtach') || input.flags?.includes('bradycardia') || input.flags?.includes('heart_block'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Life-threatening arrhythmia detected (VF, VT, bradycardia, or heart block). Immediate intervention required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-5',
    name: 'Heart Failure with Respiratory Distress',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const heartFailureHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('heart failure'));
      const acuteDistress = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('dyspnea') || 
        s.toLowerCase().includes('orthopnea') || 
        s.toLowerCase().includes('paroxysmal nocturnal')
      );
      const hypoxemia = (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94);
      
      // Expanded to catch both known and new heart failure
      return (acuteDistress && (heartFailureHistory || input.symptoms.some(s => 
        s.toLowerCase().includes('edema') || 
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('jvd') ||
        s.toLowerCase().includes('heart failure')
      ))) && hypoxemia;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Acute heart failure with respiratory distress and hypoxemia. Immediate stabilization and treatment required.',
      confidence: 0.92
    }
  },
  {
    id: 'CARD-5b',
    id: 'CARD-6',
    name: 'Hypertensive Emergency',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const sbp = input.vitals?.systolicBP || 0;
      const endOrgan = input.flags?.includes('end_organ_damage');
      return sbp > 180 && endOrgan;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Hypertensive emergency: SBP >180 with end-organ damage. Immediate BP control and monitoring required.',
      confidence: 0.93
    }
  },
  // Airway, Breathing, Circulation (ABC)
  {
    id: 'ABC-1',
    name: 'Airway Compromise',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('airway_compromise') || input.flags?.includes('stridor') || input.symptoms.includes('unable_to_speak'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Anesthesiology', type: 'secondary' }
      ],
      explain: 'Airway compromise detected → Critical priority for immediate airway intervention.',
      confidence: 0.98
    }
  },
  {
    id: 'ABC-2',
    name: 'Respiratory Failure',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('no_breath') || input.flags?.includes('ineffective_breathing') || (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate < 8),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Respiratory failure or severe bradypnea detected → Critical priority for ventilatory support.',
      confidence: 0.97
    }
  },
  {
    id: 'ABC-3',
    name: 'Severe Hypoxemia',
    category: 'ABC',
    weight: 9,
    match: (input) => (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 85) || input.flags?.includes('cyanosis'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe hypoxemia (SpO₂ < 85%) → Critical priority for oxygenation.',
      confidence: 0.95
    }
  },
  // --- Respiratory Rules ---
  {
    id: 'RESP-1',
    name: 'Acute Respiratory Failure',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      const rr = input.vitals?.respiratoryRate;
      const spo2 = input.vitals?.oxygenSaturation;
      return (rr !== undefined && (rr > 30 || rr < 8)) || (spo2 !== undefined && spo2 < 90) || (input.flags?.includes('severe_respiratory_distress'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Acute respiratory failure: abnormal RR or SpO₂ < 90%, or severe distress. Immediate airway and ventilatory support required.',
      confidence: 0.95
    }
  },
  {
    id: 'RESP-2',
    name: 'Tension Pneumothorax',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('tension_pneumothorax') || (input.symptoms.some(s => s.toLowerCase().includes('chest pain')) && input.flags?.includes('deviated_trachea'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Tension pneumothorax suspected: chest pain with deviated trachea or flag. Immediate needle decompression required.',
      confidence: 0.97
    }
  },
  {
    id: 'RESP-3',
    name: 'Severe Asthma Exacerbation',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      // Life-threatening features
      const lifeThreatening = 
        input.flags?.includes('silent_chest') || 
        input.flags?.includes('cyanosis') || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis') || 
          s.toLowerCase().includes('altered consciousness') ||
          s.toLowerCase().includes('exhaustion')
        );
      
      // Severe features per GINA guidelines
      const severeFeatures = 
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 90) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('complete sentence')) ||
          (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('<50%')) ||
          (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('<50%')) ||
          s.toLowerCase().includes('accessory muscle') ||
          s.toLowerCase().includes('tripod position') ||
          (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe'))
        );
      
      // Direct mention of severe asthma
      const severeAsthma = input.symptoms.some(s => 
        (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe')) ||
        (s.toLowerCase().includes('status asthmaticus'))
      );
      
      // Include flag-based detection
      const severeFlag = 
        input.flags?.includes('severe_asthma') || 
        input.flags?.includes('status_asthmaticus');
      
      return lifeThreatening || severeFeatures || severeAsthma || severeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe asthma exacerbation with life-threatening or severe features. Immediate continuous bronchodilators, steroids, and possible respiratory support required.',
      confidence: 0.93
    }
  },
  {
    id: 'RESP-4',
    name: 'Pulmonary Embolism (High-Risk)',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      const spo2 = input.vitals?.oxygenSaturation;
      const hr = input.vitals?.heartRate;
      return input.flags?.includes('high_risk_pe') || (spo2 !== undefined && spo2 < 92 && hr !== undefined && hr > 110 && input.symptoms.some(s => s.toLowerCase().includes('pleuritic pain')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'High-risk pulmonary embolism: hypoxemia, tachycardia, pleuritic pain. Immediate imaging and anticoagulation required.',
      confidence: 0.92
    }
  },
  {
    id: 'RESP-5',
    name: 'Moderate Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      // Moderate features per GINA/GOLD guidelines
      const moderateFeatures = 
        ((input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation >= 90 && input.vitals.oxygenSaturation < 94) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 20 && input.vitals.respiratoryRate <= 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100 && input.vitals.heartRate <= 120)) &&
        // Not meeting severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma');
      
      // Functional limitations but not severe
      const moderateFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          (s.toLowerCase().includes('moderate') || s.toLowerCase().includes('worse'))) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('walking'))
      );
      
      // Direct mention of moderate exacerbation
      const moderateExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('moderate')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('exacerbation') && 
        !s.toLowerCase().includes('severe') && 
        !s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const moderateFlag = input.flags?.includes('moderate_asthma') || input.flags?.includes('moderate_copd');
      
      return (moderateFeatures || moderateFunctional || moderateExacerbation || moderateFlag) && 
        // Exclude those meeting severe criteria
        !input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis')
        );
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Moderate asthma/COPD exacerbation: increased work of breathing but without severe features. Requires prompt bronchodilators, steroids, and monitoring.',
      confidence: 0.85
    }
  },
  {
    id: 'RESP-6',
    name: 'Community-Acquired Pneumonia (Concerning Vitals)',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumonia')) && (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 24);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Community-acquired pneumonia with tachypnea. Requires prompt antibiotics and monitoring.',
      confidence: 0.83
    }
  },
  {
    id: 'RESP-7',
    name: 'Spontaneous Pneumothorax (Stable)',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumothorax')) && !(input.flags?.includes('tension_pneumothorax'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Spontaneous pneumothorax (stable): requires monitoring and possible intervention.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-8',
    name: 'Hemoptysis with Risk Factors',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('hemoptysis')) && (input.medicalHistory || []).some(h => h.toLowerCase().includes('cancer') || h.toLowerCase().includes('tb'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Hemoptysis with risk factors (cancer, TB). Requires urgent evaluation for underlying cause.',
      confidence: 0.8
    }
  },
  // --- Ophthalmological Rules ---
  {
    id: 'OPHTHAL-1',
    name: 'Chemical Eye Burn',
    category: 'Ophthalmological',
    weight: 10,
    match: (input) => {
      // Chemical exposures
      const chemicalExposure = input.symptoms.some(s => 
        s.toLowerCase().includes('chemical') || 
        s.toLowerCase().includes('acid') || 
        s.toLowerCase().includes('alkali') || 
        s.toLowerCase().includes('bleach') || 
        s.toLowerCase().includes('cleaner') || 
        s.toLowerCase().includes('irritant') || 
        s.toLowerCase().includes('corrosive')
      );
      
      // Eye pain, burning, vision changes
      const eyeSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('eye pain') || 
        s.toLowerCase().includes('burning') || 
        s.toLowerCase().includes('vision change') || 
        s.toLowerCase().includes('blurry vision') || 
        s.toLowerCase().includes('red eye') || 
        s.toLowerCase().includes('tearing')
      );
      
      // Exposure within minutes
      const recentExposure = input.symptoms.some(s => 
        s.toLowerCase().includes('just now') || 
        s.toLowerCase().includes('minutes ago') || 
        s.toLowerCase().includes('seconds ago')
      );
      
      return chemicalExposure && eyeSymptoms && recentExposure;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Chemical eye burn: time-critical emergency with risk of permanent vision loss within minutes. Immediate irrigation, antibiotics, and ophthalmology consult required.',
      confidence: 0.98
    }
  },
  {
    id: 'OPHTHAL-2',
    name: 'Acute Angle-Closure Glaucoma',
    category: 'Ophthalmological',
    weight: 9,
    match: (input) => {
      // Severe eye pain, vision changes, halos around lights
      const severeEyePain = input.symptoms.some(s => 
        s.toLowerCase().includes('eye pain') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('intense') || 
          s.toLowerCase().includes('excruciating')
        )
      );
      
      const visionChanges = input.symptoms.some(s => 
        s.toLowerCase().includes('vision change') || 
        s.toLowerCase().includes('blurry vision') || 
        s.toLowerCase().includes('halo') || 
        s.toLowerCase().includes('light')
      );
      
      // Associated symptoms
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('headache') || 
        s.toLowerCase().includes('nausea') || 
        s.toLowerCase().includes('vomiting')
      );
      
      return severeEyePain && visionChanges && associatedSymptoms;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Acute angle-closure glaucoma: severe eye pain, vision changes, and associated symptoms. Immediate IOP reduction and ophthalmology consult required. Risk of permanent vision loss if delayed >6-12 hours.',
      confidence: 0.95
    }
  },
  {
    id: 'OPHTHAL-3',
    name: 'Retinal Detachment',
    category: 'Ophthalmological',
    weight: 8,
    match: (input) => {
      // Classic symptoms
      const classicSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('floaters') || 
        s.toLowerCase().includes('flashes') || 
        s.toLowerCase().includes('curtain') || 
        s.toLowerCase().includes('shadow') || 
        s.toLowerCase().includes('vision loss')
      );
      
      // Risk factors
      const riskFactors = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('myopia') || 
        h.toLowerCase().includes('retinal detachment') || 
        h.toLowerCase().includes('trauma')
      );
      
      return classicSymptoms && riskFactors;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Retinal detachment: classic symptoms and risk factors. Same-day evaluation and surgical intervention required to prevent permanent vision loss.',
      confidence: 0.9
    }
  },
  // --- ENT (Ear, Nose, Throat) Rules ---
  {
    id: 'ENT-1',
    name: 'Severe Epistaxis',
    category: 'ENT',
    weight: 8,
    match: (input) => {
      // Severe/uncontrolled nosebleeds
      const severeEpistaxis = input.symptoms.some(s => 
        s.toLowerCase().includes('epistaxis') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('uncontrolled') || 
          s.toLowerCase().includes('profuse')
        )
      );
      
      // Hypovolemic signs
      const hypovolemicSigns = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100) || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('dizziness') || 
          s.toLowerCase().includes('lightheaded') || 
          s.toLowerCase().includes('faint') || 
          s.toLowerCase().includes('syncope')
        );
      
      // Posterior bleeding, anticoagulation risk
      const posteriorBleeding = input.symptoms.some(s => 
        s.toLowerCase().includes('posterior') || 
        s.toLowerCase().includes('back of the nose')
      );
      
      const anticoagulationRisk = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('anticoagulant') || 
        h.toLowerCase().includes('blood thinner') || 
        h.toLowerCase().includes('warfarin')
      );
      
      return severeEpistaxis && (hypovolemicSigns || posteriorBleeding || anticoagulationRisk);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'ENT', type: 'secondary' }
      ],
      explain: 'Severe epistaxis: potential for life-threatening blood loss and airway compromise. Immediate ENT consult and intervention required.',
      confidence: 0.92
    }
  },
  {
    id: 'ENT-2',
    name: 'Airway Foreign Body',
    category: 'ENT',
    weight: 10,
    match: (input) => {
      // Choking, foreign bodies in the airway/throat
      const choking = input.symptoms.some(s => 
        s.toLowerCase().includes('choking') || 
        s.toLowerCase().includes('coughing') || 
        s.toLowerCase().includes('gagging') || 
        s.toLowerCase().includes('difficulty swallowing')
      );
      
      const foreignBody = input.symptoms.some(s => 
        s.toLowerCase().includes('foreign body') || 
        s.toLowerCase().includes('object') || 
        s.toLowerCase().includes('food') || 
        s.toLowerCase().includes('bite')
      );
      
      // Signs of airway obstruction
      const airwayObstruction = input.symptoms.some(s => 
        s.toLowerCase().includes('stridor') || 
import type { TriageRequest, TriageRuleResult } from '@/types/triage';

export interface EnhancedTriageRule {
  id: string;
  name: string;
  category: string;
  weight: number;
  match: (input: TriageRequest) => boolean;
  result: Omit<TriageRuleResult, 'explainability'> & {
    explain: string;
    confidence?: number;
  };
}

export const enhancedTriageRules: EnhancedTriageRule[] = [
  // --- Cardiac & Circulatory Rules ---
  {
    id: 'CARD-1',
    name: 'STEMI (Suspected Acute MI)',
    category: 'Cardiac',
    weight: 10,
    match: (input) => {
      // Enhanced STEMI criteria using more comprehensive assessment
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain') || s.toLowerCase().includes('chest pressure') || s.toLowerCase().includes('chest discomfort'));
      const typicalFeatures = input.symptoms.some(s => 
        s.toLowerCase().includes('crushing') || 
        s.toLowerCase().includes('radiat') ||
        s.toLowerCase().includes('left arm') ||
        s.toLowerCase().includes('jaw') ||
        s.toLowerCase().includes('burning')
      );
      
      const highRiskHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('mi') || 
        h.toLowerCase().includes('coronary') || 
        h.toLowerCase().includes('stent') || 
        h.toLowerCase().includes('cabg')
      );
      
      const diabetesHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      
      const stFlag = input.flags?.includes('st_elevation') || input.flags?.includes('stemi');
      const troponinFlag = input.flags?.includes('troponin_positive');
      
      // Match classic presentation OR elevated troponin/ST elevation
      return (chestPain && typicalFeatures && (highRiskHistory || diabetesHistory || input.age > 50)) || stFlag || troponinFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected STEMI: classic chest pain with risk factors or positive cardiac markers. Immediate ECG and cardiac consult required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-1b',
    name: 'Suspected NSTEMI/Unstable Angina',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      // Core symptoms
      const chestPain = input.symptoms.some(s => 
        s.toLowerCase().includes('chest pain') || 
        s.toLowerCase().includes('chest pressure') || 
        s.toLowerCase().includes('chest discomfort')
      );
      
      // Rest pain or crescendo pattern is concerning for ACS
      const unstablePattern = input.symptoms.some(s => 
        s.toLowerCase().includes('rest') || 
        s.toLowerCase().includes('worsening') || 
        s.toLowerCase().includes('more frequent') || 
        s.toLowerCase().includes('prolonged')
      );
      
      // Associated symptoms
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('sweating') || 
        s.toLowerCase().includes('nausea')
      );
      
      return chestPain && (unstablePattern || associatedSymptoms) && !input.flags?.includes('st_elevation');
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected NSTEMI/Unstable Angina: chest pain with unstable pattern or associated symptoms. Immediate ECG and cardiac evaluation required.',
      confidence: 0.9
    }
  },
  {
    id: 'CARD-2',
    name: 'High-Risk Chest Pain',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain'));
      const age = input.age || 0;
      const diabetes = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      const priorMI = (input.medicalHistory || []).some(h => h.toLowerCase().includes('mi'));
      return chestPain && (age > 65 || diabetes || priorMI);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'High-risk chest pain (elderly, diabetes, or prior MI). Treat as ACS until proven otherwise.',
      confidence: 0.85
    }
  },
  {
    id: 'CARD-3',
    name: 'Cardiac Arrest',
    category: 'Cardiac',
    weight: 10,
    match: (input) => 
      input.flags?.includes('cardiac_arrest') || 
      input.flags?.includes('no_pulse') || 
      input.symptoms.some(s => s.toLowerCase().includes('cardiac arrest') || s.toLowerCase().includes('no pulse')),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Cardiac arrest detected. Immediate resuscitation and post-ROSC care required.',
      confidence: 0.99
    }
  },
  {
    id: 'CARD-4',
    name: 'Life-Threatening Arrhythmia',
    category: 'Cardiac',
    weight: 9,
    match: (input) => input.flags?.includes('vfib') || input.flags?.includes('vtach') || input.flags?.includes('bradycardia') || input.flags?.includes('heart_block'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Life-threatening arrhythmia detected (VF, VT, bradycardia, or heart block). Immediate intervention required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-5',
    name: 'Heart Failure with Respiratory Distress',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const heartFailureHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('heart failure'));
      const acuteDistress = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('dyspnea') || 
        s.toLowerCase().includes('orthopnea') || 
        s.toLowerCase().includes('paroxysmal nocturnal')
      );
      const hypoxemia = (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94);
      
      // Expanded to catch both known and new heart failure
      return (acuteDistress && (heartFailureHistory || input.symptoms.some(s => 
        s.toLowerCase().includes('edema') || 
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('jvd') ||
        s.toLowerCase().includes('heart failure')
      ))) && hypoxemia;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Acute heart failure with respiratory distress and hypoxemia. Immediate stabilization and treatment required.',
      confidence: 0.92
    }
  },
  {
    id: 'CARD-5b',
    id: 'CARD-6',
    name: 'Hypertensive Emergency',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const sbp = input.vitals?.systolicBP || 0;
      const endOrgan = input.flags?.includes('end_organ_damage');
      return sbp > 180 && endOrgan;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Hypertensive emergency: SBP >180 with end-organ damage. Immediate BP control and monitoring required.',
      confidence: 0.93
    }
  },
  // Airway, Breathing, Circulation (ABC)
  {
    id: 'ABC-1',
    name: 'Airway Compromise',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('airway_compromise') || input.flags?.includes('stridor') || input.symptoms.includes('unable_to_speak'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Anesthesiology', type: 'secondary' }
      ],
      explain: 'Airway compromise detected → Critical priority for immediate airway intervention.',
      confidence: 0.98
    }
  },
  {
    id: 'ABC-2',
    name: 'Respiratory Failure',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('no_breath') || input.flags?.includes('ineffective_breathing') || (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate < 8),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Respiratory failure or severe bradypnea detected → Critical priority for ventilatory support.',
      confidence: 0.97
    }
  },
  {
    id: 'ABC-3',
    name: 'Severe Hypoxemia',
    category: 'ABC',
    weight: 9,
    match: (input) => (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 85) || input.flags?.includes('cyanosis'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe hypoxemia (SpO₂ < 85%) → Critical priority for oxygenation.',
      confidence: 0.95
    }
  },
  // --- Respiratory Rules ---
  {
    id: 'RESP-1',
    name: 'Acute Respiratory Failure',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      const rr = input.vitals?.respiratoryRate;
      const spo2 = input.vitals?.oxygenSaturation;
      return (rr !== undefined && (rr > 30 || rr < 8)) || (spo2 !== undefined && spo2 < 90) || (input.flags?.includes('severe_respiratory_distress'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Acute respiratory failure: abnormal RR or SpO₂ < 90%, or severe distress. Immediate airway and ventilatory support required.',
      confidence: 0.95
    }
  },
  {
    id: 'RESP-2',
    name: 'Tension Pneumothorax',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('tension_pneumothorax') || (input.symptoms.some(s => s.toLowerCase().includes('chest pain')) && input.flags?.includes('deviated_trachea'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Tension pneumothorax suspected: chest pain with deviated trachea or flag. Immediate needle decompression required.',
      confidence: 0.97
    }
  },
  {
    id: 'RESP-3',
    name: 'Severe Asthma Exacerbation',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      // Life-threatening features
      const lifeThreatening = 
        input.flags?.includes('silent_chest') || 
        input.flags?.includes('cyanosis') || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis') || 
          s.toLowerCase().includes('altered consciousness') ||
          s.toLowerCase().includes('exhaustion')
        );
      
      // Severe features per GINA guidelines
      const severeFeatures = 
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 90) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('complete sentence')) ||
          (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('<50%')) ||
          (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('<50%')) ||
          s.toLowerCase().includes('accessory muscle') ||
          s.toLowerCase().includes('tripod position') ||
          (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe'))
        );
      
      // Direct mention of severe asthma
      const severeAsthma = input.symptoms.some(s => 
        (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe')) ||
        (s.toLowerCase().includes('status asthmaticus'))
      );
      
      // Include flag-based detection
      const severeFlag = 
        input.flags?.includes('severe_asthma') || 
        input.flags?.includes('status_asthmaticus');
      
      return lifeThreatening || severeFeatures || severeAsthma || severeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe asthma exacerbation with life-threatening or severe features. Immediate continuous bronchodilators, steroids, and possible respiratory support required.',
      confidence: 0.93
    }
  },
  {
    id: 'RESP-4',
    name: 'Pulmonary Embolism (High-Risk)',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      const spo2 = input.vitals?.oxygenSaturation;
      const hr = input.vitals?.heartRate;
      return input.flags?.includes('high_risk_pe') || (spo2 !== undefined && spo2 < 92 && hr !== undefined && hr > 110 && input.symptoms.some(s => s.toLowerCase().includes('pleuritic pain')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'High-risk pulmonary embolism: hypoxemia, tachycardia, pleuritic pain. Immediate imaging and anticoagulation required.',
      confidence: 0.92
    }
  },
  {
    id: 'RESP-5',
    name: 'Moderate Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      // Moderate features per GINA/GOLD guidelines
      const moderateFeatures = 
        ((input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation >= 90 && input.vitals.oxygenSaturation < 94) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 20 && input.vitals.respiratoryRate <= 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100 && input.vitals.heartRate <= 120)) &&
        // Not meeting severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma');
      
      // Functional limitations but not severe
      const moderateFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          (s.toLowerCase().includes('moderate') || s.toLowerCase().includes('worse'))) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('walking'))
      );
      
      // Direct mention of moderate exacerbation
      const moderateExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('moderate')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('exacerbation') && 
        !s.toLowerCase().includes('severe') && 
        !s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const moderateFlag = input.flags?.includes('moderate_asthma') || input.flags?.includes('moderate_copd');
      
      return (moderateFeatures || moderateFunctional || moderateExacerbation || moderateFlag) && 
        // Exclude those meeting severe criteria
        !input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis')
        );
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Moderate asthma/COPD exacerbation: increased work of breathing but without severe features. Requires prompt bronchodilators, steroids, and monitoring.',
      confidence: 0.85
    }
  },
  {
    id: 'RESP-6',
    name: 'Community-Acquired Pneumonia (Concerning Vitals)',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumonia')) && (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 24);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Community-acquired pneumonia with tachypnea. Requires prompt antibiotics and monitoring.',
      confidence: 0.83
    }
  },
  {
    id: 'RESP-7',
    name: 'Spontaneous Pneumothorax (Stable)',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumothorax')) && !(input.flags?.includes('tension_pneumothorax'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Spontaneous pneumothorax (stable): requires monitoring and possible intervention.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-8',
    name: 'Hemoptysis with Risk Factors',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('hemoptysis')) && (input.medicalHistory || []).some(h => h.toLowerCase().includes('cancer') || h.toLowerCase().includes('tb'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Hemoptysis with risk factors (cancer, TB). Requires urgent evaluation for underlying cause.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-9',
    name: 'Mild Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 4,
    match: (input) => {
      // Mild features per GINA/GOLD guidelines
      const mildFeatures = 
        ((input.vitals?.oxygenSaturation === undefined || input.vitals.oxygenSaturation >= 94) &&
        (input.vitals?.respiratoryRate === undefined || input.vitals.respiratoryRate <= 20) &&
        (input.vitals?.heartRate === undefined || input.vitals.heartRate <= 100)) &&
        // Not meeting moderate or severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma') &&
        !input.flags?.includes('moderate_asthma');
      
      // Minimal functional limitations
      const mildFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('mild')) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('>80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('>80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('exertion'))
      );
      
      // Direct mention of mild exacerbation
      const mildExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('mild')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('exacerbation') && 
          s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const mildFlag = input.flags?.includes('mild_asthma') || input.flags?.includes('mild_copd');
      
      // Normal activities and sleep not affected significantly
      const minimalImpact = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('minimal impact')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('well controlled'))
      );
      
      return (mildFeatures || mildFunctional || mildExacerbation || mildFlag || minimalImpact) && 
        // Exclude those meeting moderate or severe criteria
        !input.symptoms.some(s => 
          s.toLowerCase().includes('moderate') || 
          s.toLowerCase().includes('severe') ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Mild asthma/COPD exacerbation with minimal impact on function and normal vital signs. Can be managed with bronchodilators and short-term steroids in outpatient setting.',
      confidence: 0.7
    }
  },
  {
    id: 'RESP-10',
    name: 'Upper Respiratory Infection (Normal Vitals)',
    category: 'Respiratory',
    weight: 3,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('uri') || s.toLowerCase().includes('upper respiratory infection')) && (!input.vitals || (input.vitals.respiratoryRate === undefined || input.vitals.respiratoryRate <= 20));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 4,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Upper respiratory infection with normal vitals: routine care.',
      confidence: 0.6
    }
  },
  {
    id: 'RESP-11',
    name: 'Chronic Cough (Stable)',
    category: 'Respiratory',
    weight: 2,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('chronic cough')) && (!input.vitals || (input.vitals.oxygenSaturation === undefined || input.vitals.oxygenSaturation >= 94));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 5,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Chronic cough with stable vitals: non-urgent evaluation.',
      confidence: 0.5
    }
  },
  // --- Neurological Rules ---
  {
    id: 'NEURO-1',
    name: 'Acute Stroke (FAST Positive)',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Enhanced stroke detection using expanded FAST-ED criteria
      const strokeSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('facial droop') || 
        s.toLowerCase().includes('face droop') || 
        s.toLowerCase().includes('arm weakness') || 
        s.toLowerCase().includes('leg weakness') || 
        (s.toLowerCase().includes('speech') && (
          s.toLowerCase().includes('slurred') || 
          s.toLowerCase().includes('difficulty') || 
          s.toLowerCase().includes('aphasia')
        )) ||
        s.toLowerCase().includes('stroke') ||
        s.toLowerCase().includes('hemiparesis') ||
        s.toLowerCase().includes('hemineglect') ||
        s.toLowerCase().includes('visual field')
      );
      
      // Time is brain - time factors are crucial
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_4.5h') || 
        input.flags?.includes('onset_under_24h') || 
        input.symptoms.some(s => s.toLowerCase().includes('last known well') && s.toLowerCase().includes('hour'));
      
      const strokeFlag = input.flags?.includes('stroke') || input.flags?.includes('cva');
      
      // Either explicit stroke symptoms or stroke flag, with time sensitivity
      return (strokeSigns || strokeFlag) && (timeFlag || !input.flags?.includes('onset_over_24h'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Acute stroke suspected: FAST positive (face, arm, speech, time). Immediate stroke protocol activation and time-sensitive imaging required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-1b',
    name: 'Suspected Large Vessel Occlusion Stroke',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Signs of severe neurological deficit suggesting LVO
      const lvoSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('gaze deviation') || 
        (s.toLowerCase().includes('severe') && s.toLowerCase().includes('deficit')) ||
        (s.toLowerCase().includes('multiple') && s.toLowerCase().includes('deficit')) ||
        s.toLowerCase().includes('aphasia') ||
        s.toLowerCase().includes('neglect')
      );
      
      // High NIHSS or specific flag
      const severityFlag = 
        input.flags?.includes('lvo') || 
        input.flags?.includes('high_nihss') || 
        input.flags?.includes('severe_stroke');
      
      // Time window for endovascular intervention is longer
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_24h');
      
      return (lvoSigns || severityFlag) && timeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' },
        { name: 'Interventional Radiology', type: 'tertiary' }
      ],
      explain: 'Suspected large vessel occlusion stroke: severe deficits within intervention window. Immediate CTA and thrombectomy evaluation required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-2',
    name: 'Status Epilepticus',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('status_epilepticus') || 
        input.flags?.includes('ongoing_seizure') || 
        input.symptoms.some(s => s.toLowerCase().includes('seizure') && (s.toLowerCase().includes('continuous') || s.toLowerCase().includes('multiple')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Status epilepticus: ongoing seizure or multiple seizures without recovery. Immediate anticonvulsant therapy required.',
      confidence: 0.98
    }
  },
  {
    id: 'NEURO-3',
    name: 'Altered Mental Status (GCS < 9)',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      return (input.vitals?.gcs !== undefined && input.vitals.gcs < 9) || 
        input.flags?.includes('unresponsive') || 
        input.symptoms.some(s => s.toLowerCase().includes('unconscious'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Severe altered mental status: GCS < 9 or unresponsive. Immediate airway management and neurological evaluation required.',
      confidence: 0.96
    }
  },
  {
    id: 'NEURO-4',
    name: 'Thunderclap Headache',
    category: 'Neurological',
    weight: 9,
    match: (input) => {
      // Enhanced criteria for thunderclap headache
      const thunderclapFeatures = input.symptoms.some(s => 
        (s.toLowerCase().includes('headache') && (
          s.toLowerCase().includes('worst') || 
          s.toLowerCase().includes('thunderclap') || 
          s.toLowerCase().includes('sudden') ||
          s.toLowerCase().includes('severe') ||
          s.toLowerCase().includes('explosive')
        )) ||
        s.toLowerCase().includes('subarachnoid')
      );
      
      // Associated signs that increase concern
      const concerningSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('neck stiffness') || 
        s.toLowerCase().includes('photophobia') ||
        s.toLowerCase().includes('vomiting') ||
        s.toLowerCase().includes('altered') ||
        s.toLowerCase().includes('neurological')
      ) || input.flags?.includes('meningeal_signs');
      
      return thunderclapFeatures || 
        input.flags?.includes('thunderclap_headache') || 
        (input.symptoms.some(s => s.toLowerCase().includes('headache')) && concerningSigns);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Thunderclap headache: sudden, severe, worst-ever or with concerning features. Immediate evaluation for subarachnoid hemorrhage required.',
      confidence: 0.93
    }
  },
  {
    id: 'NEURO-5',
    name: 'Acute Spinal Cord Compression',
    category: 'Neurological',
    weight: 9,
    match: (input) => {
      return input.flags?.includes('cord_compression') || 
        input.symptoms.some(s => 
          (s.toLowerCase().includes('paralysis') || s.toLowerCase().includes('weakness')) && 
          (s.toLowerCase().includes('legs') || s.toLowerCase().includes('arms'))
        ) && input.symptoms.some(s => s.toLowerCase().includes('bladder') || s.toLowerCase().includes('bowel'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' }
      ],
      explain: 'Acute spinal cord compression: limb weakness with bowel/bladder dysfunction. Immediate imaging and neurosurgical consultation required.',
      confidence: 0.92
    }
  },
  {
    id: 'NEURO-5b',
    name: 'Intracranial Hemorrhage',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Direct mention or signs
      const bleedSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('intracranial hemorrhage') || 
        s.toLowerCase().includes('ich') || 
        s.toLowerCase().includes('cerebral hemorrhage') ||
        s.toLowerCase().includes('brain bleed') ||
        s.toLowerCase().includes('hemorrhagic stroke')
      );
      
      // With neurological deficit
      const deficits = input.symptoms.some(s => 
        s.toLowerCase().includes('weakness') || 
        s.toLowerCase().includes('numbness') ||
        s.toLowerCase().includes('speech') ||
        s.toLowerCase().includes('vision') ||
        s.toLowerCase().includes('level of consciousness')
      );
      
      // Flag for any intracranial bleed
      const bleedFlag = 
        input.flags?.includes('intracranial_hemorrhage') || 
        input.flags?.includes('brain_bleed') || 
        input.flags?.includes('hemorrhagic_stroke');
      
      return bleedSigns || bleedFlag || (input.symptoms.some(s => s.toLowerCase().includes('severe headache')) && deficits);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' },
        { name: 'Neurology', type: 'tertiary' }
      ],
      explain: 'Suspected intracranial hemorrhage. Immediate head CT and neurosurgical evaluation required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-6',
    name: 'First-Time Seizure',
    category: 'Neurological',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('seizure') && s.toLowerCase().includes('first')) && 
        !input.medicalHistory?.some(h => h.toLowerCase().includes('epilepsy') || h.toLowerCase().includes('seizure'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'First-time seizure (now resolved): requires prompt evaluation for underlying cause.',
      confidence: 0.89
    }
  },
  {
    id: 'NEURO-7',
    name: 'Transient Ischemic Attack',
    category: 'Neurological',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('tia') || 
        (s.toLowerCase().includes('stroke') && s.toLowerCase().includes('resolved')));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Transient Ischemic Attack: resolved focal neurological symptoms. Requires prompt evaluation to prevent stroke.',
      confidence: 0.85
    }
  },
  {
    id: 'NEURO-8',
    name: 'Migraine with Neurological Deficits',
    category: 'Neurological',
    weight: 6,
    match: (input) => {
      // Enhanced detection of migraine with aura
      const migraine = input.symptoms.some(s => s.toLowerCase().includes('migraine'));
      
      const auraSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('aura') || 
        s.toLowerCase().includes('visual') || 
        s.toLowerCase().includes('scintillating') || 
        s.toLowerCase().includes('scotoma') || 
        s.toLowerCase().includes('numbness') || 
        s.toLowerCase().includes('tingling') ||
        s.toLowerCase().includes('paresthesia')
      );
      
      // History of similar episodes reduces concern
      const knownHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('migraine with aura') || 
        h.toLowerCase().includes('complex migraine')
      );
      
      // First time is more concerning than recurrent with same pattern
      const firstTimeFlag = input.flags?.includes('first_time') || input.symptoms.some(s => s.toLowerCase().includes('first') && s.toLowerCase().includes('time'));
      
      // Concerning if first time or different from usual pattern
      return migraine && auraSymptoms && (firstTimeFlag || input.symptoms.some(s => s.toLowerCase().includes('different')) || !knownHistory);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Migraine with neurological deficits (atypical or first-time): requires evaluation to rule out more serious conditions.',
      confidence: 0.8
    }
  },
  {
    id: 'NEURO-9',
    name: 'Vertigo with Neurological Symptoms',
    category: 'Neurological',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('vertigo')) && 
        (input.symptoms.some(s => 
          s.toLowerCase().includes('double vision') || 
          s.toLowerCase().includes('diplopia') || 
          s.toLowerCase().includes('dysarthria') || 
          s.toLowerCase().includes('ataxia') || 
          s.toLowerCase().includes('weakness')
        ) || 
        input.flags?.includes('central_vertigo'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Vertigo with neurological symptoms: concerning for central cause. Requires neurological evaluation.',
      confidence: 0.82
    }
  },
  {
    id: 'NEURO-10',
    name: 'Uncomplicated Syncope in Young, Healthy Patient',
    category: 'Neurological',
    weight: 4,
    match: (input) => {
      const age = input.age || 0;
      return input.symptoms.some(s => s.toLowerCase().includes('syncope') || s.toLowerCase().includes('fainting')) && 
        age < 40 && 
        !(input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('heart') || 
          h.toLowerCase().includes('cardiac') || 
          h.toLowerCase().includes('epilepsy')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Uncomplicated syncope in young, healthy patient: likely vasovagal. Requires standard evaluation.',
      confidence: 0.75
    }
  },
  {
    id: 'NEURO-11',
    name: 'Chronic Stable Headache',
    category: 'Neurological',
    weight: 3,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('headache') && (s.toLowerCase().includes('chronic') || s.toLowerCase().includes('recurring'))) && 
        !input.symptoms.some(s => 
          s.toLowerCase().includes('worst') || 
          s.toLowerCase().includes('new') || 
          s.toLowerCase().includes('neurological') || 
          s.toLowerCase().includes('fever')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 4,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Chronic stable headache pattern: routine evaluation for management.',
      confidence: 0.7
    }
import type { TriageRequest, TriageRuleResult } from '@/types/triage';

export interface EnhancedTriageRule {
  id: string;
  name: string;
  category: string;
  weight: number;
  match: (input: TriageRequest) => boolean;
  result: Omit<TriageRuleResult, 'explainability'> & {
    explain: string;
    confidence?: number;
  };
}

export const enhancedTriageRules: EnhancedTriageRule[] = [
  // --- Cardiac & Circulatory Rules ---
  {
    id: 'CARD-1',
    name: 'STEMI (Suspected Acute MI)',
    category: 'Cardiac',
    weight: 10,
    match: (input) => {
      // Enhanced STEMI criteria using more comprehensive assessment
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain') || s.toLowerCase().includes('chest pressure') || s.toLowerCase().includes('chest discomfort'));
      const typicalFeatures = input.symptoms.some(s => 
        s.toLowerCase().includes('crushing') || 
        s.toLowerCase().includes('radiat') ||
        s.toLowerCase().includes('left arm') ||
        s.toLowerCase().includes('jaw') ||
        s.toLowerCase().includes('burning')
      );
      
      const highRiskHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('mi') || 
        h.toLowerCase().includes('coronary') || 
        h.toLowerCase().includes('stent') || 
        h.toLowerCase().includes('cabg')
      );
      
      const diabetesHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      
      const stFlag = input.flags?.includes('st_elevation') || input.flags?.includes('stemi');
      const troponinFlag = input.flags?.includes('troponin_positive');
      
      // Match classic presentation OR elevated troponin/ST elevation
      return (chestPain && typicalFeatures && (highRiskHistory || diabetesHistory || input.age > 50)) || stFlag || troponinFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected STEMI: classic chest pain with risk factors or positive cardiac markers. Immediate ECG and cardiac consult required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-1b',
    name: 'Suspected NSTEMI/Unstable Angina',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      // Core symptoms
      const chestPain = input.symptoms.some(s => 
        s.toLowerCase().includes('chest pain') || 
        s.toLowerCase().includes('chest pressure') || 
        s.toLowerCase().includes('chest discomfort')
      );
      
      // Rest pain or crescendo pattern is concerning for ACS
      const unstablePattern = input.symptoms.some(s => 
        s.toLowerCase().includes('rest') || 
        s.toLowerCase().includes('worsening') || 
        s.toLowerCase().includes('more frequent') || 
        s.toLowerCase().includes('prolonged')
      );
      
      // Associated symptoms
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('sweating') || 
        s.toLowerCase().includes('nausea')
      );
      
      return chestPain && (unstablePattern || associatedSymptoms) && !input.flags?.includes('st_elevation');
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected NSTEMI/Unstable Angina: chest pain with unstable pattern or associated symptoms. Immediate ECG and cardiac evaluation required.',
      confidence: 0.9
    }
  },
  {
    id: 'CARD-2',
    name: 'High-Risk Chest Pain',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain'));
      const age = input.age || 0;
      const diabetes = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      const priorMI = (input.medicalHistory || []).some(h => h.toLowerCase().includes('mi'));
      return chestPain && (age > 65 || diabetes || priorMI);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'High-risk chest pain (elderly, diabetes, or prior MI). Treat as ACS until proven otherwise.',
      confidence: 0.85
    }
  },
  {
    id: 'CARD-3',
    name: 'Cardiac Arrest',
    category: 'Cardiac',
    weight: 10,
    match: (input) => 
      input.flags?.includes('cardiac_arrest') || 
      input.flags?.includes('no_pulse') || 
      input.symptoms.some(s => s.toLowerCase().includes('cardiac arrest') || s.toLowerCase().includes('no pulse')),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Cardiac arrest detected. Immediate resuscitation and post-ROSC care required.',
      confidence: 0.99
    }
  },
  {
    id: 'CARD-4',
    name: 'Life-Threatening Arrhythmia',
    category: 'Cardiac',
    weight: 9,
    match: (input) => input.flags?.includes('vfib') || input.flags?.includes('vtach') || input.flags?.includes('bradycardia') || input.flags?.includes('heart_block'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Life-threatening arrhythmia detected (VF, VT, bradycardia, or heart block). Immediate intervention required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-5',
    name: 'Heart Failure with Respiratory Distress',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const heartFailureHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('heart failure'));
      const acuteDistress = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('dyspnea') || 
        s.toLowerCase().includes('orthopnea') || 
        s.toLowerCase().includes('paroxysmal nocturnal')
      );
      const hypoxemia = (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94);
      
      // Expanded to catch both known and new heart failure
      return (acuteDistress && (heartFailureHistory || input.symptoms.some(s => 
        s.toLowerCase().includes('edema') || 
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('jvd') ||
        s.toLowerCase().includes('heart failure')
      ))) && hypoxemia;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Acute heart failure with respiratory distress and hypoxemia. Immediate stabilization and treatment required.',
      confidence: 0.92
    }
  },
  {
    id: 'CARD-5b',
    id: 'CARD-6',
    name: 'Hypertensive Emergency',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const sbp = input.vitals?.systolicBP || 0;
      const endOrgan = input.flags?.includes('end_organ_damage');
      return sbp > 180 && endOrgan;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Hypertensive emergency: SBP >180 with end-organ damage. Immediate BP control and monitoring required.',
      confidence: 0.93
    }
  },
  // Airway, Breathing, Circulation (ABC)
  {
    id: 'ABC-1',
    name: 'Airway Compromise',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('airway_compromise') || input.flags?.includes('stridor') || input.symptoms.includes('unable_to_speak'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Anesthesiology', type: 'secondary' }
      ],
      explain: 'Airway compromise detected → Critical priority for immediate airway intervention.',
      confidence: 0.98
    }
  },
  {
    id: 'ABC-2',
    name: 'Respiratory Failure',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('no_breath') || input.flags?.includes('ineffective_breathing') || (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate < 8),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Respiratory failure or severe bradypnea detected → Critical priority for ventilatory support.',
      confidence: 0.97
    }
  },
  {
    id: 'ABC-3',
    name: 'Severe Hypoxemia',
    category: 'ABC',
    weight: 9,
    match: (input) => (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 85) || input.flags?.includes('cyanosis'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe hypoxemia (SpO₂ < 85%) → Critical priority for oxygenation.',
      confidence: 0.95
    }
  },
  // --- Respiratory Rules ---
  {
    id: 'RESP-1',
    name: 'Acute Respiratory Failure',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      const rr = input.vitals?.respiratoryRate;
      const spo2 = input.vitals?.oxygenSaturation;
      return (rr !== undefined && (rr > 30 || rr < 8)) || (spo2 !== undefined && spo2 < 90) || (input.flags?.includes('severe_respiratory_distress'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Acute respiratory failure: abnormal RR or SpO₂ < 90%, or severe distress. Immediate airway and ventilatory support required.',
      confidence: 0.95
    }
  },
  {
    id: 'RESP-2',
    name: 'Tension Pneumothorax',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('tension_pneumothorax') || (input.symptoms.some(s => s.toLowerCase().includes('chest pain')) && input.flags?.includes('deviated_trachea'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Tension pneumothorax suspected: chest pain with deviated trachea or flag. Immediate needle decompression required.',
      confidence: 0.97
    }
  },
  {
    id: 'RESP-3',
    name: 'Severe Asthma Exacerbation',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      // Life-threatening features
      const lifeThreatening = 
        input.flags?.includes('silent_chest') || 
        input.flags?.includes('cyanosis') || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis') || 
          s.toLowerCase().includes('altered consciousness') ||
          s.toLowerCase().includes('exhaustion')
        );
      
      // Severe features per GINA guidelines
      const severeFeatures = 
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 90) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('complete sentence')) ||
          (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('<50%')) ||
          (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('<50%')) ||
          s.toLowerCase().includes('accessory muscle') ||
          s.toLowerCase().includes('tripod position') ||
          (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe'))
        );
      
      // Direct mention of severe asthma
      const severeAsthma = input.symptoms.some(s => 
        (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe')) ||
        (s.toLowerCase().includes('status asthmaticus'))
      );
      
      // Include flag-based detection
      const severeFlag = 
        input.flags?.includes('severe_asthma') || 
        input.flags?.includes('status_asthmaticus');
      
      return lifeThreatening || severeFeatures || severeAsthma || severeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe asthma exacerbation with life-threatening or severe features. Immediate continuous bronchodilators, steroids, and possible respiratory support required.',
      confidence: 0.93
    }
  },
  {
    id: 'RESP-4',
    name: 'Pulmonary Embolism (High-Risk)',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      const spo2 = input.vitals?.oxygenSaturation;
      const hr = input.vitals?.heartRate;
      return input.flags?.includes('high_risk_pe') || (spo2 !== undefined && spo2 < 92 && hr !== undefined && hr > 110 && input.symptoms.some(s => s.toLowerCase().includes('pleuritic pain')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'High-risk pulmonary embolism: hypoxemia, tachycardia, pleuritic pain. Immediate imaging and anticoagulation required.',
      confidence: 0.92
    }
  },
  {
    id: 'RESP-5',
    name: 'Moderate Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      // Moderate features per GINA/GOLD guidelines
      const moderateFeatures = 
        ((input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation >= 90 && input.vitals.oxygenSaturation < 94) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 20 && input.vitals.respiratoryRate <= 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100 && input.vitals.heartRate <= 120)) &&
        // Not meeting severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma');
      
      // Functional limitations but not severe
      const moderateFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          (s.toLowerCase().includes('moderate') || s.toLowerCase().includes('worse'))) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('walking'))
      );
      
      // Direct mention of moderate exacerbation
      const moderateExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('moderate')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('exacerbation') && 
        !s.toLowerCase().includes('severe') && 
        !s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const moderateFlag = input.flags?.includes('moderate_asthma') || input.flags?.includes('moderate_copd');
      
      return (moderateFeatures || moderateFunctional || moderateExacerbation || moderateFlag) && 
        // Exclude those meeting severe criteria
        !input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis')
        );
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Moderate asthma/COPD exacerbation: increased work of breathing but without severe features. Requires prompt bronchodilators, steroids, and monitoring.',
      confidence: 0.85
    }
  },
  {
    id: 'RESP-6',
    name: 'Community-Acquired Pneumonia (Concerning Vitals)',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumonia')) && (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 24);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Community-acquired pneumonia with tachypnea. Requires prompt antibiotics and monitoring.',
      confidence: 0.83
    }
  },
  {
    id: 'RESP-7',
    name: 'Spontaneous Pneumothorax (Stable)',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumothorax')) && !(input.flags?.includes('tension_pneumothorax'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Spontaneous pneumothorax (stable): requires monitoring and possible intervention.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-8',
    name: 'Hemoptysis with Risk Factors',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('hemoptysis')) && (input.medicalHistory || []).some(h => h.toLowerCase().includes('cancer') || h.toLowerCase().includes('tb'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Hemoptysis with risk factors (cancer, TB). Requires urgent evaluation for underlying cause.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-9',
    name: 'Mild Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 4,
    match: (input) => {
      // Mild features per GINA/GOLD guidelines
      const mildFeatures = 
        ((input.vitals?.oxygenSaturation === undefined || input.vitals.oxygenSaturation >= 94) &&
        (input.vitals?.respiratoryRate === undefined || input.vitals.respiratoryRate <= 20) &&
        (input.vitals?.heartRate === undefined || input.vitals.heartRate <= 100)) &&
        // Not meeting moderate or severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma') &&
        !input.flags?.includes('moderate_asthma');
      
      // Minimal functional limitations
      const mildFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('mild')) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('>80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('>80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('exertion'))
      );
      
      // Direct mention of mild exacerbation
      const mildExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('mild')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('exacerbation') && 
          s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const mildFlag = input.flags?.includes('mild_asthma') || input.flags?.includes('mild_copd');
      
      // Normal activities and sleep not affected significantly
      const minimalImpact = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('minimal impact')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('well controlled'))
      );
      
      return (mildFeatures || mildFunctional || mildExacerbation || mildFlag || minimalImpact) && 
        // Exclude those meeting moderate or severe criteria
        !input.symptoms.some(s => 
          s.toLowerCase().includes('moderate') || 
          s.toLowerCase().includes('severe') ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Mild asthma/COPD exacerbation with minimal impact on function and normal vital signs. Can be managed with bronchodilators and short-term steroids in outpatient setting.',
      confidence: 0.7
    }
  },
  {
    id: 'RESP-10',
    name: 'Upper Respiratory Infection (Normal Vitals)',
    category: 'Respiratory',
    weight: 3,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('uri') || s.toLowerCase().includes('upper respiratory infection')) && (!input.vitals || (input.vitals.respiratoryRate === undefined || input.vitals.respiratoryRate <= 20));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 4,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Upper respiratory infection with normal vitals: routine care.',
      confidence: 0.6
    }
  },
  {
    id: 'RESP-11',
    name: 'Chronic Cough (Stable)',
    category: 'Respiratory',
    weight: 2,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('chronic cough')) && (!input.vitals || (input.vitals.oxygenSaturation === undefined || input.vitals.oxygenSaturation >= 94));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 5,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Chronic cough with stable vitals: non-urgent evaluation.',
      confidence: 0.5
    }
  },
  // --- Neurological Rules ---
  {
    id: 'NEURO-1',
    name: 'Acute Stroke (FAST Positive)',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Enhanced stroke detection using expanded FAST-ED criteria
      const strokeSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('facial droop') || 
        s.toLowerCase().includes('face droop') || 
        s.toLowerCase().includes('arm weakness') || 
        s.toLowerCase().includes('leg weakness') || 
        (s.toLowerCase().includes('speech') && (
          s.toLowerCase().includes('slurred') || 
          s.toLowerCase().includes('difficulty') || 
          s.toLowerCase().includes('aphasia')
        )) ||
        s.toLowerCase().includes('stroke') ||
        s.toLowerCase().includes('hemiparesis') ||
        s.toLowerCase().includes('hemineglect') ||
        s.toLowerCase().includes('visual field')
      );
      
      // Time is brain - time factors are crucial
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_4.5h') || 
        input.flags?.includes('onset_under_24h') || 
        input.symptoms.some(s => s.toLowerCase().includes('last known well') && s.toLowerCase().includes('hour'));
      
      const strokeFlag = input.flags?.includes('stroke') || input.flags?.includes('cva');
      
      // Either explicit stroke symptoms or stroke flag, with time sensitivity
      return (strokeSigns || strokeFlag) && (timeFlag || !input.flags?.includes('onset_over_24h'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Acute stroke suspected: FAST positive (face, arm, speech, time). Immediate stroke protocol activation and time-sensitive imaging required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-1b',
    name: 'Suspected Large Vessel Occlusion Stroke',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Signs of severe neurological deficit suggesting LVO
      const lvoSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('gaze deviation') || 
        (s.toLowerCase().includes('severe') && s.toLowerCase().includes('deficit')) ||
        (s.toLowerCase().includes('multiple') && s.toLowerCase().includes('deficit')) ||
        s.toLowerCase().includes('aphasia') ||
        s.toLowerCase().includes('neglect')
      );
      
      // High NIHSS or specific flag
      const severityFlag = 
        input.flags?.includes('lvo') || 
        input.flags?.includes('high_nihss') || 
        input.flags?.includes('severe_stroke');
      
      // Time window for endovascular intervention is longer
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_24h');
      
      return (lvoSigns || severityFlag) && timeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' },
        { name: 'Interventional Radiology', type: 'tertiary' }
      ],
      explain: 'Suspected large vessel occlusion stroke: severe deficits within intervention window. Immediate CTA and thrombectomy evaluation required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-2',
    name: 'Status Epilepticus',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('status_epilepticus') || 
        input.flags?.includes('ongoing_seizure') || 
        input.symptoms.some(s => s.toLowerCase().includes('seizure') && (s.toLowerCase().includes('continuous') || s.toLowerCase().includes('multiple')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Status epilepticus: ongoing seizure or multiple seizures without recovery. Immediate anticonvulsant therapy required.',
      confidence: 0.98
    }
  },
  {
    id: 'NEURO-3',
    name: 'Altered Mental Status (GCS < 9)',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      return (input.vitals?.gcs !== undefined && input.vitals.gcs < 9) || 
        input.flags?.includes('unresponsive') || 
        input.symptoms.some(s => s.toLowerCase().includes('unconscious'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Severe altered mental status: GCS < 9 or unresponsive. Immediate airway management and neurological evaluation required.',
      confidence: 0.96
    }
  },
  {
    id: 'NEURO-4',
    name: 'Thunderclap Headache',
    category: 'Neurological',
    weight: 9,
    match: (input) => {
      // Enhanced criteria for thunderclap headache
      const thunderclapFeatures = input.symptoms.some(s => 
        (s.toLowerCase().includes('headache') && (
          s.toLowerCase().includes('worst') || 
          s.toLowerCase().includes('thunderclap') || 
          s.toLowerCase().includes('sudden') ||
          s.toLowerCase().includes('severe') ||
          s.toLowerCase().includes('explosive')
        )) ||
        s.toLowerCase().includes('subarachnoid')
      );
      
      // Associated signs that increase concern
      const concerningSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('neck stiffness') || 
        s.toLowerCase().includes('photophobia') ||
        s.toLowerCase().includes('vomiting') ||
        s.toLowerCase().includes('altered') ||
        s.toLowerCase().includes('neurological')
      ) || input.flags?.includes('meningeal_signs');
      
      return thunderclapFeatures || 
        input.flags?.includes('thunderclap_headache') || 
        (input.symptoms.some(s => s.toLowerCase().includes('headache')) && concerningSigns);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Thunderclap headache: sudden, severe, worst-ever or with concerning features. Immediate evaluation for subarachnoid hemorrhage required.',
      confidence: 0.93
    }
  },
  {
    id: 'NEURO-5',
    name: 'Acute Spinal Cord Compression',
    category: 'Neurological',
    weight: 9,
    match: (input) => {
      return input.flags?.includes('cord_compression') || 
        input.symptoms.some(s => 
          (s.toLowerCase().includes('paralysis') || s.toLowerCase().includes('weakness')) && 
          (s.toLowerCase().includes('legs') || s.toLowerCase().includes('arms'))
        ) && input.symptoms.some(s => s.toLowerCase().includes('bladder') || s.toLowerCase().includes('bowel'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' }
      ],
      explain: 'Acute spinal cord compression: limb weakness with bowel/bladder dysfunction. Immediate imaging and neurosurgical consultation required.',
      confidence: 0.92
    }
  },
  {
    id: 'NEURO-5b',
    name: 'Intracranial Hemorrhage',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Direct mention or signs
      const bleedSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('intracranial hemorrhage') || 
        s.toLowerCase().includes('ich') || 
        s.toLowerCase().includes('cerebral hemorrhage') ||
        s.toLowerCase().includes('brain bleed') ||
        s.toLowerCase().includes('hemorrhagic stroke')
      );
      
      // With neurological deficit
      const deficits = input.symptoms.some(s => 
        s.toLowerCase().includes('weakness') || 
        s.toLowerCase().includes('numbness') ||
        s.toLowerCase().includes('speech') ||
        s.toLowerCase().includes('vision') ||
        s.toLowerCase().includes('level of consciousness')
      );
      
      // Flag for any intracranial bleed
      const bleedFlag = 
        input.flags?.includes('intracranial_hemorrhage') || 
        input.flags?.includes('brain_bleed') || 
        input.flags?.includes('hemorrhagic_stroke');
      
      return bleedSigns || bleedFlag || (input.symptoms.some(s => s.toLowerCase().includes('severe headache')) && deficits);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' },
        { name: 'Neurology', type: 'tertiary' }
      ],
      explain: 'Suspected intracranial hemorrhage. Immediate head CT and neurosurgical evaluation required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-6',
    name: 'First-Time Seizure',
    category: 'Neurological',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('seizure') && s.toLowerCase().includes('first')) && 
        !input.medicalHistory?.some(h => h.toLowerCase().includes('epilepsy') || h.toLowerCase().includes('seizure'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'First-time seizure (now resolved): requires prompt evaluation for underlying cause.',
      confidence: 0.89
    }
  },
  {
    id: 'NEURO-7',
    name: 'Transient Ischemic Attack',
    category: 'Neurological',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('tia') || 
        (s.toLowerCase().includes('stroke') && s.toLowerCase().includes('resolved')));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Transient Ischemic Attack: resolved focal neurological symptoms. Requires prompt evaluation to prevent stroke.',
      confidence: 0.85
    }
  },
  {
    id: 'NEURO-8',
    name: 'Migraine with Neurological Deficits',
    category: 'Neurological',
    weight: 6,
    match: (input) => {
      // Enhanced detection of migraine with aura
      const migraine = input.symptoms.some(s => s.toLowerCase().includes('migraine'));
      
      const auraSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('aura') || 
        s.toLowerCase().includes('visual') || 
        s.toLowerCase().includes('scintillating') || 
        s.toLowerCase().includes('scotoma') || 
        s.toLowerCase().includes('numbness') || 
        s.toLowerCase().includes('tingling') ||
        s.toLowerCase().includes('paresthesia')
      );
      
      // History of similar episodes reduces concern
      const knownHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('migraine with aura') || 
        h.toLowerCase().includes('complex migraine')
      );
      
      // First time is more concerning than recurrent with same pattern
      const firstTimeFlag = input.flags?.includes('first_time') || input.symptoms.some(s => s.toLowerCase().includes('first') && s.toLowerCase().includes('time'));
      
      // Concerning if first time or different from usual pattern
      return migraine && auraSymptoms && (firstTimeFlag || input.symptoms.some(s => s.toLowerCase().includes('different')) || !knownHistory);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Migraine with neurological deficits (atypical or first-time): requires evaluation to rule out more serious conditions.',
      confidence: 0.8
    }
  },
  {
    id: 'NEURO-9',
    name: 'Vertigo with Neurological Symptoms',
    category: 'Neurological',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('vertigo')) && 
        (input.symptoms.some(s => 
          s.toLowerCase().includes('double vision') || 
          s.toLowerCase().includes('diplopia') || 
          s.toLowerCase().includes('dysarthria') || 
          s.toLowerCase().includes('ataxia') || 
          s.toLowerCase().includes('weakness')
        ) || 
        input.flags?.includes('central_vertigo'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Vertigo with neurological symptoms: concerning for central cause. Requires neurological evaluation.',
      confidence: 0.82
    }
  },
  {
    id: 'NEURO-10',
    name: 'Uncomplicated Syncope in Young, Healthy Patient',
    category: 'Neurological',
    weight: 4,
    match: (input) => {
      const age = input.age || 0;
      return input.symptoms.some(s => s.toLowerCase().includes('syncope') || s.toLowerCase().includes('fainting')) && 
        age < 40 && 
        !(input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('heart') || 
          h.toLowerCase().includes('cardiac') || 
          h.toLowerCase().includes('epilepsy')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Uncomplicated syncope in young, healthy patient: likely vasovagal. Requires standard evaluation.',
      confidence: 0.75
    }
  },
  {
    id: 'NEURO-11',
    name: 'Chronic Stable Headache',
    category: 'Neurological',
    weight: 3,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('headache') && (s.toLowerCase().includes('chronic') || s.toLowerCase().includes('recurring'))) && 
        !input.symptoms.some(s => 
          s.toLowerCase().includes('worst') || 
          s.toLowerCase().includes('new') || 
          s.toLowerCase().includes('neurological') || 
          s.toLowerCase().includes('fever')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 4,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Chronic stable headache pattern: routine evaluation for management.',
      confidence: 0.7
    }
  },
  {
    id: 'NEURO-12',
    name: 'Mild Concussion',
    category: 'Neurological',
    weight: 4,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('concussion') || (s.toLowerCase().includes('head') && s.toLowerCase().includes('injury'))) && 
        (input.vitals?.gcs === undefined || input.vitals.gcs >= 15) && 
        !input.symptoms.some(s => s.toLowerCase().includes('loss of consciousness') || s.toLowerCase().includes('vomiting'));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' }
      ],
      explain: 'Mild concussion with normal GCS, no loss of consciousness: requires standard evaluation and concussion precautions.',
      confidence: 0.8
    }
  },
  {
    id: 'NEURO-13',
    name: 'Suspected Bacterial Meningitis',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Classic triad: fever, neck stiffness, altered mental status
      const fever = input.symptoms.some(s => s.toLowerCase().includes('fever')) || 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0);
      
      const meningealSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('neck stiffness') || 
        s.toLowerCase().includes('nuchal rigidity') ||
        s.toLowerCase().includes('meningismus') ||
        s.toLowerCase().includes('kernig') ||
        s.toLowerCase().includes('brudzinski')
      ) || input.flags?.includes('meningeal_signs');
      
      const alteredMental = input.symptoms.some(s => 
        s.toLowerCase().includes('altered mental') || 
        s.toLowerCase().includes('confusion') ||
        s.toLowerCase().includes('lethargy')
      ) || (input.vitals?.gcs !== undefined && input.vitals.gcs < 15);
      
      // Direct mention
      const meningitisFlag = 
        input.flags?.includes('meningitis') || 
        input.symptoms.some(s => s.toLowerCase().includes('meningitis'));
      
      // Additional concerning signs
      const concerningSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('photophobia') || 
        s.toLowerCase().includes('purpuric') ||
        s.toLowerCase().includes('rash') ||
        s.toLowerCase().includes('petechiae')
      );
      
      return meningitisFlag || 
        (fever && meningealSigns) || 
        (fever && alteredMental && (meningealSigns || concerningSigns));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' },
        { name: 'Neurology', type: 'tertiary' }
      ],
      explain: 'Suspected bacterial meningitis: fever with meningeal signs or altered mental status. Immediate antibiotics and LP required after imaging if indicated.',
      confidence: 0.92
    }
  },
  // Adding LVO stroke rule
  {
    id: 'NEURO-14',
    name: 'Suspected Large Vessel Occlusion Stroke',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Signs of severe neurological deficit suggesting LVO
      const lvoSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('gaze deviation') || 
        (s.toLowerCase().includes('severe') && s.toLowerCase().includes('deficit')) ||
        (s.toLowerCase().includes('multiple') && s.toLowerCase().includes('deficit')) ||
        s.toLowerCase().includes('aphasia') ||
        s.toLowerCase().includes('neglect')
      );
      
      // High NIHSS or specific flag
      const severityFlag = 
        input.flags?.includes('lvo') || 
        input.flags?.includes('high_nihss') || 
        input.flags?.includes('severe_stroke');
      
      // Time window for endovascular intervention is longer
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_24h');
      
      return (lvoSigns || severityFlag) && timeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' },
        { name: 'Interventional Radiology', type: 'tertiary' }
      ],
      explain: 'Suspected large vessel occlusion stroke: severe deficits within intervention window. Immediate CTA and thrombectomy evaluation required.',
      confidence: 0.95
    }
  },
  // Adding Refractory Status Epilepticus rule
  {
    id: 'NEURO-15',
    name: 'Refractory Status Epilepticus',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Ongoing seizure activity despite initial treatment
      const refractoryStatus = input.symptoms.some(s => 
        (s.toLowerCase().includes('status epilepticus') && s.toLowerCase().includes('refractory')) ||
        (s.toLowerCase().includes('seizure') && s.toLowerCase().includes('not responding')) ||
        (s.toLowerCase().includes('seizure') && s.toLowerCase().includes('continuing')) ||
        (s.toLowerCase().includes('seizure') && s.toLowerCase().includes('multiple medications'))
      );
      
      // Specific flags for refractory status
      const refractoryFlag = 
        input.flags?.includes('refractory_status') || 
        input.flags?.includes('persistent_seizure') ||
        input.flags?.includes('multiple_benzo');
      
      return refractoryStatus || refractoryFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Refractory status epilepticus: ongoing seizure activity despite initial treatment. Requires immediate RSI, continuous EEG monitoring, and ICU admission.',
      confidence: 0.98
    }
  },
  // Adding Severe TBI with Herniation Signs rule
  {
    id: 'NEURO-16',
    name: 'Severe TBI with Herniation Signs',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // History of trauma and decreased consciousness
      const tbiHistory = input.symptoms.some(s => 
        (s.toLowerCase().includes('head') && s.toLowerCase().includes('trauma')) ||
        (s.toLowerCase().includes('tbi')) ||
        (s.toLowerCase().includes('head injury'))
      );
      
      // Decreased GCS
      const decreasedGCS = 
        (input.vitals?.gcs !== undefined && input.vitals.gcs < 9) || 
        input.symptoms.some(s => s.toLowerCase().includes('unresponsive'));
      
      // Classic herniation signs
      const herniationSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('pupil') && (
          s.toLowerCase().includes('fixed') || 
          s.toLowerCase().includes('dilated') || 
          s.toLowerCase().includes('asymmetric')
        ) ||
        s.toLowerCase().includes('decorticate') ||
        s.toLowerCase().includes('decerebrate') ||
        s.toLowerCase().includes('cushing') ||
        s.toLowerCase().includes('herniation') ||
        s.toLowerCase().includes('midline shift')
      );
      
      // Specific flags for critical TBI
      const criticalTbiFlag = 
        input.flags?.includes('herniation') || 
        input.flags?.includes('midline_shift') ||
        input.flags?.includes('severe_tbi') ||
        input.flags?.includes('fixed_pupil');
      
      return (tbiHistory && (decreasedGCS || herniationSigns)) || criticalTbiFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Severe traumatic brain injury with potential herniation signs. Immediate neurosurgical evaluation, airway management, and osmotic therapy required.',
      confidence: 0.99
    }
  },
  // Adding Epiglottitis rule
  {
    id: 'RESP-12',
    name: 'Acute Epiglottitis/Supraglottic Airway Obstruction',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      // Classic "tripod position" and other concerning signs
      const concerningSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('epiglottitis') || 
        s.toLowerCase().includes('tripod position') ||
        s.toLowerCase().includes('drooling') ||
        s.toLowerCase().includes('muffled voice') ||
        s.toLowerCase().includes('hot potato voice') ||
        s.toLowerCase().includes('unable to swallow') ||
        (s.toLowerCase().includes('throat') && s.toLowerCase().includes('severe'))
      );
      
      // Respiratory distress signs
      const respiratoryDistress = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('stridor') || 
          s.toLowerCase().includes('difficulty breathing')
        ) || 
        input.flags?.includes('stridor') || 
        input.flags?.includes('respiratory_distress');
      
      // Direct flags
      const epiglottitisFlag = 
        input.flags?.includes('epiglottitis') || 
        input.flags?.includes('supraglottic_obstruction');
      
      return epiglottitisFlag || (concerningSigns && respiratoryDistress);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Anesthesiology', type: 'secondary' },
        { name: 'ENT', type: 'tertiary' }
      ],
      explain: 'Suspected epiglottitis/supraglottic airway obstruction. Do NOT examine throat. Immediate airway specialist consultation and controlled airway management required.',
      confidence: 0.95
    }
  },
  // Adding Carbon Monoxide Poisoning rule
  {
    id: 'RESP-13',
    name: 'Carbon Monoxide Poisoning',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      // Direct mention
      const directMention = input.symptoms.some(s => 
        s.toLowerCase().includes('carbon monoxide') || 
        s.toLowerCase().includes('co poisoning')
      );
      
      // Exposure history
      const exposureHistory = input.symptoms.some(s => 
        (s.toLowerCase().includes('exposure') && s.toLowerCase().includes('smoke')) || 
        (s.toLowerCase().includes('fire') && s.toLowerCase().includes('enclosed')) ||
        s.toLowerCase().includes('heater') ||
        s.toLowerCase().includes('generator') ||
        s.toLowerCase().includes('exhaust')
      );
      
      // Classic symptoms
      const classicSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('headache') ||
        s.toLowerCase().includes('dizziness') ||
        s.toLowerCase().includes('confusion') ||
        s.toLowerCase().includes('nausea') ||
        s.toLowerCase().includes('cherry red')
      );
      
      // Multiple victims with similar symptoms is highly suspicious
      const multipleVictims = input.flags?.includes('multiple_victims');
      
      // Elevated COHb level if available
      const elevatedCOHb = input.flags?.includes('elevated_cohb');
      
      // Severe presentations
      const severeSymptoms = 
        (input.vitals?.gcs !== undefined && input.vitals.gcs < 15) || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('unconscious') || 
          s.toLowerCase().includes('seizure')
        );
      
      return directMention || elevatedCOHb || 
        ((exposureHistory || multipleVictims) && classicSymptoms) ||
        (exposureHistory && severeSymptoms);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Suspected carbon monoxide poisoning. Requires immediate 100% oxygen, consideration for hyperbaric oxygen therapy, and screening of cohabitants.',
      confidence: 0.9
    }
  },
  // Adding Foreign Body Airway Obstruction rule
  {
    id: 'RESP-14',
    name: 'Foreign Body Airway Obstruction',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      // Direct mention
      const directMention = input.symptoms.some(s => 
        s.toLowerCase().includes('choking') || 
        (s.toLowerCase().includes('foreign body') && s.toLowerCase().includes('airway')) ||
        (s.toLowerCase().includes('object') && s.toLowerCase().includes('airway'))
      );
      
      // Complete vs partial obstruction
      const completeObstruction = input.symptoms.some(s => 
        (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
        (s.toLowerCase().includes('unable') && s.toLowerCase().includes('breathe')) ||
        s.toLowerCase().includes('silent') ||
        s.toLowerCase().includes('no air movement')
      );
      
      const partialObstruction = input.symptoms.some(s => 
        s.toLowerCase().includes('stridor') ||
        s.toLowerCase().includes('wheezing') ||
        (s.toLowerCase().includes('difficulty') && s.toLowerCase().includes('breathing'))
      );
      
      // Universal choking sign
      const chokingSign = input.symptoms.some(s => 
        s.toLowerCase().includes('clutching throat') ||
        s.toLowerCase().includes('universal choking sign')
      );
      
      // Flag for airway obstruction
      const obstructionFlag = 
        input.flags?.includes('airway_obstruction') || 
        input.flags?.includes('choking') || 
        input.flags?.includes('foreign_body');
      
      return obstructionFlag || directMention || chokingSign || completeObstruction || 
        (partialObstruction && input.symptoms.some(s => s.toLowerCase().includes('foreign')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'ENT', type: 'secondary' }
      ],
      explain: 'Foreign body airway obstruction. Complete obstruction requires immediate Heimlich maneuver/back blows; partial obstruction requires urgent evaluation.',
      confidence: 0.98
    }
  },
  // Adding Massive Hemoptysis rule
  {
    id: 'RESP-15',
    name: 'Massive Hemoptysis',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      // Direct mention of massive/severe bleeding
      const massiveHemoptysis = input.symptoms.some(s => 
        (s.toLowerCase().includes('hemoptysis') && (
          s.toLowerCase().includes('massive') || 
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('copious') ||
          s.toLowerCase().includes('large amount')
        )) ||
        (s.toLowerCase().includes('coughing') && s.toLowerCase().includes('blood') && (
          s.toLowerCase().includes('massive') || 
          s.toLowerCase().includes('severe') ||
          s.toLowerCase().includes('large amount')
        ))
      );
      
      // Quantified amount (>100mL in 24h is traditionally considered massive)
      const quantifiedAmount = input.symptoms.some(s => 
        (s.toLowerCase().includes('hemoptysis') || (s.toLowerCase().includes('coughing') && s.toLowerCase().includes('blood'))) && 
        (s.toLowerCase().includes('100') || s.toLowerCase().includes('cup') || s.toLowerCase().includes('>50'))
      );
      
      // Hemodynamic compromise or respiratory distress with hemoptysis
      const hemoptysisWithDistress = 
        input.symptoms.some(s => s.toLowerCase().includes('hemoptysis') || (s.toLowerCase().includes('coughing') && s.toLowerCase().includes('blood'))) && 
        ((input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 100) || 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 110) ||
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 92) ||
        input.symptoms.some(s => s.toLowerCase().includes('respiratory distress') || s.toLowerCase().includes('shortness of breath')));
      
      // Flag for massive hemoptysis
      const massiveFlag = input.flags?.includes('massive_hemoptysis');
      
      return massiveFlag || massiveHemoptysis || quantifiedAmount || hemoptysisWithDistress;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' },
        { name: 'Interventional Radiology', type: 'tertiary' }
      ],
      explain: 'Massive hemoptysis: life-threatening respiratory emergency. Requires immediate airway protection, bleeding site localization, and consideration for bronchial artery embolization.',
      confidence: 0.95
    }
  },
  // --- Infectious Diseases/Sepsis Rules ---
  {
    id: 'INFX-1',
    name: 'Septic Shock',
    category: 'Infectious',
    weight: 10,
    match: (input) => {
      // Evidence of infection
      const infectionSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('infection') ||
        s.toLowerCase().includes('sepsis') ||
        s.toLowerCase().includes('septic') ||
        s.toLowerCase().includes('fever') ||
        s.toLowerCase().includes('pneumonia') ||
        s.toLowerCase().includes('urinary tract infection') ||
        s.toLowerCase().includes('meningitis') ||
        s.toLowerCase().includes('cellulitis') ||
        s.toLowerCase().includes('abscess')
      ) || input.flags?.includes('infection');
      
      // Hypotension despite fluid resuscitation or requiring vasopressors
      const shockState = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        input.flags?.includes('hypotension') ||
        input.flags?.includes('vasopressors') ||
        input.flags?.includes('refractory_hypotension') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('hypotension') || 
          s.toLowerCase().includes('shock') ||
          s.toLowerCase().includes('vasopressor')
        );
      
      // Lactate > 2 mmol/L indicates tissue hypoperfusion
      const elevatedLactate = 
        input.flags?.includes('elevated_lactate') || 
        input.flags?.includes('lactate_over_2') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('lactate') && s.toLowerCase().includes('elevated')) ||
          (s.toLowerCase().includes('lactate') && s.toLowerCase().includes('>2'))
        );
      
      // Organ dysfunction 
      const organDysfunction = 
        input.flags?.includes('organ_dysfunction') || 
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental status') ||
          s.toLowerCase().includes('oliguria') ||
          s.toLowerCase().includes('acute kidney injury') ||
          s.toLowerCase().includes('elevated creatinine') ||
          s.toLowerCase().includes('coagulopathy') ||
          s.toLowerCase().includes('thrombocytopenia') ||
          s.toLowerCase().includes('hypoxemia') ||
          s.toLowerCase().includes('ileus')
        );
      
      // Direct mention of septic shock
      const septicShockMention = 
        input.flags?.includes('septic_shock') ||
        input.symptoms.some(s => s.toLowerCase().includes('septic shock'));
      
      return septicShockMention || (infectionSigns && shockState && (elevatedLactate || organDysfunction));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Septic shock: life-threatening condition requiring immediate fluid resuscitation, early antibiotics, vasopressors, and source control. Activate sepsis protocol immediately.',
      confidence: 0.95
    }
  },
  {
    id: 'INFX-2',
    name: 'Severe Sepsis',
    category: 'Infectious',
    weight: 9,
    match: (input) => {
      // Evidence of infection
      const infectionSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('infection') ||
        s.toLowerCase().includes('sepsis') ||
        s.toLowerCase().includes('fever') ||
        s.toLowerCase().includes('pneumonia') ||
        s.toLowerCase().includes('urinary tract infection') ||
        s.toLowerCase().includes('meningitis') ||
        s.toLowerCase().includes('cellulitis') ||
        s.toLowerCase().includes('abscess')
      ) || input.flags?.includes('infection');
      
      // SIRS criteria: 2+ of the following
      const highTemp = (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      const lowTemp = (input.vitals?.temperature !== undefined && input.vitals.temperature < 36.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('hypothermia'));
      
      const tachycardia = (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 90) || 
        input.symptoms.some(s => s.toLowerCase().includes('tachycardia'));
      
      const tachypnea = (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 20) || 
        input.symptoms.some(s => s.toLowerCase().includes('rapid breathing') || s.toLowerCase().includes('tachypnea'));
      
      const abnormalWBC = input.flags?.includes('abnormal_wbc') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('elevated wbc') || 
          s.toLowerCase().includes('leukocytosis') ||
          s.toLowerCase().includes('leukopenia') ||
          s.toLowerCase().includes('left shift')
        );
      
      // Count SIRS criteria
      const sirsCount = [highTemp || lowTemp, tachycardia, tachypnea, abnormalWBC].filter(Boolean).length;
      
      // Organ dysfunction signs
      const organDysfunction = 
        input.flags?.includes('organ_dysfunction') || 
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental status') ||
          s.toLowerCase().includes('oliguria') ||
          s.toLowerCase().includes('acute kidney injury') ||
          s.toLowerCase().includes('elevated creatinine') ||
          s.toLowerCase().includes('coagulopathy') ||
          s.toLowerCase().includes('thrombocytopenia') ||
          s.toLowerCase().includes('hypoxemia') ||
          s.toLowerCase().includes('ileus')
        );
      
      // Direct mention of severe sepsis
      const severeSepsisMention = 
        input.flags?.includes('severe_sepsis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe sepsis') || 
          (s.toLowerCase().includes('sepsis') && s.toLowerCase().includes('organ dysfunction'))
        );
      
      // qSOFA criteria (2+ indicates high risk)
      const alteredMental = 
        (input.vitals?.gcs !== undefined && input.vitals.gcs < 15) ||
        input.symptoms.some(s => s.toLowerCase().includes('altered mental') || s.toLowerCase().includes('confusion'));
      
      const hypotension = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 100) ||
        input.symptoms.some(s => s.toLowerCase().includes('hypotension'));
      
      const qsofaCount = [alteredMental, hypotension, tachypnea].filter(Boolean).length;
      
      return severeSepsisMention || 
        // Either traditional severe sepsis definition
        (infectionSigns && sirsCount >= 2 && organDysfunction) ||
        // Or qSOFA approach
        (infectionSigns && qsofaCount >= 2);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Severe sepsis: infection with organ dysfunction. Requires immediate fluid resuscitation, antibiotics within 1 hour, and serial lactate monitoring.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-3',
    name: 'Sepsis (Without Shock or Organ Dysfunction)',
    category: 'Infectious',
    weight: 7,
    match: (input) => {
      // Evidence of infection
      const infectionSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('infection') ||
        s.toLowerCase().includes('sepsis') ||
        s.toLowerCase().includes('fever') ||
        s.toLowerCase().includes('pneumonia') ||
        s.toLowerCase().includes('urinary tract infection') ||
        s.toLowerCase().includes('meningitis') ||
        s.toLowerCase().includes('cellulitis') ||
        s.toLowerCase().includes('abscess')
      ) || input.flags?.includes('infection');
      
      // SIRS criteria: 2+ of the following
      const highTemp = (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      const lowTemp = (input.vitals?.temperature !== undefined && input.vitals.temperature < 36.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('hypothermia'));
      
      const tachycardia = (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 90) || 
        input.symptoms.some(s => s.toLowerCase().includes('tachycardia'));
      
      const tachypnea = (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 20) || 
        input.symptoms.some(s => s.toLowerCase().includes('rapid breathing') || s.toLowerCase().includes('tachypnea'));
      
      const abnormalWBC = input.flags?.includes('abnormal_wbc') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('elevated wbc') || 
          s.toLowerCase().includes('leukocytosis') ||
          s.toLowerCase().includes('leukopenia') ||
          s.toLowerCase().includes('left shift')
        );
      
      // Count SIRS criteria
      const sirsCount = [highTemp || lowTemp, tachycardia, tachypnea, abnormalWBC].filter(Boolean).length;
      
      // Organ dysfunction signs (used to exclude severe sepsis)
      const organDysfunction = 
        input.flags?.includes('organ_dysfunction') || 
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental status') ||
          s.toLowerCase().includes('oliguria') ||
          s.toLowerCase().includes('acute kidney injury') ||
          s.toLowerCase().includes('elevated creatinine') ||
          s.toLowerCase().includes('coagulopathy') ||
          s.toLowerCase().includes('thrombocytopenia') ||
          s.toLowerCase().includes('hypoxemia') ||
          s.toLowerCase().includes('ileus')
        );
      
      // Shock signs (used to exclude septic shock)
      const shockSigns = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        input.flags?.includes('hypotension') ||
        input.flags?.includes('shock') ||
        input.flags?.includes('vasopressors') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('shock') || 
          s.toLowerCase().includes('hypotension')
        );
      
      // Direct mention of sepsis
      const sepsisMention = 
        input.flags?.includes('sepsis') ||
        input.symptoms.some(s => s.toLowerCase().includes('sepsis'));
      
      return (sepsisMention || (infectionSigns && sirsCount >= 2)) && 
        !organDysfunction && !shockSigns &&
        // Also exclude both severe sepsis and septic shock explicit mentions
        !input.flags?.includes('severe_sepsis') &&
        !input.flags?.includes('septic_shock') &&
        !input.symptoms.some(s => 
          s.toLowerCase().includes('severe sepsis') || 
          s.toLowerCase().includes('septic shock')
        );
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' }
      ],
      explain: 'Sepsis without shock or organ dysfunction. Requires prompt evaluation, fluid resuscitation, blood cultures, and antibiotics within 3 hours.',
      confidence: 0.85
    }
  },
  {
    id: 'INFX-4',
    name: 'Neutropenic Fever',
    category: 'Infectious',
    weight: 8,
    match: (input) => {
      // Fever
      const fever = (input.vitals?.temperature !== undefined && input.vitals.temperature >= 38.3) || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') || 
          s.toLowerCase().includes('febrile')
        );
      
      // Neutropenia history or flag
      const neutropenia = 
        input.flags?.includes('neutropenia') ||
        input.flags?.includes('immunocompromised') ||
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('neutropenia') ||
          h.toLowerCase().includes('chemotherapy') ||
          h.toLowerCase().includes('transplant') ||
          h.toLowerCase().includes('leukemia') ||
          h.toLowerCase().includes('lymphoma')
        ) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('neutropenia') ||
          s.toLowerCase().includes('low anc') ||
          s.toLowerCase().includes('low neutrophil') ||
          (s.toLowerCase().includes('chemo') && s.toLowerCase().includes('receive'))
        );
      
      // Direct mention of neutropenic fever
      const neutropenicFeverMention = 
        input.flags?.includes('neutropenic_fever') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('neutropenic fever') || 
          (s.toLowerCase().includes('febrile') && s.toLowerCase().includes('neutropenia'))
        );
      
      return neutropenicFeverMention || (fever && neutropenia);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Oncology', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Neutropenic fever: medical emergency in immunocompromised patients. Requires immediate blood cultures and broad-spectrum antibiotics within 1 hour of presentation.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-5',
    name: 'Severe COVID-19',
    category: 'Infectious',
    weight: 8,
    match: (input) => {
      // COVID-19 diagnosis or symptoms
      const covidConfirmed = 
        input.flags?.includes('covid_positive') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('covid positive') ||
          s.toLowerCase().includes('confirmed covid')
        );
      
      const covidSuspected = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('covid') ||
          (s.toLowerCase().includes('fever') && 
            (s.toLowerCase().includes('cough') || 
             s.toLowerCase().includes('shortness of breath') || 
             s.toLowerCase().includes('loss of taste') || 
             s.toLowerCase().includes('loss of smell')))
        );
      
      // Severe respiratory symptoms
      const severeRespiratory = 
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 30) ||
        input.flags?.includes('respiratory_distress') ||
        input.flags?.includes('oxygen_requirement') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe shortness of breath') ||
          s.toLowerCase().includes('respiratory distress') ||
          s.toLowerCase().includes('oxygen requirement') ||
          s.toLowerCase().includes('difficulty breathing')
        );
      
      // Lung infiltrates
      const lungInfiltrates =
        input.flags?.includes('lung_infiltrates') ||
        input.flags?.includes('pneumonia') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('bilateral infiltrates') ||
          s.toLowerCase().includes('pneumonia') ||
          s.toLowerCase().includes('ground glass')
        );
      
      // Critical COVID markers
      const criticalMarkers =
        input.flags?.includes('cytokine_storm') ||
        input.flags?.includes('elevated_crp') ||
        input.flags?.includes('elevated_d_dimer') ||
        input.flags?.includes('elevated_ferritin') ||
        input.flags?.includes('elevated_ldh') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('cytokine storm') ||
          s.toLowerCase().includes('elevated inflammatory markers')
        );
      
      // Explicit mention of severe COVID
      const severeCovid =
        input.flags?.includes('severe_covid') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe covid') ||
          s.toLowerCase().includes('covid pneumonia')
        );
      
      return severeCovid || 
        ((covidConfirmed || covidSuspected) && 
          (severeRespiratory || lungInfiltrates || criticalMarkers));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Severe COVID-19 with respiratory compromise or critical inflammatory markers. Requires oxygen therapy, consideration of steroids, antivirals, and monitoring for deterioration.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-6',
    name: 'Bacterial Meningitis',
    category: 'Infectious',
    weight: 10,
    match: (input) => {
      // Classic meningitis symptoms
      const meningealSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('neck stiffness') || 
        s.toLowerCase().includes('nuchal rigidity') ||
        s.toLowerCase().includes('photophobia') ||
        s.toLowerCase().includes('meningeal')
      );
      
      // Fever
      const fever = (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      // Altered mental status
      const alteredMental = 
        (input.vitals?.gcs !== undefined && input.vitals.gcs < 15) ||
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental') ||
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('lethargy') ||
          s.toLowerCase().includes('coma') ||
          s.toLowerCase().includes('drowsy')
        );
      
      // Headache
      const headache = input.symptoms.some(s => s.toLowerCase().includes('headache'));
      
      // Specific meningitis flags
      const meningitisMention = 
        input.flags?.includes('meningitis') ||
        input.flags?.includes('csf_abnormal') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('meningitis') ||
          s.toLowerCase().includes('csf abnormal')
        );
      
      // Classic triad is fever, neck stiffness, and altered mental status
      const classicTriad = fever && meningealSigns && alteredMental;
      
      // Alternative presentation could be fever + headache + either meningeal signs or altered mental status
      const alternativePresentation = fever && headache && (meningealSigns || alteredMental);
      
      return meningitisMention || classicTriad || alternativePresentation;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' },
        { name: 'Neurology', type: 'tertiary' }
      ],
      explain: 'Suspected bacterial meningitis: medical emergency requiring immediate antibiotics after blood cultures (within 30 minutes). Consider adjunctive dexamethasone and neurology consult.',
      confidence: 0.95
    }
  },
  {
    id: 'INFX-7',
    name: 'Necrotizing Fasciitis',
    category: 'Infectious',
    weight: 9,
    match: (input) => {
      // Severe pain out of proportion to physical findings
      const severePain = input.symptoms.some(s => 
        (s.toLowerCase().includes('pain') && s.toLowerCase().includes('severe')) ||
        (s.toLowerCase().includes('pain') && s.toLowerCase().includes('extreme')) ||
        (s.toLowerCase().includes('pain') && s.toLowerCase().includes('out of proportion')) ||
        s.toLowerCase().includes('disproportionate pain')
      );
      
      // Skin findings
      const skinChanges = input.symptoms.some(s => 
        s.toLowerCase().includes('erythema') ||
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('bullae') ||
        s.toLowerCase().includes('skin discoloration') ||
        s.toLowerCase().includes('rash') ||
        s.toLowerCase().includes('cellulitis') ||
        s.toLowerCase().includes('skin necrosis') ||
        s.toLowerCase().includes('purple') ||
        s.toLowerCase().includes('bruising')
      );
      
      // Systemic toxicity
      const systemicToxicity = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.5) || 
        input.flags?.includes('toxic_appearance') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') || 
          s.toLowerCase().includes('toxic appearance') ||
          s.toLowerCase().includes('tachycardia') ||
          s.toLowerCase().includes('tachypnea') ||
          s.toLowerCase().includes('hypotension')
        );
      
      // Direct mention
      const necrotizingMention = 
        input.flags?.includes('necrotizing_fasciitis') ||
        input.flags?.includes('flesh_eating_bacteria') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('necrotizing fasciitis') ||
          s.toLowerCase().includes('flesh eating')
        );
      
      return necrotizingMention || (severePain && skinChanges && systemicToxicity);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'General Surgery', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Suspected necrotizing fasciitis: surgical emergency requiring immediate broad-spectrum antibiotics and urgent surgical debridement. Mortality increases with delayed treatment.',
      confidence: 0.95
    }
  },
  {
    id: 'INFX-8',
    name: 'Toxic Shock Syndrome',
    category: 'Infectious',
    weight: 9,
    match: (input) => {
      // High fever
      const highFever = (input.vitals?.temperature !== undefined && input.vitals.temperature >= 39.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('high fever'));
      
      // Hypotension
      const hypotension = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        input.flags?.includes('hypotension') ||
        input.symptoms.some(s => s.toLowerCase().includes('hypotension'));
      
      // Rash
      const rash = input.symptoms.some(s => 
        s.toLowerCase().includes('rash') ||
        s.toLowerCase().includes('erythroderma') ||
        s.toLowerCase().includes('desquamation') ||
        s.toLowerCase().includes('skin peeling')
      );
      
      // Multi-system involvement
      const multiSystemInvolvement = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('vomiting') ||
          s.toLowerCase().includes('diarrhea') ||
          s.toLowerCase().includes('myalgia') ||
          s.toLowerCase().includes('muscle pain') ||
          s.toLowerCase().includes('mucous membrane') ||
          s.toLowerCase().includes('conjunctival') ||
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('liver') ||
          s.toLowerCase().includes('renal') ||
          s.toLowerCase().includes('organ dysfunction')
        );
      
      // Risk factors
      const riskFactors = 
        input.flags?.includes('tampon_use') ||
        input.flags?.includes('post_surgical') ||
        input.flags?.includes('skin_wound') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('tampon') ||
          s.toLowerCase().includes('menstruation') ||
          s.toLowerCase().includes('postpartum') ||
          s.toLowerCase().includes('wound') ||
          s.toLowerCase().includes('surgery')
        );
      
      // Direct mention
      const tssMention = 
        input.flags?.includes('toxic_shock') ||
        input.symptoms.some(s => s.toLowerCase().includes('toxic shock'));
      
      return tssMention || (highFever && hypotension && rash && multiSystemInvolvement) ||
        (highFever && rash && multiSystemInvolvement && riskFactors);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Suspected Toxic Shock Syndrome: remove foreign bodies/tampons, obtain cultures, start aggressive fluid resuscitation and broad-spectrum antibiotics. Critical care monitoring required.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-9',
    name: 'Infective Endocarditis',
    category: 'Infectious',
    weight: 8,
    match: (input) => {
      // Fever
      const fever = (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      // Heart murmur
      const heartMurmur = 
        input.flags?.includes('heart_murmur') ||
        input.symptoms.some(s => s.toLowerCase().includes('murmur'));
      
      // Vascular phenomena
      const vascularPhenomena = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('petechiae') ||
          s.toLowerCase().includes('splinter hemorrhages') ||
          s.toLowerCase().includes('janeway') ||
          s.toLowerCase().includes('osler') ||
          s.toLowerCase().includes('roth spots') ||
          s.toLowerCase().includes('embolic') ||
          s.toLowerCase().includes('stroke') ||
          s.toLowerCase().includes('glomerulonephritis')
        );
      
      // Risk factors
      const endocarditisRisk = 
        input.flags?.includes('ivdu') ||
        input.flags?.includes('iv_drug_use') ||
        input.flags?.includes('prosthetic_valve') ||
        input.flags?.includes('congenital_heart') ||
        input.flags?.includes('prior_endocarditis') ||
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('valve') ||
          h.toLowerCase().includes('congenital heart') ||
          h.toLowerCase().includes('endocarditis') ||
          h.toLowerCase().includes('rheumatic')
        ) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('iv drug') ||
          s.toLowerCase().includes('intravenous drug')
        );
      
      // Direct mention
      const endocarditisMention = 
        input.flags?.includes('endocarditis') ||
        input.flags?.includes('positive_blood_cultures') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('endocarditis') ||
          s.toLowerCase().includes('valve vegetation') ||
          s.toLowerCase().includes('positive blood cultures')
        );
      
      return endocarditisMention || 
        (fever && (heartMurmur || vascularPhenomena) && endocarditisRisk);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Suspected infective endocarditis: obtain blood cultures (3 sets), echocardiogram, and start empiric antibiotics. Requires hospital admission and infectious disease consult.',
      confidence: 0.85
    }
  },
  {
    id: 'INFX-10',
    name: 'Severe Malaria',
    category: 'Infectious',
    weight: 9,
    match: (input) => {
      // Travel history
      const travelHistory = 
        input.flags?.includes('travel_malaria_endemic') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('travel') && 
            (s.toLowerCase().includes('africa') || 
             s.toLowerCase().includes('asia') || 
             s.toLowerCase().includes('south america') ||
             s.toLowerCase().includes('malaria')))
        );
      
      // Fever
      const fever = (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      // Severe manifestations
      const severeManifestation = 
        input.flags?.includes('altered_mental_status') ||
        input.flags?.includes('jaundice') ||
        input.flags?.includes('renal_failure') ||
        input.flags?.includes('respiratory_distress') ||
        input.flags?.includes('bleeding') ||
        input.flags?.includes('shock') ||
        input.flags?.includes('acidosis') ||
        input.flags?.includes('hypoglycemia') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental status') ||
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('seizure') ||
          s.toLowerCase().includes('jaundice') ||
          s.toLowerCase().includes('yellow skin') ||
          s.toLowerCase().includes('yellow eyes') ||
          s.toLowerCase().includes('dark urine') ||
          s.toLowerCase().includes('oliguria') ||
          s.toLowerCase().includes('anuria') ||
          s.toLowerCase().includes('respiratory distress') ||
          s.toLowerCase().includes('bleeding') ||
          s.toLowerCase().includes('shock') ||
          s.toLowerCase().includes('hypotension')
        );
      
      // Direct mention
      const malariaMention = 
        input.flags?.includes('malaria') ||
        input.flags?.includes('falciparum') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('malaria') ||
          s.toLowerCase().includes('plasmodium')
        );
      
      return (malariaMention && (severeManifestation || fever)) || 
        (travelHistory && fever && severeManifestation);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Suspected severe malaria: obtain immediate blood smears, start IV antimalarials without delay. Severe malaria is a medical emergency with high mortality if treatment is delayed.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-11',
    name: 'Acute HIV Infection',
    category: 'Infectious',
    weight: 6,
    match: (input) => {
      // Mononucleosis-like syndrome
      const monoLike = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('sore throat') ||
          s.toLowerCase().includes('rash') ||
          s.toLowerCase().includes('lymphadenopathy') ||
          s.toLowerCase().includes('swollen glands') ||
          s.toLowerCase().includes('myalgia') ||
          s.toLowerCase().includes('muscle pain') ||
          s.toLowerCase().includes('fatigue') ||
          s.toLowerCase().includes('headache')
        );
      
      // Risk factors
      const riskFactors = 
        input.flags?.includes('hiv_risk') ||
        input.flags?.includes('unprotected_sex') ||
        input.flags?.includes('msm') ||
        input.flags?.includes('ivdu') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('unprotected sex') ||
          s.toLowerCase().includes('new partner') ||
          s.toLowerCase().includes('iv drug use')
        );
      
      // Direct mention
      const hivMention = 
        input.flags?.includes('acute_hiv') ||
        input.flags?.includes('hiv_seroconversion') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('acute hiv') ||
          s.toLowerCase().includes('hiv seroconversion')
        );
      
      return hivMention || (monoLike && riskFactors);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' }
      ],
      explain: 'Suspected acute HIV infection: perform HIV RNA testing along with antibody testing. Early diagnosis improves outcomes and reduces transmission risk.',
      confidence: 0.8
    }
  },
  {
    id: 'INFX-12',
    name: 'Tetanus',
    category: 'Infectious',
    weight: 9,
    match: (input) => {
      // Tetanus symptoms
      const tetanusSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('lockjaw') ||
        s.toLowerCase().includes('trismus') ||
        s.toLowerCase().includes('muscle spasm') ||
        s.toLowerCase().includes('muscle stiffness') ||
        s.toLowerCase().includes('muscle rigidity') ||
        s.toLowerCase().includes('risus sardonicus') ||
        s.toLowerCase().includes('opisthotonos') ||
        s.toLowerCase().includes('difficulty swallowing') ||
        s.toLowerCase().includes('spasm when stimulated')
      );
      
      // Wound history
      const woundHistory = 
        input.flags?.includes('dirty_wound') ||
        input.flags?.includes('puncture_wound') ||
        input.flags?.includes('burn') ||
        input.flags?.includes('soil_contamination') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('wound') ||
          s.toLowerCase().includes('puncture') ||
          s.toLowerCase().includes('burn') ||
          s.toLowerCase().includes('soil') ||
          s.toLowerCase().includes('contaminated') ||
          s.toLowerCase().includes('rusty')
        );
      
      // Vaccination status
      const poorVaccination = 
        input.flags?.includes('no_tetanus_vaccine') ||
        input.flags?.includes('outdated_tetanus') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('tetanus') && s.toLowerCase().includes('vaccine') && 
           (s.toLowerCase().includes('no') || s.toLowerCase().includes('outdated') || s.toLowerCase().includes('old')))
        );
      
      // Direct mention
      const tetanusMention = 
        input.flags?.includes('tetanus') ||
        input.symptoms.some(s => s.toLowerCase().includes('tetanus'));
      
      return tetanusMention || (tetanusSymptoms && woundHistory) || 
        (tetanusSymptoms && poorVaccination);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Suspected tetanus: secure airway, administer tetanus immunoglobulin, metronidazole, muscle relaxants, and provide supportive care in ICU. Tetanus is a life-threatening emergency.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-13',
    name: 'Orbital/Periorbital Cellulitis',
    category: 'Infectious',
    weight: 8,
    match: (input) => {
      // Periorbital symptoms
      const periorbitalSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('eye swelling') ||
        s.toLowerCase().includes('eyelid swelling') ||
        s.toLowerCase().includes('periorbital swelling') ||
        s.toLowerCase().includes('orbital swelling') ||
        s.toLowerCase().includes('eye redness') ||
        s.toLowerCase().includes('eyelid redness') ||
        s.toLowerCase().includes('periorbital pain')
      );
      
      // Orbital symptoms (more concerning)
      const orbitalSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('proptosis') ||
        s.toLowerCase().includes('eye protrusion') ||
        s.toLowerCase().includes('diplopia') ||
        s.toLowerCase().includes('double vision') ||
        s.toLowerCase().includes('ophthalmoplegia') ||
        s.toLowerCase().includes('vision loss') ||
        s.toLowerCase().includes('eye pain with movement') ||
        s.toLowerCase().includes('limited eye movement')
      );
      
      // Fever/systemic symptoms
      const systemicSymptoms = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('malaise')
        );
      
      // Risk factors
      const riskFactors = input.symptoms.some(s => 
        s.toLowerCase().includes('sinusitis') ||
        s.toLowerCase().includes('sinus infection') ||
        s.toLowerCase().includes('dental infection') ||
        s.toLowerCase().includes('facial trauma') ||
        s.toLowerCase().includes('insect bite')
      );
      
      // Direct mention
      const cellulitisFlag = 
        input.flags?.includes('orbital_cellulitis') ||
        input.flags?.includes('periorbital_cellulitis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('orbital cellulitis') ||
          s.toLowerCase().includes('periorbital cellulitis')
        );
      
      // Orbital cellulitis is more urgent than periorbital
      if (cellulitisFlag || (orbitalSigns && (periorbitalSigns || systemicSymptoms))) {
        return true; // Orbital cellulitis
      }
      
      return periorbitalSigns && (systemicSymptoms || riskFactors);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Suspected orbital/periorbital cellulitis: requires urgent ophthalmology consultation, broad-spectrum antibiotics, and possible surgical drainage. Orbital cellulitis can lead to blindness or intracranial spread.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-14',
    name: 'Acute Epiglottitis',
    category: 'Infectious',
    weight: 10,
    match: (input) => {
      // Classic symptoms ("4 Ds")
      const classicSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('dysphagia') ||
        s.toLowerCase().includes('drooling') ||
        s.toLowerCase().includes('difficulty swallowing') ||
        s.toLowerCase().includes('voice change') ||
        s.toLowerCase().includes('muffled voice') ||
        s.toLowerCase().includes('hoarse voice') ||
        s.toLowerCase().includes('stridor') ||
        s.toLowerCase().includes('sore throat')
      );
      
      // Toxic appearance/fever
      const toxicAppearance =
        (input.vitals?.temperature !== undefined && input.vitals.temperature >= 38.5) || 
        input.flags?.includes('toxic_appearance') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('toxic') ||
          s.toLowerCase().includes('ill-appearing')
        );
      
      // Sitting forward (tripod position)
      const tripodPosition = input.symptoms.some(s => 
        s.toLowerCase().includes('tripod') ||
        s.toLowerCase().includes('sitting forward') ||
        s.toLowerCase().includes('leaning forward')
      );
      
      // Direct mention
      const epiglottitisMention = 
        input.flags?.includes('epiglottitis') ||
        input.symptoms.some(s => s.toLowerCase().includes('epiglottitis'));
      
      return epiglottitisMention || 
        (classicSymptoms && toxicAppearance) ||
        (classicSymptoms && tripodPosition);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Otolaryngology', type: 'secondary' },
        { name: 'Anesthesiology', type: 'tertiary' }
      ],
      explain: 'Suspected acute epiglottitis: DO NOT examine throat or attempt intubation except in controlled OR setting. Immediate airway team activation required.',
      confidence: 0.95
    }
  },
  {
    id: 'INFX-15',
    name: 'Tuberculosis (Active)',
    category: 'Infectious',
    weight: 7,
    match: (input) => {
      // Classic TB symptoms
      const classicSymptoms = 
        input.symptoms.some(s => 
          (s.toLowerCase().includes('cough') && s.toLowerCase().includes('weeks')) ||
          (s.toLowerCase().includes('cough') && s.toLowerCase().includes('blood')) ||
          s.toLowerCase().includes('hemoptysis') ||
          s.toLowerCase().includes('night sweats') ||
          s.toLowerCase().includes('weight loss') ||
          (s.toLowerCase().includes('fever') && s.toLowerCase().includes('night'))
        );
      
      // Risk factors
      const riskFactors =
        input.flags?.includes('tb_exposure') ||
        input.flags?.includes('hiv_positive') ||
        input.flags?.includes('immunocompromised') ||
        input.flags?.includes('prison') ||
        input.flags?.includes('homeless') ||
        input.flags?.includes('endemic_area') ||
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('hiv') ||
          h.toLowerCase().includes('transplant') ||
          h.toLowerCase().includes('immunosuppression')
        ) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('tb exposure') ||
          s.toLowerCase().includes('prison') ||
          s.toLowerCase().includes('homeless') ||
          (s.toLowerCase().includes('travel') && 
            (s.toLowerCase().includes('asia') || 
             s.toLowerCase().includes('africa') || 
             s.toLowerCase().includes('eastern europe')))
        );
      
      // Direct mention or confirmed TB
      const tbMention = 
        input.flags?.includes('tb_positive') ||
        input.flags?.includes('positive_afb') ||
        input.flags?.includes('active_tb') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('active tuberculosis') ||
          s.toLowerCase().includes('positive afb') ||
          s.toLowerCase().includes('positive igra')
        );
      
      return tbMention || (classicSymptoms && riskFactors);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' },
        { name: 'Pulmonology', type: 'tertiary' }
      ],
      explain: 'Suspected active tuberculosis: implement airborne isolation immediately, obtain sputum for AFB, chest imaging, and consult infectious disease. Public health notification required.',
      confidence: 0.85
    }
  },
  {
    id: 'INFX-16',
    name: 'Brain Abscess',
    category: 'Infectious',
    weight: 9,
    match: (input) => {
      // Neurological symptoms
      const neuroSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('headache') ||
        s.toLowerCase().includes('seizure') ||
        s.toLowerCase().includes('focal deficit') ||
        s.toLowerCase().includes('weakness') ||
        s.toLowerCase().includes('numbness') ||
        s.toLowerCase().includes('vision change') ||
        s.toLowerCase().includes('speech') ||
        s.toLowerCase().includes('confusion') ||
        s.toLowerCase().includes('altered mental')
      );
      
      // Fever/infection signs
      const infectionSigns = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      // Risk factors
      const riskFactors = 
        input.flags?.includes('sinusitis') ||
        input.flags?.includes('otitis') ||
        input.flags?.includes('mastoiditis') ||
        input.flags?.includes('endocarditis') ||
        input.flags?.includes('dental_infection') ||
        input.flags?.includes('immunocompromised') ||
        input.flags?.includes('iv_drug_use') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('sinusitis') ||
          s.toLowerCase().includes('ear infection') ||
          s.toLowerCase().includes('mastoiditis') ||
          s.toLowerCase().includes('endocarditis') ||
          s.toLowerCase().includes('dental') ||
          s.toLowerCase().includes('tooth') ||
          s.toLowerCase().includes('abscess') ||
          s.toLowerCase().includes('iv drug')
        );
      
      // Direct mention
      const abscessMention = 
        input.flags?.includes('brain_abscess') ||
        input.flags?.includes('intracranial_abscess') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('brain abscess') ||
          s.toLowerCase().includes('intracranial abscess')
        );
      
      return abscessMention || (neuroSymptoms && infectionSigns && riskFactors);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Suspected brain abscess: obtain urgent contrast-enhanced brain imaging, blood cultures, and start broad-spectrum antibiotics including coverage for anaerobes. Neurosurgical consultation required.',
      confidence: 0.9
    }
  },
  // --- Metabolic/Endocrine Rules ---
  {
    id: 'META-1',
    name: 'Diabetic Ketoacidosis (DKA)',
    category: 'Metabolic',
    weight: 9,
    match: (input) => {
      // Known diabetes history
      const diabetesHistory = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('diabetes') || 
          h.toLowerCase().includes('t1dm') ||
          h.toLowerCase().includes('type 1')
        ) ||
        input.flags?.includes('diabetes') ||
        input.flags?.includes('t1dm');
      
      // Hyperglycemia
      const hyperglycemia = 
        input.flags?.includes('hyperglycemia') ||
        input.flags?.includes('high_glucose') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('high glucose') || 
          s.toLowerCase().includes('hyperglycemia') ||
          s.toLowerCase().includes('high blood sugar')
        );
      
      // Ketosis/acidosis markers
      const ketosis = 
        input.flags?.includes('ketosis') ||
        input.flags?.includes('ketones') ||
        input.flags?.includes('metabolic_acidosis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('ketones') || 
          s.toLowerCase().includes('ketosis') ||
          s.toLowerCase().includes('acidosis') ||
          s.toLowerCase().includes('fruity breath') ||
          s.toLowerCase().includes('kussmaul breathing') ||
          s.toLowerCase().includes('deep breathing')
        );
      
      // Classic symptoms
      const classicSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('polydipsia') || 
          s.toLowerCase().includes('excessive thirst') ||
          s.toLowerCase().includes('polyuria') ||
          s.toLowerCase().includes('frequent urination') ||
          s.toLowerCase().includes('weight loss') ||
          s.toLowerCase().includes('dehydration') ||
          s.toLowerCase().includes('nausea') ||
          s.toLowerCase().includes('vomiting') ||
          s.toLowerCase().includes('abdominal pain')
        );
      
      // Altered mental status
      const alteredMentalStatus = 
        (input.vitals?.gcs !== undefined && input.vitals.gcs < 15) ||
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental') || 
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('drowsy') ||
          s.toLowerCase().includes('lethargy')
        );
      
      // Direct mention of DKA
      const dkaMention = 
        input.flags?.includes('dka') ||
        input.flags?.includes('diabetic_ketoacidosis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('dka') || 
          s.toLowerCase().includes('diabetic ketoacidosis')
        );
      
      return dkaMention || 
        ((diabetesHistory || hyperglycemia) && (ketosis || (classicSymptoms && alteredMentalStatus)));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Endocrinology', type: 'secondary' }
      ],
      explain: 'Suspected diabetic ketoacidosis: requires immediate IV fluids, insulin therapy, and electrolyte management. Monitor for cerebral edema, especially in pediatric patients.',
      confidence: 0.95
    }
  },
  {
    id: 'META-2',
    name: 'Hyperosmolar Hyperglycemic State (HHS)',
    category: 'Metabolic',
    weight: 9,
    match: (input) => {
      // Usually type 2 diabetes, often elderly
      const type2Diabetes = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('type 2 diabetes') || 
          h.toLowerCase().includes('t2dm')
        ) ||
        input.flags?.includes('t2dm') ||
        (input.flags?.includes('diabetes') && input.age > 50);
      
      // Severe hyperglycemia (typically >600 mg/dL)
      const severeHyperglycemia = 
        input.flags?.includes('severe_hyperglycemia') ||
        input.flags?.includes('glucose_over_600') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('glucose') && s.toLowerCase().includes('600')) || 
          (s.toLowerCase().includes('glucose') && s.toLowerCase().includes('high')) ||
          s.toLowerCase().includes('severe hyperglycemia')
        );
      
      // Hyperosmolarity
      const hyperosmolarity = 
        input.flags?.includes('hyperosmolar') ||
        input.flags?.includes('hyperosmolality') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('hyperosmolar') || 
          s.toLowerCase().includes('severe dehydration')
        );
      
      // Absence of significant ketosis (unlike DKA)
      const minimalKetosis = 
        input.flags?.includes('minimal_ketones') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('ketones') && s.toLowerCase().includes('negative')) || 
          (s.toLowerCase().includes('ketones') && s.toLowerCase().includes('minimal'))
        );
      
      // Altered mental status (often more severe than DKA)
      const alteredMentalStatus = 
        (input.vitals?.gcs !== undefined && input.vitals.gcs < 15) ||
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental') || 
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('lethargy') ||
          s.toLowerCase().includes('coma')
        );
      
      // Direct mention of HHS
      const hhsMention = 
        input.flags?.includes('hhs') ||
        input.flags?.includes('hyperosmolar_state') ||
        input.flags?.includes('honk') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('hhs') || 
          s.toLowerCase().includes('hyperosmolar') ||
          s.toLowerCase().includes('honk') ||
          s.toLowerCase().includes('hyperosmolar hyperglycemic')
        );
      
      return hhsMention || 
        (severeHyperglycemia && (hyperosmolarity || alteredMentalStatus) && (type2Diabetes || !input.flags?.includes('dka')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Endocrinology', type: 'secondary' }
      ],
      explain: 'Hyperosmolar Hyperglycemic State: extremely high glucose with severe dehydration. Higher mortality than DKA. Requires aggressive fluid resuscitation and careful insulin therapy.',
      confidence: 0.92
    }
  },
  {
    id: 'META-3',
    name: 'Thyroid Storm',
    category: 'Metabolic',
    weight: 9,
    match: (input) => {
      // History of hyperthyroidism or Graves' disease
      const hyperthyroidHistory = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('hyperthyroid') || 
          h.toLowerCase().includes('graves') ||
          h.toLowerCase().includes('thyrotoxicosis')
        ) ||
        input.flags?.includes('hyperthyroidism') ||
        input.flags?.includes('graves_disease');
      
      // Thermoregulatory dysfunction (high fever)
      const fever = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.5) ||
        input.symptoms.some(s => s.toLowerCase().includes('fever') || s.toLowerCase().includes('hyperthermia'));
      
      // Cardiovascular effects
      const cardiovascularEffects = 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.flags?.includes('tachycardia') ||
        input.flags?.includes('afib') ||
        input.flags?.includes('heart_failure') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('tachycardia') || 
          s.toLowerCase().includes('palpitations') ||
          s.toLowerCase().includes('rapid heart') ||
          s.toLowerCase().includes('atrial fibrillation') ||
          s.toLowerCase().includes('chest pain') ||
          s.toLowerCase().includes('heart failure')
        );
      
      // CNS effects
      const cnsEffects = 
        input.flags?.includes('altered_mental_status') ||
        input.flags?.includes('agitation') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('agitation') || 
          s.toLowerCase().includes('delirium') ||
          s.toLowerCase().includes('psychosis') ||
          s.toLowerCase().includes('seizure') ||
          s.toLowerCase().includes('coma') ||
          s.toLowerCase().includes('altered mental')
        );
      
      // GI/hepatic dysfunction
      const giEffects = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('nausea') || 
          s.toLowerCase().includes('vomiting') ||
          s.toLowerCase().includes('diarrhea') ||
          s.toLowerCase().includes('abdominal pain') ||
          s.toLowerCase().includes('jaundice')
        );
      
      // Precipitating factors
      const precipitatingFactors = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('infection') || 
          s.toLowerCase().includes('surgery') ||
          s.toLowerCase().includes('trauma') ||
          s.toLowerCase().includes('stress') ||
          s.toLowerCase().includes('medication non-compliance') ||
          s.toLowerCase().includes('stopped medication') ||
          s.toLowerCase().includes('iodine exposure') ||
          s.toLowerCase().includes('contrast dye')
        );
      
      // Direct mention of thyroid storm
      const thyroidStormMention = 
        input.flags?.includes('thyroid_storm') ||
        input.flags?.includes('thyrotoxic_crisis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('thyroid storm') || 
          s.toLowerCase().includes('thyrotoxic crisis')
        );
      
      return thyroidStormMention || 
        (hyperthyroidHistory && fever && ((cardiovascularEffects && cnsEffects) || (cardiovascularEffects && giEffects) || (cnsEffects && giEffects)));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Endocrinology', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Suspected thyroid storm: life-threatening hyperthyroidism requiring immediate beta-blockade, thionamides, and supportive care. Mortality up to 30% if untreated.',
      confidence: 0.9
    }
  },
  {
    id: 'META-4',
    name: 'Adrenal Crisis',
    category: 'Metabolic',
    weight: 9,
    match: (input) => {
      // History of adrenal insufficiency or steroid use
      const adrenalHistory = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('adrenal insufficiency') || 
          h.toLowerCase().includes('addison') ||
          h.toLowerCase().includes('steroid dependent') ||
          h.toLowerCase().includes('adrenal disease') ||
          h.toLowerCase().includes('hypopituitarism')
        ) ||
        (input.medications || []).some(m => 
          m.toLowerCase().includes('prednisone') || 
          m.toLowerCase().includes('hydrocortisone') ||
          m.toLowerCase().includes('dexamethasone') ||
          m.toLowerCase().includes('steroid') ||
          m.toLowerCase().includes('budesonide')
        ) ||
        input.flags?.includes('adrenal_insufficiency') ||
        input.flags?.includes('steroid_dependent');
      
      // Hemodynamic instability
      const hemodynamicInstability = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) ||
        input.flags?.includes('hypotension') ||
        input.flags?.includes('shock') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('hypotension') || 
          s.toLowerCase().includes('shock') ||
          s.toLowerCase().includes('low blood pressure')
        );
      
      // Acute illness/stress
      const acuteStress = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('infection') || 
          s.toLowerCase().includes('surgery') ||
          s.toLowerCase().includes('trauma') ||
          s.toLowerCase().includes('illness') ||
          s.toLowerCase().includes('missed steroid')
        );
      
      // GI symptoms
      const giSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('nausea') || 
          s.toLowerCase().includes('vomiting') ||
          s.toLowerCase().includes('abdominal pain') ||
          s.toLowerCase().includes('diarrhea')
        );
      
      // Other symptoms
      const otherSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('weakness') || 
          s.toLowerCase().includes('fatigue') ||
          s.toLowerCase().includes('lethargy') ||
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('altered mental') ||
          s.toLowerCase().includes('fever')
        );
      
      // Direct mention of adrenal crisis
      const adrenalCrisisMention = 
        input.flags?.includes('adrenal_crisis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('adrenal crisis') || 
          s.toLowerCase().includes('addisonian crisis')
        );
      
      return adrenalCrisisMention || 
        (adrenalHistory && hemodynamicInstability && (acuteStress || giSymptoms || otherSymptoms));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Endocrinology', type: 'secondary' }
      ],
      explain: 'Suspected adrenal crisis: immediate IV hydrocortisone, fluid resuscitation, and management of precipitating factors. Do not delay steroid administration for test results.',
      confidence: 0.9
    }
  },
  {
    id: 'META-5',
    name: 'Severe Hyponatremia',
    category: 'Metabolic',
    weight: 8,
    match: (input) => {
      // Direct mention of severe hyponatremia
      const hyponatremiaMention = 
        input.flags?.includes('severe_hyponatremia') ||
        input.flags?.includes('sodium_under_120') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe hyponatremia') || 
          (s.toLowerCase().includes('sodium') && s.toLowerCase().includes('low'))
        );
      
      // Neurological symptoms characteristic of hyponatremia
      const neuroSymptoms = 
        input.flags?.includes('altered_mental_status') ||
        input.flags?.includes('seizure') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental') || 
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('seizure') ||
          s.toLowerCase().includes('headache') ||
          s.toLowerCase().includes('lethargy') ||
          s.toLowerCase().includes('disorientation') ||
          s.toLowerCase().includes('coma')
        );
      
      // Risk factors for hyponatremia
      const riskFactors = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('excessive water') || 
          s.toLowerCase().includes('psychogenic polydipsia') ||
          s.toLowerCase().includes('siadh') ||
          s.toLowerCase().includes('heart failure') ||
          s.toLowerCase().includes('cirrhosis') ||
          s.toLowerCase().includes('diuretic') ||
          s.toLowerCase().includes('adrenal insufficiency') ||
          s.toLowerCase().includes('hypothyroid')
        ) ||
        (input.medications || []).some(m => 
          m.toLowerCase().includes('diuretic') || 
          m.toLowerCase().includes('ssri') ||
          m.toLowerCase().includes('carbamazepine') ||
          m.toLowerCase().includes('oxcarbazepine')
        );
      
      return hyponatremiaMention || (neuroSymptoms && riskFactors);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Nephrology', type: 'secondary' }
      ],
      explain: 'Severe hyponatremia with neurological symptoms. Requires careful, controlled sodium correction (avoid too rapid correction to prevent osmotic demyelination syndrome).',
      confidence: 0.9
    }
  },
  {
    id: 'META-6',
    name: 'Severe Hyperkalemia',
    category: 'Metabolic',
    weight: 9,
    match: (input) => {
      // Direct mention of severe hyperkalemia
      const hyperkalemiaMention = 
        input.flags?.includes('severe_hyperkalemia') ||
        input.flags?.includes('potassium_over_6.5') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe hyperkalemia') || 
          (s.toLowerCase().includes('potassium') && s.toLowerCase().includes('high'))
        );
      
      // ECG changes/cardiac effects
      const ecgChanges = 
        input.flags?.includes('ecg_changes') ||
        input.flags?.includes('peaked_t_waves') ||
        input.flags?.includes('widened_qrs') ||
        input.flags?.includes('arrhythmia') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('ecg changes') || 
          s.toLowerCase().includes('peaked t waves') ||
          s.toLowerCase().includes('wide qrs') ||
          s.toLowerCase().includes('arrhythmia') ||
          s.toLowerCase().includes('heart block') ||
          s.toLowerCase().includes('palpitations')
        );
      
      // Risk factors for hyperkalemia
      const riskFactors = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('kidney disease') || 
          h.toLowerCase().includes('renal failure') ||
          h.toLowerCase().includes('ckd') ||
          h.toLowerCase().includes('aki') ||
          h.toLowerCase().includes('dialysis') ||
          h.toLowerCase().includes('adrenal insufficiency')
        ) ||
        (input.medications || []).some(m => 
          m.toLowerCase().includes('ace inhibitor') || 
          m.toLowerCase().includes('arb') ||
          m.toLowerCase().includes('spironolactone') ||
          m.toLowerCase().includes('eplerenone') ||
          m.toLowerCase().includes('potassium sparing') ||
          m.toLowerCase().includes('potassium supplement') ||
          m.toLowerCase().includes('trimethoprim')
        );
      
      // Neuromuscular symptoms
      const neuroSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('weakness') || 
          s.toLowerCase().includes('paresthesia') ||
          s.toLowerCase().includes('paralysis')
        );
      
      return hyperkalemiaMention || (ecgChanges && riskFactors) || 
        (neuroSymptoms && riskFactors && input.flags?.includes('hyperkalemia'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Nephrology', type: 'secondary' }
      ],
      explain: 'Severe hyperkalemia: potential for lethal arrhythmias. Requires immediate ECG, calcium (membrane stabilization), insulin/glucose, beta-agonists, and definitive treatment (dialysis if severe).',
      confidence: 0.95
    }
  },
  {
    id: 'META-7',
    name: 'Severe Hypoglycemia',
    category: 'Metabolic',
    weight: 9,
    match: (input) => {
      // Direct mention of severe hypoglycemia
      const hypoglycemiaMention = 
        input.flags?.includes('severe_hypoglycemia') ||
        input.flags?.includes('glucose_under_40') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe hypoglycemia') || 
          (s.toLowerCase().includes('glucose') && s.toLowerCase().includes('low')) ||
          (s.toLowerCase().includes('sugar') && s.toLowerCase().includes('low'))
        );
      
      // Neuroglycopenic symptoms
      const neuroSymptoms = 
        input.flags?.includes('altered_mental_status') ||
        input.flags?.includes('seizure') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental') || 
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('seizure') ||
          s.toLowerCase().includes('coma') ||
          s.toLowerCase().includes('unconscious') ||
          s.toLowerCase().includes('dizziness') ||
          s.toLowerCase().includes('weakness')
        );
      
      // Autonomic/adrenergic symptoms
      const autonomicSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('diaphoresis') || 
          s.toLowerCase().includes('sweating') ||
          s.toLowerCase().includes('tremor') ||
          s.toLowerCase().includes('shaking') ||
          s.toLowerCase().includes('palpitations') ||
          s.toLowerCase().includes('anxiety') ||
          s.toLowerCase().includes('hunger')
        );
      
      // Risk factors
      const riskFactors = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('diabetes')
        ) ||
        (input.medications || []).some(m => 
          m.toLowerCase().includes('insulin') || 
          m.toLowerCase().includes('sulfonylurea') ||
          m.toLowerCase().includes('glipizide') ||
          m.toLowerCase().includes('glyburide') ||
          m.toLowerCase().includes('glimepiride')
        );
      
      return hypoglycemiaMention || 
        (riskFactors && (neuroSymptoms || (autonomicSymptoms && input.flags?.includes('hypoglycemia'))));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' }
      ],
      explain: 'Severe hypoglycemia: immediate glucose administration required. IV dextrose for severe cases or altered mental status; oral glucose if patient can safely swallow.',
      confidence: 0.95
    }
  },
  {
    id: 'META-8',
    name: 'Hypercalcemic Crisis',
    category: 'Metabolic',
    weight: 8,
    match: (input) => {
      // Direct mention of severe hypercalcemia
      const hypercalcemiaMention = 
        input.flags?.includes('severe_hypercalcemia') ||
        input.flags?.includes('calcium_over_14') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe hypercalcemia') || 
          (s.toLowerCase().includes('calcium') && s.toLowerCase().includes('high')) ||
          s.toLowerCase().includes('hypercalcemic crisis')
        );
      
      // Neurological symptoms
      const neuroSymptoms = 
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental') || 
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('lethargy') ||
          s.toLowerCase().includes('weakness') ||
          s.toLowerCase().includes('coma')
        );
      
      // GI symptoms
      const giSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('nausea') || 
          s.toLowerCase().includes('vomiting') ||
          s.toLowerCase().includes('constipation') ||
          s.toLowerCase().includes('abdominal pain')
        );
      
      // Cardiac effects
      const cardiacEffects = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('arrhythmia') || 
          s.toLowerCase().includes('short qt') ||
          s.toLowerCase().includes('bradycardia')
        );
      
      // Renal effects
      const renalEffects = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('polyuria') || 
          s.toLowerCase().includes('polydipsia') ||
          s.toLowerCase().includes('dehydration') ||
          s.toLowerCase().includes('kidney stone') ||
          s.toLowerCase().includes('renal failure')
        );
      
      // Risk factors (malignancy and hyperparathyroidism most common)
      const riskFactors = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('cancer') || 
          h.toLowerCase().includes('malignancy') ||
          h.toLowerCase().includes('hyperparathyroid') ||
          h.toLowerCase().includes('sarcoidosis') ||
          h.toLowerCase().includes('multiple myeloma')
        );
      
      return hypercalcemiaMention || 
        (neuroSymptoms && (giSymptoms || cardiacEffects || renalEffects) && riskFactors);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Nephrology', type: 'secondary' },
        { name: 'Endocrinology', type: 'tertiary' }
      ],
      explain: 'Hypercalcemic crisis: requires aggressive IV fluid resuscitation, bisphosphonates, calcitonin, and management of underlying cause (often malignancy or hyperparathyroidism).',
      confidence: 0.9
    }
  },
  // --- Gastrointestinal/Abdominal Rules ---
  {
    id: 'GI-1',
    name: 'Upper GI Bleeding (Life-threatening)',
    category: 'Gastrointestinal',
    weight: 10,
    match: (input) => {
      // Hematemesis/Coffee ground emesis
      const hematemesis = input.symptoms.some(s => 
        s.toLowerCase().includes('vomiting blood') ||
        s.toLowerCase().includes('hematemesis') ||
        s.toLowerCase().includes('coffee ground') ||
        (s.toLowerCase().includes('vomit') && s.toLowerCase().includes('blood'))
      );
      
      // Melena
      const melena = input.symptoms.some(s => 
        s.toLowerCase().includes('melena') ||
        s.toLowerCase().includes('black stool') ||
        s.toLowerCase().includes('tarry stool') ||
        (s.toLowerCase().includes('stool') && s.toLowerCase().includes('black'))
      );
      
      // Signs of shock
      const shockSigns = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.flags?.includes('hypotension') ||
        input.flags?.includes('shock') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('lightheaded') || 
          s.toLowerCase().includes('syncope') ||
          s.toLowerCase().includes('dizzy') ||
          s.toLowerCase().includes('cold skin') ||
          s.toLowerCase().includes('pale') ||
          s.toLowerCase().includes('clammy')
        );
      
      // Direct mention of severe or massive bleeding
      const severeBleeding = input.symptoms.some(s => 
        (s.toLowerCase().includes('bleeding') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('massive') ||
          s.toLowerCase().includes('large amount')
        )) ||
        (s.toLowerCase().includes('hemorrhage') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('massive')
        ))
      );

      // Specific flags
      const bleedingFlags = 
        input.flags?.includes('gi_bleeding') ||
        input.flags?.includes('upper_gi_bleed') ||
        input.flags?.includes('variceal_bleeding');
      
      // Life-threatening GI bleeding must have bleeding signs AND either shock or mention of severity
      return bleedingFlags || 
        (hematemesis && (shockSigns || severeBleeding)) || 
        (melena && (shockSigns || severeBleeding));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Gastroenterology', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Life-threatening upper GI bleeding with signs of hemodynamic instability. Requires immediate resuscitation, large-bore IV access, blood products, and emergent endoscopy.',
      confidence: 0.95
    }
  },
  {
    id: 'GI-2',
    name: 'Lower GI Bleeding (Life-threatening)',
    category: 'Gastrointestinal',
    weight: 9,
    match: (input) => {
      // Hematochezia
      const hematochezia = input.symptoms.some(s => 
        s.toLowerCase().includes('hematochezia') ||
        s.toLowerCase().includes('bloody stool') ||
        s.toLowerCase().includes('rectal bleeding') ||
        s.toLowerCase().includes('blood per rectum') ||
        (s.toLowerCase().includes('stool') && s.toLowerCase().includes('red blood')) ||
        (s.toLowerCase().includes('stool') && s.toLowerCase().includes('bright red'))
      );
      
      // Signs of shock
      const shockSigns = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.flags?.includes('hypotension') ||
        input.flags?.includes('shock') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('lightheaded') || 
          s.toLowerCase().includes('syncope') ||
          s.toLowerCase().includes('dizzy') ||
          s.toLowerCase().includes('cold skin') ||
          s.toLowerCase().includes('pale') ||
          s.toLowerCase().includes('clammy')
        );
      
      // Direct mention of severe or massive bleeding
      const severeBleeding = input.symptoms.some(s => 
        (s.toLowerCase().includes('bleeding') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('massive') ||
          s.toLowerCase().includes('large amount')
        )) ||
        (s.toLowerCase().includes('hemorrhage') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('massive')
        ))
      );

      // Specific flags
      const bleedingFlags = 
        input.flags?.includes('gi_bleeding') ||
        input.flags?.includes('lower_gi_bleed') ||
        input.flags?.includes('rectal_bleeding');
      
      // Life-threatening GI bleeding must have bleeding signs AND either shock or mention of severity
      return bleedingFlags || (hematochezia && (shockSigns || severeBleeding));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Gastroenterology', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Life-threatening lower GI bleeding with signs of hemodynamic instability. Requires immediate resuscitation, large-bore IV access, blood products, and urgent colonoscopy or angiography.',
      confidence: 0.95
    }
  },
  {
    id: 'GI-3',
    name: 'Perforated Viscus',
    category: 'Gastrointestinal',
    weight: 10,
    match: (input) => {
      // Sudden onset severe abdominal pain
      const suddenSeverePain = input.symptoms.some(s => 
        (s.toLowerCase().includes('abdominal pain') && (
          s.toLowerCase().includes('sudden') || 
          s.toLowerCase().includes('severe') ||
          s.toLowerCase().includes('intense') ||
          s.toLowerCase().includes('worst')
        )) ||
        (s.toLowerCase().includes('belly pain') && (
          s.toLowerCase().includes('sudden') || 
          s.toLowerCase().includes('severe')
        )) ||
        (s.toLowerCase().includes('stomach pain') && (
          s.toLowerCase().includes('sudden') || 
          s.toLowerCase().includes('severe')
        ))
      );
      
      // Rigid abdomen / peritoneal signs
      const peritonealSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('rigid abdomen') ||
        s.toLowerCase().includes('board-like abdomen') ||
        s.toLowerCase().includes('rebound tenderness') ||
        s.toLowerCase().includes('guarding') ||
        s.toLowerCase().includes('peritoneal') ||
        s.toLowerCase().includes('rigid belly')
      );
      
      // Systemic signs
      const systemicSigns = 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('tachycardia') || 
          s.toLowerCase().includes('fever')
        );
      
      // Risk factors or history
      const riskFactors = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('ulcer') ||
        h.toLowerCase().includes('diverticulitis') ||
        h.toLowerCase().includes('inflammatory bowel') ||
        h.toLowerCase().includes('recent endoscopy') ||
        h.toLowerCase().includes('recent surgery')
      ) || input.symptoms.some(s => 
        s.toLowerCase().includes('history of ulcer') ||
        s.toLowerCase().includes('taking nsaids')
      );
      
      // Free air
      const freeAir = 
        input.flags?.includes('free_air') ||
        input.flags?.includes('pneumoperitoneum') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('free air') ||
          s.toLowerCase().includes('pneumoperitoneum')
        );
      
      // Direct mention
      const perforationMention = 
        input.flags?.includes('perforation') ||
        input.flags?.includes('perforated_ulcer') ||
        input.flags?.includes('perforated_viscus') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('perforation') ||
          s.toLowerCase().includes('perforated')
        );
      
      return perforationMention || freeAir || 
        (suddenSeverePain && peritonealSigns) ||
        (suddenSeverePain && peritonealSigns && (systemicSigns || riskFactors));
import type { TriageRequest, TriageRuleResult } from '@/types/triage';

export interface EnhancedTriageRule {
  id: string;
  name: string;
  category: string;
  weight: number;
  match: (input: TriageRequest) => boolean;
  result: Omit<TriageRuleResult, 'explainability'> & {
    explain: string;
    confidence?: number;
  };
}

export const enhancedTriageRules: EnhancedTriageRule[] = [
  // --- Cardiac & Circulatory Rules ---
  {
    id: 'CARD-1',
    name: 'STEMI (Suspected Acute MI)',
    category: 'Cardiac',
    weight: 10,
    match: (input) => {
      // Enhanced STEMI criteria using more comprehensive assessment
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain') || s.toLowerCase().includes('chest pressure') || s.toLowerCase().includes('chest discomfort'));
      const typicalFeatures = input.symptoms.some(s => 
        s.toLowerCase().includes('crushing') || 
        s.toLowerCase().includes('radiat') ||
        s.toLowerCase().includes('left arm') ||
        s.toLowerCase().includes('jaw') ||
        s.toLowerCase().includes('burning')
      );
      
      const highRiskHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('mi') || 
        h.toLowerCase().includes('coronary') || 
        h.toLowerCase().includes('stent') || 
        h.toLowerCase().includes('cabg')
      );
      
      const diabetesHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      
      const stFlag = input.flags?.includes('st_elevation') || input.flags?.includes('stemi');
      const troponinFlag = input.flags?.includes('troponin_positive');
      
      // Match classic presentation OR elevated troponin/ST elevation
      return (chestPain && typicalFeatures && (highRiskHistory || diabetesHistory || input.age > 50)) || stFlag || troponinFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected STEMI: classic chest pain with risk factors or positive cardiac markers. Immediate ECG and cardiac consult required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-1b',
    name: 'Suspected NSTEMI/Unstable Angina',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      // Core symptoms
      const chestPain = input.symptoms.some(s => 
        s.toLowerCase().includes('chest pain') || 
        s.toLowerCase().includes('chest pressure') || 
        s.toLowerCase().includes('chest discomfort')
      );
      
      // Rest pain or crescendo pattern is concerning for ACS
      const unstablePattern = input.symptoms.some(s => 
        s.toLowerCase().includes('rest') || 
        s.toLowerCase().includes('worsening') || 
        s.toLowerCase().includes('more frequent') || 
        s.toLowerCase().includes('prolonged')
      );
      
      // Associated symptoms
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('sweating') || 
        s.toLowerCase().includes('nausea')
      );
      
      return chestPain && (unstablePattern || associatedSymptoms) && !input.flags?.includes('st_elevation');
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Suspected NSTEMI/Unstable Angina: chest pain with unstable pattern or associated symptoms. Immediate ECG and cardiac evaluation required.',
      confidence: 0.9
    }
  },
  {
    id: 'CARD-2',
    name: 'High-Risk Chest Pain',
    category: 'Cardiac',
    weight: 9,
    match: (input) => {
      const chestPain = input.symptoms.some(s => s.toLowerCase().includes('chest pain'));
      const age = input.age || 0;
      const diabetes = (input.medicalHistory || []).some(h => h.toLowerCase().includes('diabetes'));
      const priorMI = (input.medicalHistory || []).some(h => h.toLowerCase().includes('mi'));
      return chestPain && (age > 65 || diabetes || priorMI);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'High-risk chest pain (elderly, diabetes, or prior MI). Treat as ACS until proven otherwise.',
      confidence: 0.85
    }
  },
  {
    id: 'CARD-3',
    name: 'Cardiac Arrest',
    category: 'Cardiac',
    weight: 10,
    match: (input) => 
      input.flags?.includes('cardiac_arrest') || 
      input.flags?.includes('no_pulse') || 
      input.symptoms.some(s => s.toLowerCase().includes('cardiac arrest') || s.toLowerCase().includes('no pulse')),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Cardiac arrest detected. Immediate resuscitation and post-ROSC care required.',
      confidence: 0.99
    }
  },
  {
    id: 'CARD-4',
    name: 'Life-Threatening Arrhythmia',
    category: 'Cardiac',
    weight: 9,
    match: (input) => input.flags?.includes('vfib') || input.flags?.includes('vtach') || input.flags?.includes('bradycardia') || input.flags?.includes('heart_block'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Life-threatening arrhythmia detected (VF, VT, bradycardia, or heart block). Immediate intervention required.',
      confidence: 0.95
    }
  },
  {
    id: 'CARD-5',
    name: 'Heart Failure with Respiratory Distress',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const heartFailureHistory = (input.medicalHistory || []).some(h => h.toLowerCase().includes('heart failure'));
      const acuteDistress = input.symptoms.some(s => 
        s.toLowerCase().includes('shortness of breath') || 
        s.toLowerCase().includes('dyspnea') || 
        s.toLowerCase().includes('orthopnea') || 
        s.toLowerCase().includes('paroxysmal nocturnal')
      );
      const hypoxemia = (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94);
      
      // Expanded to catch both known and new heart failure
      return (acuteDistress && (heartFailureHistory || input.symptoms.some(s => 
        s.toLowerCase().includes('edema') || 
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('jvd') ||
        s.toLowerCase().includes('heart failure')
      ))) && hypoxemia;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Acute heart failure with respiratory distress and hypoxemia. Immediate stabilization and treatment required.',
      confidence: 0.92
    }
  },
  {
    id: 'CARD-5b',
    id: 'CARD-6',
    name: 'Hypertensive Emergency',
    category: 'Cardiac',
    weight: 8,
    match: (input) => {
      const sbp = input.vitals?.systolicBP || 0;
      const endOrgan = input.flags?.includes('end_organ_damage');
      return sbp > 180 && endOrgan;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' }
      ],
      explain: 'Hypertensive emergency: SBP >180 with end-organ damage. Immediate BP control and monitoring required.',
      confidence: 0.93
    }
  },
  // Airway, Breathing, Circulation (ABC)
  {
    id: 'ABC-1',
    name: 'Airway Compromise',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('airway_compromise') || input.flags?.includes('stridor') || input.symptoms.includes('unable_to_speak'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Anesthesiology', type: 'secondary' }
      ],
      explain: 'Airway compromise detected → Critical priority for immediate airway intervention.',
      confidence: 0.98
    }
  },
  {
    id: 'ABC-2',
    name: 'Respiratory Failure',
    category: 'ABC',
    weight: 10,
    match: (input) => input.flags?.includes('no_breath') || input.flags?.includes('ineffective_breathing') || (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate < 8),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Respiratory failure or severe bradypnea detected → Critical priority for ventilatory support.',
      confidence: 0.97
    }
  },
  {
    id: 'ABC-3',
    name: 'Severe Hypoxemia',
    category: 'ABC',
    weight: 9,
    match: (input) => (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 85) || input.flags?.includes('cyanosis'),
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe hypoxemia (SpO₂ < 85%) → Critical priority for oxygenation.',
      confidence: 0.95
    }
  },
  // --- Respiratory Rules ---
  {
    id: 'RESP-1',
    name: 'Acute Respiratory Failure',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      const rr = input.vitals?.respiratoryRate;
      const spo2 = input.vitals?.oxygenSaturation;
      return (rr !== undefined && (rr > 30 || rr < 8)) || (spo2 !== undefined && spo2 < 90) || (input.flags?.includes('severe_respiratory_distress'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Acute respiratory failure: abnormal RR or SpO₂ < 90%, or severe distress. Immediate airway and ventilatory support required.',
      confidence: 0.95
    }
  },
  {
    id: 'RESP-2',
    name: 'Tension Pneumothorax',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('tension_pneumothorax') || (input.symptoms.some(s => s.toLowerCase().includes('chest pain')) && input.flags?.includes('deviated_trachea'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Tension pneumothorax suspected: chest pain with deviated trachea or flag. Immediate needle decompression required.',
      confidence: 0.97
    }
  },
  {
    id: 'RESP-3',
    name: 'Severe Asthma Exacerbation',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      // Life-threatening features
      const lifeThreatening = 
        input.flags?.includes('silent_chest') || 
        input.flags?.includes('cyanosis') || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis') || 
          s.toLowerCase().includes('altered consciousness') ||
          s.toLowerCase().includes('exhaustion')
        );
      
      // Severe features per GINA guidelines
      const severeFeatures = 
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 90) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('complete sentence')) ||
          (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('<50%')) ||
          (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('<50%')) ||
          s.toLowerCase().includes('accessory muscle') ||
          s.toLowerCase().includes('tripod position') ||
          (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe'))
        );
      
      // Direct mention of severe asthma
      const severeAsthma = input.symptoms.some(s => 
        (s.toLowerCase().includes('asthma') && s.toLowerCase().includes('severe')) ||
        (s.toLowerCase().includes('status asthmaticus'))
      );
      
      // Include flag-based detection
      const severeFlag = 
        input.flags?.includes('severe_asthma') || 
        input.flags?.includes('status_asthmaticus');
      
      return lifeThreatening || severeFeatures || severeAsthma || severeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Severe asthma exacerbation with life-threatening or severe features. Immediate continuous bronchodilators, steroids, and possible respiratory support required.',
      confidence: 0.93
    }
  },
  {
    id: 'RESP-4',
    name: 'Pulmonary Embolism (High-Risk)',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      const spo2 = input.vitals?.oxygenSaturation;
      const hr = input.vitals?.heartRate;
      return input.flags?.includes('high_risk_pe') || (spo2 !== undefined && spo2 < 92 && hr !== undefined && hr > 110 && input.symptoms.some(s => s.toLowerCase().includes('pleuritic pain')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'High-risk pulmonary embolism: hypoxemia, tachycardia, pleuritic pain. Immediate imaging and anticoagulation required.',
      confidence: 0.92
    }
  },
  {
    id: 'RESP-5',
    name: 'Moderate Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      // Moderate features per GINA/GOLD guidelines
      const moderateFeatures = 
        ((input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation >= 90 && input.vitals.oxygenSaturation < 94) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 20 && input.vitals.respiratoryRate <= 30) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100 && input.vitals.heartRate <= 120)) &&
        // Not meeting severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma');
      
      // Functional limitations but not severe
      const moderateFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          (s.toLowerCase().includes('moderate') || s.toLowerCase().includes('worse'))) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('50-80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('walking'))
      );
      
      // Direct mention of moderate exacerbation
      const moderateExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('moderate')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
        s.toLowerCase().includes('exacerbation') && 
        !s.toLowerCase().includes('severe') && 
        !s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const moderateFlag = input.flags?.includes('moderate_asthma') || input.flags?.includes('moderate_copd');
      
      return (moderateFeatures || moderateFunctional || moderateExacerbation || moderateFlag) && 
        // Exclude those meeting severe criteria
        !input.symptoms.some(s => 
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest') || 
          s.toLowerCase().includes('cyanosis')
        );
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Moderate asthma/COPD exacerbation: increased work of breathing but without severe features. Requires prompt bronchodilators, steroids, and monitoring.',
      confidence: 0.85
    }
  },
  {
    id: 'RESP-6',
    name: 'Community-Acquired Pneumonia (Concerning Vitals)',
    category: 'Respiratory',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumonia')) && (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 24);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Community-acquired pneumonia with tachypnea. Requires prompt antibiotics and monitoring.',
      confidence: 0.83
    }
  },
  {
    id: 'RESP-7',
    name: 'Spontaneous Pneumothorax (Stable)',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('pneumothorax')) && !(input.flags?.includes('tension_pneumothorax'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Spontaneous pneumothorax (stable): requires monitoring and possible intervention.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-8',
    name: 'Hemoptysis with Risk Factors',
    category: 'Respiratory',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('hemoptysis')) && (input.medicalHistory || []).some(h => h.toLowerCase().includes('cancer') || h.toLowerCase().includes('tb'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' }
      ],
      explain: 'Hemoptysis with risk factors (cancer, TB). Requires urgent evaluation for underlying cause.',
      confidence: 0.8
    }
  },
  {
    id: 'RESP-9',
    name: 'Mild Asthma/COPD Exacerbation',
    category: 'Respiratory',
    weight: 4,
    match: (input) => {
      // Mild features per GINA/GOLD guidelines
      const mildFeatures = 
        ((input.vitals?.oxygenSaturation === undefined || input.vitals.oxygenSaturation >= 94) &&
        (input.vitals?.respiratoryRate === undefined || input.vitals.respiratoryRate <= 20) &&
        (input.vitals?.heartRate === undefined || input.vitals.heartRate <= 100)) &&
        // Not meeting moderate or severe criteria
        !input.flags?.includes('silent_chest') && 
        !input.flags?.includes('severe_asthma') &&
        !input.flags?.includes('moderate_asthma');
      
      // Minimal functional limitations
      const mildFunctional = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('mild')) ||
        (s.toLowerCase().includes('peak flow') && s.toLowerCase().includes('>80%')) ||
        (s.toLowerCase().includes('fev1') && s.toLowerCase().includes('>80%')) ||
        (s.toLowerCase().includes('dyspnea') && s.toLowerCase().includes('exertion'))
      );
      
      // Direct mention of mild exacerbation
      const mildExacerbation = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('mild')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('exacerbation') && 
          s.toLowerCase().includes('mild'))
      );
      
      // Flag-based detection
      const mildFlag = input.flags?.includes('mild_asthma') || input.flags?.includes('mild_copd');
      
      // Normal activities and sleep not affected significantly
      const minimalImpact = input.symptoms.some(s => 
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('minimal impact')) ||
        ((s.toLowerCase().includes('asthma') || s.toLowerCase().includes('copd')) && 
          s.toLowerCase().includes('well controlled'))
      );
      
      return (mildFeatures || mildFunctional || mildExacerbation || mildFlag || minimalImpact) && 
        // Exclude those meeting moderate or severe criteria
        !input.symptoms.some(s => 
          s.toLowerCase().includes('moderate') || 
          s.toLowerCase().includes('severe') ||
          (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
          s.toLowerCase().includes('silent chest')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Mild asthma/COPD exacerbation with minimal impact on function and normal vital signs. Can be managed with bronchodilators and short-term steroids in outpatient setting.',
      confidence: 0.7
    }
  },
  {
    id: 'RESP-10',
    name: 'Upper Respiratory Infection (Normal Vitals)',
    category: 'Respiratory',
    weight: 3,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('uri') || s.toLowerCase().includes('upper respiratory infection')) && (!input.vitals || (input.vitals.respiratoryRate === undefined || input.vitals.respiratoryRate <= 20));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 4,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Upper respiratory infection with normal vitals: routine care.',
      confidence: 0.6
    }
  },
  {
    id: 'RESP-11',
    name: 'Chronic Cough (Stable)',
    category: 'Respiratory',
    weight: 2,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('chronic cough')) && (!input.vitals || (input.vitals.oxygenSaturation === undefined || input.vitals.oxygenSaturation >= 94));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 5,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Chronic cough with stable vitals: non-urgent evaluation.',
      confidence: 0.5
    }
  },
  // --- Neurological Rules ---
  {
    id: 'NEURO-1',
    name: 'Acute Stroke (FAST Positive)',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Enhanced stroke detection using expanded FAST-ED criteria
      const strokeSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('facial droop') || 
        s.toLowerCase().includes('face droop') || 
        s.toLowerCase().includes('arm weakness') || 
        s.toLowerCase().includes('leg weakness') || 
        (s.toLowerCase().includes('speech') && (
          s.toLowerCase().includes('slurred') || 
          s.toLowerCase().includes('difficulty') || 
          s.toLowerCase().includes('aphasia')
        )) ||
        s.toLowerCase().includes('stroke') ||
        s.toLowerCase().includes('hemiparesis') ||
        s.toLowerCase().includes('hemineglect') ||
        s.toLowerCase().includes('visual field')
      );
      
      // Time is brain - time factors are crucial
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_4.5h') || 
        input.flags?.includes('onset_under_24h') || 
        input.symptoms.some(s => s.toLowerCase().includes('last known well') && s.toLowerCase().includes('hour'));
      
      const strokeFlag = input.flags?.includes('stroke') || input.flags?.includes('cva');
      
      // Either explicit stroke symptoms or stroke flag, with time sensitivity
      return (strokeSigns || strokeFlag) && (timeFlag || !input.flags?.includes('onset_over_24h'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Acute stroke suspected: FAST positive (face, arm, speech, time). Immediate stroke protocol activation and time-sensitive imaging required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-1b',
    name: 'Suspected Large Vessel Occlusion Stroke',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Signs of severe neurological deficit suggesting LVO
      const lvoSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('gaze deviation') || 
        (s.toLowerCase().includes('severe') && s.toLowerCase().includes('deficit')) ||
        (s.toLowerCase().includes('multiple') && s.toLowerCase().includes('deficit')) ||
        s.toLowerCase().includes('aphasia') ||
        s.toLowerCase().includes('neglect')
      );
      
      // High NIHSS or specific flag
      const severityFlag = 
        input.flags?.includes('lvo') || 
        input.flags?.includes('high_nihss') || 
        input.flags?.includes('severe_stroke');
      
      // Time window for endovascular intervention is longer
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_24h');
      
      return (lvoSigns || severityFlag) && timeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' },
        { name: 'Interventional Radiology', type: 'tertiary' }
      ],
      explain: 'Suspected large vessel occlusion stroke: severe deficits within intervention window. Immediate CTA and thrombectomy evaluation required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-2',
    name: 'Status Epilepticus',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      return input.flags?.includes('status_epilepticus') || 
        input.flags?.includes('ongoing_seizure') || 
        input.symptoms.some(s => s.toLowerCase().includes('seizure') && (s.toLowerCase().includes('continuous') || s.toLowerCase().includes('multiple')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Status epilepticus: ongoing seizure or multiple seizures without recovery. Immediate anticonvulsant therapy required.',
      confidence: 0.98
    }
  },
  {
    id: 'NEURO-3',
    name: 'Altered Mental Status (GCS < 9)',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      return (input.vitals?.gcs !== undefined && input.vitals.gcs < 9) || 
        input.flags?.includes('unresponsive') || 
        input.symptoms.some(s => s.toLowerCase().includes('unconscious'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Severe altered mental status: GCS < 9 or unresponsive. Immediate airway management and neurological evaluation required.',
      confidence: 0.96
    }
  },
  {
    id: 'NEURO-4',
    name: 'Thunderclap Headache',
    category: 'Neurological',
    weight: 9,
    match: (input) => {
      // Enhanced criteria for thunderclap headache
      const thunderclapFeatures = input.symptoms.some(s => 
        (s.toLowerCase().includes('headache') && (
          s.toLowerCase().includes('worst') || 
          s.toLowerCase().includes('thunderclap') || 
          s.toLowerCase().includes('sudden') ||
          s.toLowerCase().includes('severe') ||
          s.toLowerCase().includes('explosive')
        )) ||
        s.toLowerCase().includes('subarachnoid')
      );
      
      // Associated signs that increase concern
      const concerningSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('neck stiffness') || 
        s.toLowerCase().includes('photophobia') ||
        s.toLowerCase().includes('vomiting') ||
        s.toLowerCase().includes('altered') ||
        s.toLowerCase().includes('neurological')
      ) || input.flags?.includes('meningeal_signs');
      
      return thunderclapFeatures || 
        input.flags?.includes('thunderclap_headache') || 
        (input.symptoms.some(s => s.toLowerCase().includes('headache')) && concerningSigns);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Thunderclap headache: sudden, severe, worst-ever or with concerning features. Immediate evaluation for subarachnoid hemorrhage required.',
      confidence: 0.93
    }
  },
  {
    id: 'NEURO-5',
    name: 'Acute Spinal Cord Compression',
    category: 'Neurological',
    weight: 9,
    match: (input) => {
      return input.flags?.includes('cord_compression') || 
        input.symptoms.some(s => 
          (s.toLowerCase().includes('paralysis') || s.toLowerCase().includes('weakness')) && 
          (s.toLowerCase().includes('legs') || s.toLowerCase().includes('arms'))
        ) && input.symptoms.some(s => s.toLowerCase().includes('bladder') || s.toLowerCase().includes('bowel'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' }
      ],
      explain: 'Acute spinal cord compression: limb weakness with bowel/bladder dysfunction. Immediate imaging and neurosurgical consultation required.',
      confidence: 0.92
    }
  },
  {
    id: 'NEURO-5b',
    name: 'Intracranial Hemorrhage',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Direct mention or signs
      const bleedSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('intracranial hemorrhage') || 
        s.toLowerCase().includes('ich') || 
        s.toLowerCase().includes('cerebral hemorrhage') ||
        s.toLowerCase().includes('brain bleed') ||
        s.toLowerCase().includes('hemorrhagic stroke')
      );
      
      // With neurological deficit
      const deficits = input.symptoms.some(s => 
        s.toLowerCase().includes('weakness') || 
        s.toLowerCase().includes('numbness') ||
        s.toLowerCase().includes('speech') ||
        s.toLowerCase().includes('vision') ||
        s.toLowerCase().includes('level of consciousness')
      );
      
      // Flag for any intracranial bleed
      const bleedFlag = 
        input.flags?.includes('intracranial_hemorrhage') || 
        input.flags?.includes('brain_bleed') || 
        input.flags?.includes('hemorrhagic_stroke');
      
      return bleedSigns || bleedFlag || (input.symptoms.some(s => s.toLowerCase().includes('severe headache')) && deficits);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' },
        { name: 'Neurology', type: 'tertiary' }
      ],
      explain: 'Suspected intracranial hemorrhage. Immediate head CT and neurosurgical evaluation required.',
      confidence: 0.95
    }
  },
  {
    id: 'NEURO-6',
    name: 'First-Time Seizure',
    category: 'Neurological',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('seizure') && s.toLowerCase().includes('first')) && 
        !input.medicalHistory?.some(h => h.toLowerCase().includes('epilepsy') || h.toLowerCase().includes('seizure'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'First-time seizure (now resolved): requires prompt evaluation for underlying cause.',
      confidence: 0.89
    }
  },
  {
    id: 'NEURO-7',
    name: 'Transient Ischemic Attack',
    category: 'Neurological',
    weight: 7,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('tia') || 
        (s.toLowerCase().includes('stroke') && s.toLowerCase().includes('resolved')));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Transient Ischemic Attack: resolved focal neurological symptoms. Requires prompt evaluation to prevent stroke.',
      confidence: 0.85
    }
  },
  {
    id: 'NEURO-8',
    name: 'Migraine with Neurological Deficits',
    category: 'Neurological',
    weight: 6,
    match: (input) => {
      // Enhanced detection of migraine with aura
      const migraine = input.symptoms.some(s => s.toLowerCase().includes('migraine'));
      
      const auraSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('aura') || 
        s.toLowerCase().includes('visual') || 
        s.toLowerCase().includes('scintillating') || 
        s.toLowerCase().includes('scotoma') || 
        s.toLowerCase().includes('numbness') || 
        s.toLowerCase().includes('tingling') ||
        s.toLowerCase().includes('paresthesia')
      );
      
      // History of similar episodes reduces concern
      const knownHistory = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('migraine with aura') || 
        h.toLowerCase().includes('complex migraine')
      );
      
      // First time is more concerning than recurrent with same pattern
      const firstTimeFlag = input.flags?.includes('first_time') || input.symptoms.some(s => s.toLowerCase().includes('first') && s.toLowerCase().includes('time'));
      
      // Concerning if first time or different from usual pattern
      return migraine && auraSymptoms && (firstTimeFlag || input.symptoms.some(s => s.toLowerCase().includes('different')) || !knownHistory);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Migraine with neurological deficits (atypical or first-time): requires evaluation to rule out more serious conditions.',
      confidence: 0.8
    }
  },
  {
    id: 'NEURO-9',
    name: 'Vertigo with Neurological Symptoms',
    category: 'Neurological',
    weight: 6,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('vertigo')) && 
        (input.symptoms.some(s => 
          s.toLowerCase().includes('double vision') || 
          s.toLowerCase().includes('diplopia') || 
          s.toLowerCase().includes('dysarthria') || 
          s.toLowerCase().includes('ataxia') || 
          s.toLowerCase().includes('weakness')
        ) || 
        input.flags?.includes('central_vertigo'));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' }
      ],
      explain: 'Vertigo with neurological symptoms: concerning for central cause. Requires neurological evaluation.',
      confidence: 0.82
    }
  },
  {
    id: 'NEURO-10',
    name: 'Uncomplicated Syncope in Young, Healthy Patient',
    category: 'Neurological',
    weight: 4,
    match: (input) => {
      const age = input.age || 0;
      return input.symptoms.some(s => s.toLowerCase().includes('syncope') || s.toLowerCase().includes('fainting')) && 
        age < 40 && 
        !(input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('heart') || 
          h.toLowerCase().includes('cardiac') || 
          h.toLowerCase().includes('epilepsy')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Uncomplicated syncope in young, healthy patient: likely vasovagal. Requires standard evaluation.',
      confidence: 0.75
    }
  },
  {
    id: 'NEURO-11',
    name: 'Chronic Stable Headache',
    category: 'Neurological',
    weight: 3,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('headache') && (s.toLowerCase().includes('chronic') || s.toLowerCase().includes('recurring'))) && 
        !input.symptoms.some(s => 
          s.toLowerCase().includes('worst') || 
          s.toLowerCase().includes('new') || 
          s.toLowerCase().includes('neurological') || 
          s.toLowerCase().includes('fever')
        );
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 4,
      suggestedDepartments: [
        { name: 'General Medicine', type: 'primary' }
      ],
      explain: 'Chronic stable headache pattern: routine evaluation for management.',
      confidence: 0.7
    }
  },
  {
    id: 'NEURO-12',
    name: 'Mild Concussion',
    category: 'Neurological',
    weight: 4,
    match: (input) => {
      return input.symptoms.some(s => s.toLowerCase().includes('concussion') || (s.toLowerCase().includes('head') && s.toLowerCase().includes('injury'))) && 
        (input.vitals?.gcs === undefined || input.vitals.gcs >= 15) && 
        !input.symptoms.some(s => s.toLowerCase().includes('loss of consciousness') || s.toLowerCase().includes('vomiting'));
    },
    result: {
      triageScore: 'Standard',
      priorityLevel: 3,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' }
      ],
      explain: 'Mild concussion with normal GCS, no loss of consciousness: requires standard evaluation and concussion precautions.',
      confidence: 0.8
    }
  },
  {
    id: 'NEURO-13',
    name: 'Suspected Bacterial Meningitis',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Classic triad: fever, neck stiffness, altered mental status
      const fever = input.symptoms.some(s => s.toLowerCase().includes('fever')) || 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0);
      
      const meningealSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('neck stiffness') || 
        s.toLowerCase().includes('nuchal rigidity') ||
        s.toLowerCase().includes('meningismus') ||
        s.toLowerCase().includes('kernig') ||
        s.toLowerCase().includes('brudzinski')
      ) || input.flags?.includes('meningeal_signs');
      
      const alteredMental = input.symptoms.some(s => 
        s.toLowerCase().includes('altered mental') || 
        s.toLowerCase().includes('confusion') ||
        s.toLowerCase().includes('lethargy')
      ) || (input.vitals?.gcs !== undefined && input.vitals.gcs < 15);
      
      // Direct mention
      const meningitisFlag = 
        input.flags?.includes('meningitis') || 
        input.symptoms.some(s => s.toLowerCase().includes('meningitis'));
      
      // Additional concerning signs
      const concerningSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('photophobia') || 
        s.toLowerCase().includes('purpuric') ||
        s.toLowerCase().includes('rash') ||
        s.toLowerCase().includes('petechiae')
      );
      
      return meningitisFlag || 
        (fever && meningealSigns) || 
        (fever && alteredMental && (meningealSigns || concerningSigns));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' },
        { name: 'Neurology', type: 'tertiary' }
      ],
      explain: 'Suspected bacterial meningitis: fever with meningeal signs or altered mental status. Immediate antibiotics and LP required after imaging if indicated.',
      confidence: 0.92
    }
  },
  // Adding LVO stroke rule
  {
    id: 'NEURO-14',
    name: 'Suspected Large Vessel Occlusion Stroke',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Signs of severe neurological deficit suggesting LVO
      const lvoSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('gaze deviation') || 
        (s.toLowerCase().includes('severe') && s.toLowerCase().includes('deficit')) ||
        (s.toLowerCase().includes('multiple') && s.toLowerCase().includes('deficit')) ||
        s.toLowerCase().includes('aphasia') ||
        s.toLowerCase().includes('neglect')
      );
      
      // High NIHSS or specific flag
      const severityFlag = 
        input.flags?.includes('lvo') || 
        input.flags?.includes('high_nihss') || 
        input.flags?.includes('severe_stroke');
      
      // Time window for endovascular intervention is longer
      const timeFlag = 
        input.flags?.includes('time_sensitive') || 
        input.flags?.includes('onset_under_24h');
      
      return (lvoSigns || severityFlag) && timeFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' },
        { name: 'Interventional Radiology', type: 'tertiary' }
      ],
      explain: 'Suspected large vessel occlusion stroke: severe deficits within intervention window. Immediate CTA and thrombectomy evaluation required.',
      confidence: 0.95
    }
  },
  // Adding Refractory Status Epilepticus rule
  {
    id: 'NEURO-15',
    name: 'Refractory Status Epilepticus',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // Ongoing seizure activity despite initial treatment
      const refractoryStatus = input.symptoms.some(s => 
        (s.toLowerCase().includes('status epilepticus') && s.toLowerCase().includes('refractory')) ||
        (s.toLowerCase().includes('seizure') && s.toLowerCase().includes('not responding')) ||
        (s.toLowerCase().includes('seizure') && s.toLowerCase().includes('continuing')) ||
        (s.toLowerCase().includes('seizure') && s.toLowerCase().includes('multiple medications'))
      );
      
      // Specific flags for refractory status
      const refractoryFlag = 
        input.flags?.includes('refractory_status') || 
        input.flags?.includes('persistent_seizure') ||
        input.flags?.includes('multiple_benzo');
      
      return refractoryStatus || refractoryFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurology', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Refractory status epilepticus: ongoing seizure activity despite initial treatment. Requires immediate RSI, continuous EEG monitoring, and ICU admission.',
      confidence: 0.98
    }
  },
  // Adding Severe TBI with Herniation Signs rule
  {
    id: 'NEURO-16',
    name: 'Severe TBI with Herniation Signs',
    category: 'Neurological',
    weight: 10,
    match: (input) => {
      // History of trauma and decreased consciousness
      const tbiHistory = input.symptoms.some(s => 
        (s.toLowerCase().includes('head') && s.toLowerCase().includes('trauma')) ||
        (s.toLowerCase().includes('tbi')) ||
        (s.toLowerCase().includes('head injury'))
      );
      
      // Decreased GCS
      const decreasedGCS = 
        (input.vitals?.gcs !== undefined && input.vitals.gcs < 9) || 
        input.symptoms.some(s => s.toLowerCase().includes('unresponsive'));
      
      // Classic herniation signs
      const herniationSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('pupil') && (
          s.toLowerCase().includes('fixed') || 
          s.toLowerCase().includes('dilated') || 
          s.toLowerCase().includes('asymmetric')
        ) ||
        s.toLowerCase().includes('decorticate') ||
        s.toLowerCase().includes('decerebrate') ||
        s.toLowerCase().includes('cushing') ||
        s.toLowerCase().includes('herniation') ||
        s.toLowerCase().includes('midline shift')
      );
      
      // Specific flags for critical TBI
      const criticalTbiFlag = 
        input.flags?.includes('herniation') || 
        input.flags?.includes('midline_shift') ||
        input.flags?.includes('severe_tbi') ||
        input.flags?.includes('fixed_pupil');
      
      return (tbiHistory && (decreasedGCS || herniationSigns)) || criticalTbiFlag;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Severe traumatic brain injury with potential herniation signs. Immediate neurosurgical evaluation, airway management, and osmotic therapy required.',
      confidence: 0.99
    }
  },
  // Adding Epiglottitis rule
  {
    id: 'RESP-12',
    name: 'Acute Epiglottitis/Supraglottic Airway Obstruction',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      // Classic "tripod position" and other concerning signs
      const concerningSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('epiglottitis') || 
        s.toLowerCase().includes('tripod position') ||
        s.toLowerCase().includes('drooling') ||
        s.toLowerCase().includes('muffled voice') ||
        s.toLowerCase().includes('hot potato voice') ||
        s.toLowerCase().includes('unable to swallow') ||
        (s.toLowerCase().includes('throat') && s.toLowerCase().includes('severe'))
      );
      
      // Respiratory distress signs
      const respiratoryDistress = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('stridor') || 
          s.toLowerCase().includes('difficulty breathing')
        ) || 
        input.flags?.includes('stridor') || 
        input.flags?.includes('respiratory_distress');
      
      // Direct flags
      const epiglottitisFlag = 
        input.flags?.includes('epiglottitis') || 
        input.flags?.includes('supraglottic_obstruction');
      
      return epiglottitisFlag || (concerningSigns && respiratoryDistress);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Anesthesiology', type: 'secondary' },
        { name: 'ENT', type: 'tertiary' }
      ],
      explain: 'Suspected epiglottitis/supraglottic airway obstruction. Do NOT examine throat. Immediate airway specialist consultation and controlled airway management required.',
      confidence: 0.95
    }
  },
  // Adding Carbon Monoxide Poisoning rule
  {
    id: 'RESP-13',
    name: 'Carbon Monoxide Poisoning',
    category: 'Respiratory',
    weight: 9,
    match: (input) => {
      // Direct mention
      const directMention = input.symptoms.some(s => 
        s.toLowerCase().includes('carbon monoxide') || 
        s.toLowerCase().includes('co poisoning')
      );
      
      // Exposure history
      const exposureHistory = input.symptoms.some(s => 
        (s.toLowerCase().includes('exposure') && s.toLowerCase().includes('smoke')) || 
        (s.toLowerCase().includes('fire') && s.toLowerCase().includes('enclosed')) ||
        s.toLowerCase().includes('heater') ||
        s.toLowerCase().includes('generator') ||
        s.toLowerCase().includes('exhaust')
      );
      
      // Classic symptoms
      const classicSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('headache') ||
        s.toLowerCase().includes('dizziness') ||
        s.toLowerCase().includes('confusion') ||
        s.toLowerCase().includes('nausea') ||
        s.toLowerCase().includes('cherry red')
      );
      
      // Multiple victims with similar symptoms is highly suspicious
      const multipleVictims = input.flags?.includes('multiple_victims');
      
      // Elevated COHb level if available
      const elevatedCOHb = input.flags?.includes('elevated_cohb');
      
      // Severe presentations
      const severeSymptoms = 
        (input.vitals?.gcs !== undefined && input.vitals.gcs < 15) || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('unconscious') || 
          s.toLowerCase().includes('seizure')
        );
      
      return directMention || elevatedCOHb || 
        ((exposureHistory || multipleVictims) && classicSymptoms) ||
        (exposureHistory && severeSymptoms);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Suspected carbon monoxide poisoning. Requires immediate 100% oxygen, consideration for hyperbaric oxygen therapy, and screening of cohabitants.',
      confidence: 0.9
    }
  },
  // Adding Foreign Body Airway Obstruction rule
  {
    id: 'RESP-14',
    name: 'Foreign Body Airway Obstruction',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      // Direct mention
      const directMention = input.symptoms.some(s => 
        s.toLowerCase().includes('choking') || 
        (s.toLowerCase().includes('foreign body') && s.toLowerCase().includes('airway')) ||
        (s.toLowerCase().includes('object') && s.toLowerCase().includes('airway'))
      );
      
      // Complete vs partial obstruction
      const completeObstruction = input.symptoms.some(s => 
        (s.toLowerCase().includes('unable') && s.toLowerCase().includes('speak')) ||
        (s.toLowerCase().includes('unable') && s.toLowerCase().includes('breathe')) ||
        s.toLowerCase().includes('silent') ||
        s.toLowerCase().includes('no air movement')
      );
      
      const partialObstruction = input.symptoms.some(s => 
        s.toLowerCase().includes('stridor') ||
        s.toLowerCase().includes('wheezing') ||
        (s.toLowerCase().includes('difficulty') && s.toLowerCase().includes('breathing'))
      );
      
      // Universal choking sign
      const chokingSign = input.symptoms.some(s => 
        s.toLowerCase().includes('clutching throat') ||
        s.toLowerCase().includes('universal choking sign')
      );
      
      // Flag for airway obstruction
      const obstructionFlag = 
        input.flags?.includes('airway_obstruction') || 
        input.flags?.includes('choking') || 
        input.flags?.includes('foreign_body');
      
      return obstructionFlag || directMention || chokingSign || completeObstruction || 
        (partialObstruction && input.symptoms.some(s => s.toLowerCase().includes('foreign')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'ENT', type: 'secondary' }
      ],
      explain: 'Foreign body airway obstruction. Complete obstruction requires immediate Heimlich maneuver/back blows; partial obstruction requires urgent evaluation.',
      confidence: 0.98
    }
  },
  // Adding Massive Hemoptysis rule
  {
    id: 'RESP-15',
    name: 'Massive Hemoptysis',
    category: 'Respiratory',
    weight: 10,
    match: (input) => {
      // Direct mention of massive/severe bleeding
      const massiveHemoptysis = input.symptoms.some(s => 
        (s.toLowerCase().includes('hemoptysis') && (
          s.toLowerCase().includes('massive') || 
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('copious') ||
          s.toLowerCase().includes('large amount')
        )) ||
        (s.toLowerCase().includes('coughing') && s.toLowerCase().includes('blood') && (
          s.toLowerCase().includes('massive') || 
          s.toLowerCase().includes('severe') ||
          s.toLowerCase().includes('large amount')
        ))
      );
      
      // Quantified amount (>100mL in 24h is traditionally considered massive)
      const quantifiedAmount = input.symptoms.some(s => 
        (s.toLowerCase().includes('hemoptysis') || (s.toLowerCase().includes('coughing') && s.toLowerCase().includes('blood'))) && 
        (s.toLowerCase().includes('100') || s.toLowerCase().includes('cup') || s.toLowerCase().includes('>50'))
      );
      
      // Hemodynamic compromise or respiratory distress with hemoptysis
      const hemoptysisWithDistress = 
        input.symptoms.some(s => s.toLowerCase().includes('hemoptysis') || (s.toLowerCase().includes('coughing') && s.toLowerCase().includes('blood'))) && 
        ((input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 100) || 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 110) ||
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 92) ||
        input.symptoms.some(s => s.toLowerCase().includes('respiratory distress') || s.toLowerCase().includes('shortness of breath')));
      
      // Flag for massive hemoptysis
      const massiveFlag = input.flags?.includes('massive_hemoptysis');
      
      return massiveFlag || massiveHemoptysis || quantifiedAmount || hemoptysisWithDistress;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' },
        { name: 'Interventional Radiology', type: 'tertiary' }
      ],
      explain: 'Massive hemoptysis: life-threatening respiratory emergency. Requires immediate airway protection, bleeding site localization, and consideration for bronchial artery embolization.',
      confidence: 0.95
    }
  },
  // --- Infectious Diseases/Sepsis Rules ---
  {
    id: 'INFX-1',
    name: 'Septic Shock',
    category: 'Infectious',
    weight: 10,
    match: (input) => {
      // Evidence of infection
      const infectionSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('infection') ||
        s.toLowerCase().includes('sepsis') ||
        s.toLowerCase().includes('septic') ||
        s.toLowerCase().includes('fever') ||
        s.toLowerCase().includes('pneumonia') ||
        s.toLowerCase().includes('urinary tract infection') ||
        s.toLowerCase().includes('meningitis') ||
        s.toLowerCase().includes('cellulitis') ||
        s.toLowerCase().includes('abscess')
      ) || input.flags?.includes('infection');
      
      // Hypotension despite fluid resuscitation or requiring vasopressors
      const shockState = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        input.flags?.includes('hypotension') ||
        input.flags?.includes('vasopressors') ||
        input.flags?.includes('refractory_hypotension') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('hypotension') || 
          s.toLowerCase().includes('shock') ||
          s.toLowerCase().includes('vasopressor')
        );
      
      // Lactate > 2 mmol/L indicates tissue hypoperfusion
      const elevatedLactate = 
        input.flags?.includes('elevated_lactate') || 
        input.flags?.includes('lactate_over_2') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('lactate') && s.toLowerCase().includes('elevated')) ||
          (s.toLowerCase().includes('lactate') && s.toLowerCase().includes('>2'))
        );
      
      // Organ dysfunction 
      const organDysfunction = 
        input.flags?.includes('organ_dysfunction') || 
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental status') ||
          s.toLowerCase().includes('oliguria') ||
          s.toLowerCase().includes('acute kidney injury') ||
          s.toLowerCase().includes('elevated creatinine') ||
          s.toLowerCase().includes('coagulopathy') ||
          s.toLowerCase().includes('thrombocytopenia') ||
          s.toLowerCase().includes('hypoxemia') ||
          s.toLowerCase().includes('ileus')
        );
      
      // Direct mention of septic shock
      const septicShockMention = 
        input.flags?.includes('septic_shock') ||
        input.symptoms.some(s => s.toLowerCase().includes('septic shock'));
      
      return septicShockMention || (infectionSigns && shockState && (elevatedLactate || organDysfunction));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Septic shock: life-threatening condition requiring immediate fluid resuscitation, early antibiotics, vasopressors, and source control. Activate sepsis protocol immediately.',
      confidence: 0.95
    }
  },
  {
    id: 'INFX-2',
    name: 'Severe Sepsis',
    category: 'Infectious',
    weight: 9,
    match: (input) => {
      // Evidence of infection
      const infectionSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('infection') ||
        s.toLowerCase().includes('sepsis') ||
        s.toLowerCase().includes('fever') ||
        s.toLowerCase().includes('pneumonia') ||
        s.toLowerCase().includes('urinary tract infection') ||
        s.toLowerCase().includes('meningitis') ||
        s.toLowerCase().includes('cellulitis') ||
        s.toLowerCase().includes('abscess')
      ) || input.flags?.includes('infection');
      
      // SIRS criteria: 2+ of the following
      const highTemp = (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      const lowTemp = (input.vitals?.temperature !== undefined && input.vitals.temperature < 36.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('hypothermia'));
      
      const tachycardia = (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 90) || 
        input.symptoms.some(s => s.toLowerCase().includes('tachycardia'));
      
      const tachypnea = (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 20) || 
        input.symptoms.some(s => s.toLowerCase().includes('rapid breathing') || s.toLowerCase().includes('tachypnea'));
      
      const abnormalWBC = input.flags?.includes('abnormal_wbc') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('elevated wbc') || 
          s.toLowerCase().includes('leukocytosis') ||
          s.toLowerCase().includes('leukopenia') ||
          s.toLowerCase().includes('left shift')
        );
      
      // Count SIRS criteria
      const sirsCount = [highTemp || lowTemp, tachycardia, tachypnea, abnormalWBC].filter(Boolean).length;
      
      // Organ dysfunction signs
      const organDysfunction = 
        input.flags?.includes('organ_dysfunction') || 
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental status') ||
          s.toLowerCase().includes('oliguria') ||
          s.toLowerCase().includes('acute kidney injury') ||
          s.toLowerCase().includes('elevated creatinine') ||
          s.toLowerCase().includes('coagulopathy') ||
          s.toLowerCase().includes('thrombocytopenia') ||
          s.toLowerCase().includes('hypoxemia') ||
          s.toLowerCase().includes('ileus')
        );
      
      // Direct mention of severe sepsis
      const severeSepsisMention = 
        input.flags?.includes('severe_sepsis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe sepsis') || 
          (s.toLowerCase().includes('sepsis') && s.toLowerCase().includes('organ dysfunction'))
        );
      
      // qSOFA criteria (2+ indicates high risk)
      const alteredMental = 
        (input.vitals?.gcs !== undefined && input.vitals.gcs < 15) ||
        input.symptoms.some(s => s.toLowerCase().includes('altered mental') || s.toLowerCase().includes('confusion'));
      
      const hypotension = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 100) ||
        input.symptoms.some(s => s.toLowerCase().includes('hypotension'));
      
      const qsofaCount = [alteredMental, hypotension, tachypnea].filter(Boolean).length;
      
      return severeSepsisMention || 
        // Either traditional severe sepsis definition
        (infectionSigns && sirsCount >= 2 && organDysfunction) ||
        // Or qSOFA approach
        (infectionSigns && qsofaCount >= 2);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' }
      ],
      explain: 'Severe sepsis: infection with organ dysfunction. Requires immediate fluid resuscitation, antibiotics within 1 hour, and serial lactate monitoring.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-3',
    name: 'Sepsis (Without Shock or Organ Dysfunction)',
    category: 'Infectious',
    weight: 7,
    match: (input) => {
      // Evidence of infection
      const infectionSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('infection') ||
        s.toLowerCase().includes('sepsis') ||
        s.toLowerCase().includes('fever') ||
        s.toLowerCase().includes('pneumonia') ||
        s.toLowerCase().includes('urinary tract infection') ||
        s.toLowerCase().includes('meningitis') ||
        s.toLowerCase().includes('cellulitis') ||
        s.toLowerCase().includes('abscess')
      ) || input.flags?.includes('infection');
      
      // SIRS criteria: 2+ of the following
      const highTemp = (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      const lowTemp = (input.vitals?.temperature !== undefined && input.vitals.temperature < 36.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('hypothermia'));
      
      const tachycardia = (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 90) || 
        input.symptoms.some(s => s.toLowerCase().includes('tachycardia'));
      
      const tachypnea = (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 20) || 
        input.symptoms.some(s => s.toLowerCase().includes('rapid breathing') || s.toLowerCase().includes('tachypnea'));
      
      const abnormalWBC = input.flags?.includes('abnormal_wbc') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('elevated wbc') || 
          s.toLowerCase().includes('leukocytosis') ||
          s.toLowerCase().includes('leukopenia') ||
          s.toLowerCase().includes('left shift')
        );
      
      // Count SIRS criteria
      const sirsCount = [highTemp || lowTemp, tachycardia, tachypnea, abnormalWBC].filter(Boolean).length;
      
      // Organ dysfunction signs (used to exclude severe sepsis)
      const organDysfunction = 
        input.flags?.includes('organ_dysfunction') || 
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental status') ||
          s.toLowerCase().includes('oliguria') ||
          s.toLowerCase().includes('acute kidney injury') ||
          s.toLowerCase().includes('elevated creatinine') ||
          s.toLowerCase().includes('coagulopathy') ||
          s.toLowerCase().includes('thrombocytopenia') ||
          s.toLowerCase().includes('hypoxemia') ||
          s.toLowerCase().includes('ileus')
        );
      
      // Shock signs (used to exclude septic shock)
      const shockSigns = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        input.flags?.includes('hypotension') ||
        input.flags?.includes('shock') ||
        input.flags?.includes('vasopressors') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('shock') || 
          s.toLowerCase().includes('hypotension')
        );
      
      // Direct mention of sepsis
      const sepsisMention = 
        input.flags?.includes('sepsis') ||
        input.symptoms.some(s => s.toLowerCase().includes('sepsis'));
      
      return (sepsisMention || (infectionSigns && sirsCount >= 2)) && 
        !organDysfunction && !shockSigns &&
        // Also exclude both severe sepsis and septic shock explicit mentions
        !input.flags?.includes('severe_sepsis') &&
        !input.flags?.includes('septic_shock') &&
        !input.symptoms.some(s => 
          s.toLowerCase().includes('severe sepsis') || 
          s.toLowerCase().includes('septic shock')
        );
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' }
      ],
      explain: 'Sepsis without shock or organ dysfunction. Requires prompt evaluation, fluid resuscitation, blood cultures, and antibiotics within 3 hours.',
      confidence: 0.85
    }
  },
  {
    id: 'INFX-4',
    name: 'Neutropenic Fever',
    category: 'Infectious',
    weight: 8,
    match: (input) => {
      // Fever
      const fever = (input.vitals?.temperature !== undefined && input.vitals.temperature >= 38.3) || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') || 
          s.toLowerCase().includes('febrile')
        );
      
      // Neutropenia history or flag
      const neutropenia = 
        input.flags?.includes('neutropenia') ||
        input.flags?.includes('immunocompromised') ||
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('neutropenia') ||
          h.toLowerCase().includes('chemotherapy') ||
          h.toLowerCase().includes('transplant') ||
          h.toLowerCase().includes('leukemia') ||
          h.toLowerCase().includes('lymphoma')
        ) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('neutropenia') ||
          s.toLowerCase().includes('low anc') ||
          s.toLowerCase().includes('low neutrophil') ||
          (s.toLowerCase().includes('chemo') && s.toLowerCase().includes('receive'))
        );
      
      // Direct mention of neutropenic fever
      const neutropenicFeverMention = 
        input.flags?.includes('neutropenic_fever') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('neutropenic fever') || 
          (s.toLowerCase().includes('febrile') && s.toLowerCase().includes('neutropenia'))
        );
      
      return neutropenicFeverMention || (fever && neutropenia);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Oncology', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Neutropenic fever: medical emergency in immunocompromised patients. Requires immediate blood cultures and broad-spectrum antibiotics within 1 hour of presentation.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-5',
    name: 'Severe COVID-19',
    category: 'Infectious',
    weight: 8,
    match: (input) => {
      // COVID-19 diagnosis or symptoms
      const covidConfirmed = 
        input.flags?.includes('covid_positive') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('covid positive') ||
          s.toLowerCase().includes('confirmed covid')
        );
      
      const covidSuspected = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('covid') ||
          (s.toLowerCase().includes('fever') && 
            (s.toLowerCase().includes('cough') || 
             s.toLowerCase().includes('shortness of breath') || 
             s.toLowerCase().includes('loss of taste') || 
             s.toLowerCase().includes('loss of smell')))
        );
      
      // Severe respiratory symptoms
      const severeRespiratory = 
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 30) ||
        input.flags?.includes('respiratory_distress') ||
        input.flags?.includes('oxygen_requirement') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe shortness of breath') ||
          s.toLowerCase().includes('respiratory distress') ||
          s.toLowerCase().includes('oxygen requirement') ||
          s.toLowerCase().includes('difficulty breathing')
        );
      
      // Lung infiltrates
      const lungInfiltrates =
        input.flags?.includes('lung_infiltrates') ||
        input.flags?.includes('pneumonia') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('bilateral infiltrates') ||
          s.toLowerCase().includes('pneumonia') ||
          s.toLowerCase().includes('ground glass')
        );
      
      // Critical COVID markers
      const criticalMarkers =
        input.flags?.includes('cytokine_storm') ||
        input.flags?.includes('elevated_crp') ||
        input.flags?.includes('elevated_d_dimer') ||
        input.flags?.includes('elevated_ferritin') ||
        input.flags?.includes('elevated_ldh') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('cytokine storm') ||
          s.toLowerCase().includes('elevated inflammatory markers')
        );
      
      // Explicit mention of severe COVID
      const severeCovid =
        input.flags?.includes('severe_covid') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe covid') ||
          s.toLowerCase().includes('covid pneumonia')
        );
      
      return severeCovid || 
        ((covidConfirmed || covidSuspected) && 
          (severeRespiratory || lungInfiltrates || criticalMarkers));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Pulmonology', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Severe COVID-19 with respiratory compromise or critical inflammatory markers. Requires oxygen therapy, consideration of steroids, antivirals, and monitoring for deterioration.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-6',
    name: 'Bacterial Meningitis',
    category: 'Infectious',
    weight: 10,
    match: (input) => {
      // Classic meningitis symptoms
      const meningealSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('neck stiffness') || 
        s.toLowerCase().includes('nuchal rigidity') ||
        s.toLowerCase().includes('photophobia') ||
        s.toLowerCase().includes('meningeal')
      );
      
      // Fever
      const fever = (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      // Altered mental status
      const alteredMental = 
        (input.vitals?.gcs !== undefined && input.vitals.gcs < 15) ||
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental') ||
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('lethargy') ||
          s.toLowerCase().includes('coma') ||
          s.toLowerCase().includes('drowsy')
        );
      
      // Headache
      const headache = input.symptoms.some(s => s.toLowerCase().includes('headache'));
      
      // Specific meningitis flags
      const meningitisMention = 
        input.flags?.includes('meningitis') ||
        input.flags?.includes('csf_abnormal') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('meningitis') ||
          s.toLowerCase().includes('csf abnormal')
        );
      
      // Classic triad is fever, neck stiffness, and altered mental status
      const classicTriad = fever && meningealSigns && alteredMental;
      
      // Alternative presentation could be fever + headache + either meningeal signs or altered mental status
      const alternativePresentation = fever && headache && (meningealSigns || alteredMental);
      
      return meningitisMention || classicTriad || alternativePresentation;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' },
        { name: 'Neurology', type: 'tertiary' }
      ],
      explain: 'Suspected bacterial meningitis: medical emergency requiring immediate antibiotics after blood cultures (within 30 minutes). Consider adjunctive dexamethasone and neurology consult.',
      confidence: 0.95
    }
  },
  {
    id: 'INFX-7',
    name: 'Necrotizing Fasciitis',
    category: 'Infectious',
    weight: 9,
    match: (input) => {
      // Severe pain out of proportion to physical findings
      const severePain = input.symptoms.some(s => 
        (s.toLowerCase().includes('pain') && s.toLowerCase().includes('severe')) ||
        (s.toLowerCase().includes('pain') && s.toLowerCase().includes('extreme')) ||
        (s.toLowerCase().includes('pain') && s.toLowerCase().includes('out of proportion')) ||
        s.toLowerCase().includes('disproportionate pain')
      );
      
      // Skin findings
      const skinChanges = input.symptoms.some(s => 
        s.toLowerCase().includes('erythema') ||
        s.toLowerCase().includes('swelling') ||
        s.toLowerCase().includes('bullae') ||
        s.toLowerCase().includes('skin discoloration') ||
        s.toLowerCase().includes('rash') ||
        s.toLowerCase().includes('cellulitis') ||
        s.toLowerCase().includes('skin necrosis') ||
        s.toLowerCase().includes('purple') ||
        s.toLowerCase().includes('bruising')
      );
      
      // Systemic toxicity
      const systemicToxicity = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.5) || 
        input.flags?.includes('toxic_appearance') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') || 
          s.toLowerCase().includes('toxic appearance') ||
          s.toLowerCase().includes('tachycardia') ||
          s.toLowerCase().includes('tachypnea') ||
          s.toLowerCase().includes('hypotension')
        );
      
      // Direct mention
      const necrotizingMention = 
        input.flags?.includes('necrotizing_fasciitis') ||
        input.flags?.includes('flesh_eating_bacteria') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('necrotizing fasciitis') ||
          s.toLowerCase().includes('flesh eating')
        );
      
      return necrotizingMention || (severePain && skinChanges && systemicToxicity);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'General Surgery', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Suspected necrotizing fasciitis: surgical emergency requiring immediate broad-spectrum antibiotics and urgent surgical debridement. Mortality increases with delayed treatment.',
      confidence: 0.95
    }
  },
  {
    id: 'INFX-8',
    name: 'Toxic Shock Syndrome',
    category: 'Infectious',
    weight: 9,
    match: (input) => {
      // High fever
      const highFever = (input.vitals?.temperature !== undefined && input.vitals.temperature >= 39.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('high fever'));
      
      // Hypotension
      const hypotension = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        input.flags?.includes('hypotension') ||
        input.symptoms.some(s => s.toLowerCase().includes('hypotension'));
      
      // Rash
      const rash = input.symptoms.some(s => 
        s.toLowerCase().includes('rash') ||
        s.toLowerCase().includes('erythroderma') ||
        s.toLowerCase().includes('desquamation') ||
        s.toLowerCase().includes('skin peeling')
      );
      
      // Multi-system involvement
      const multiSystemInvolvement = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('vomiting') ||
          s.toLowerCase().includes('diarrhea') ||
          s.toLowerCase().includes('myalgia') ||
          s.toLowerCase().includes('muscle pain') ||
          s.toLowerCase().includes('mucous membrane') ||
          s.toLowerCase().includes('conjunctival') ||
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('liver') ||
          s.toLowerCase().includes('renal') ||
          s.toLowerCase().includes('organ dysfunction')
        );
      
      // Risk factors
      const riskFactors = 
        input.flags?.includes('tampon_use') ||
        input.flags?.includes('post_surgical') ||
        input.flags?.includes('skin_wound') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('tampon') ||
          s.toLowerCase().includes('menstruation') ||
          s.toLowerCase().includes('postpartum') ||
          s.toLowerCase().includes('wound') ||
          s.toLowerCase().includes('surgery')
        );
      
      // Direct mention
      const tssMention = 
        input.flags?.includes('toxic_shock') ||
        input.symptoms.some(s => s.toLowerCase().includes('toxic shock'));
      
      return tssMention || (highFever && hypotension && rash && multiSystemInvolvement) ||
        (highFever && rash && multiSystemInvolvement && riskFactors);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Suspected Toxic Shock Syndrome: remove foreign bodies/tampons, obtain cultures, start aggressive fluid resuscitation and broad-spectrum antibiotics. Critical care monitoring required.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-9',
    name: 'Infective Endocarditis',
    category: 'Infectious',
    weight: 8,
    match: (input) => {
      // Fever
      const fever = (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      // Heart murmur
      const heartMurmur = 
        input.flags?.includes('heart_murmur') ||
        input.symptoms.some(s => s.toLowerCase().includes('murmur'));
      
      // Vascular phenomena
      const vascularPhenomena = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('petechiae') ||
          s.toLowerCase().includes('splinter hemorrhages') ||
          s.toLowerCase().includes('janeway') ||
          s.toLowerCase().includes('osler') ||
          s.toLowerCase().includes('roth spots') ||
          s.toLowerCase().includes('embolic') ||
          s.toLowerCase().includes('stroke') ||
          s.toLowerCase().includes('glomerulonephritis')
        );
      
      // Risk factors
      const endocarditisRisk = 
        input.flags?.includes('ivdu') ||
        input.flags?.includes('iv_drug_use') ||
        input.flags?.includes('prosthetic_valve') ||
        input.flags?.includes('congenital_heart') ||
        input.flags?.includes('prior_endocarditis') ||
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('valve') ||
          h.toLowerCase().includes('congenital heart') ||
          h.toLowerCase().includes('endocarditis') ||
          h.toLowerCase().includes('rheumatic')
        ) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('iv drug') ||
          s.toLowerCase().includes('intravenous drug')
        );
      
      // Direct mention
      const endocarditisMention = 
        input.flags?.includes('endocarditis') ||
        input.flags?.includes('positive_blood_cultures') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('endocarditis') ||
          s.toLowerCase().includes('valve vegetation') ||
          s.toLowerCase().includes('positive blood cultures')
        );
      
      return endocarditisMention || 
        (fever && (heartMurmur || vascularPhenomena) && endocarditisRisk);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Cardiology', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Suspected infective endocarditis: obtain blood cultures (3 sets), echocardiogram, and start empiric antibiotics. Requires hospital admission and infectious disease consult.',
      confidence: 0.85
    }
  },
  {
    id: 'INFX-10',
    name: 'Severe Malaria',
    category: 'Infectious',
    weight: 9,
    match: (input) => {
      // Travel history
      const travelHistory = 
        input.flags?.includes('travel_malaria_endemic') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('travel') && 
            (s.toLowerCase().includes('africa') || 
             s.toLowerCase().includes('asia') || 
             s.toLowerCase().includes('south america') ||
             s.toLowerCase().includes('malaria')))
        );
      
      // Fever
      const fever = (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      // Severe manifestations
      const severeManifestation = 
        input.flags?.includes('altered_mental_status') ||
        input.flags?.includes('jaundice') ||
        input.flags?.includes('renal_failure') ||
        input.flags?.includes('respiratory_distress') ||
        input.flags?.includes('bleeding') ||
        input.flags?.includes('shock') ||
        input.flags?.includes('acidosis') ||
        input.flags?.includes('hypoglycemia') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental status') ||
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('seizure') ||
          s.toLowerCase().includes('jaundice') ||
          s.toLowerCase().includes('yellow skin') ||
          s.toLowerCase().includes('yellow eyes') ||
          s.toLowerCase().includes('dark urine') ||
          s.toLowerCase().includes('oliguria') ||
          s.toLowerCase().includes('anuria') ||
          s.toLowerCase().includes('respiratory distress') ||
          s.toLowerCase().includes('bleeding') ||
          s.toLowerCase().includes('shock') ||
          s.toLowerCase().includes('hypotension')
        );
      
      // Direct mention
      const malariaMention = 
        input.flags?.includes('malaria') ||
        input.flags?.includes('falciparum') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('malaria') ||
          s.toLowerCase().includes('plasmodium')
        );
      
      return (malariaMention && (severeManifestation || fever)) || 
        (travelHistory && fever && severeManifestation);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Suspected severe malaria: obtain immediate blood smears, start IV antimalarials without delay. Severe malaria is a medical emergency with high mortality if treatment is delayed.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-11',
    name: 'Acute HIV Infection',
    category: 'Infectious',
    weight: 6,
    match: (input) => {
      // Mononucleosis-like syndrome
      const monoLike = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('sore throat') ||
          s.toLowerCase().includes('rash') ||
          s.toLowerCase().includes('lymphadenopathy') ||
          s.toLowerCase().includes('swollen glands') ||
          s.toLowerCase().includes('myalgia') ||
          s.toLowerCase().includes('muscle pain') ||
          s.toLowerCase().includes('fatigue') ||
          s.toLowerCase().includes('headache')
        );
      
      // Risk factors
      const riskFactors = 
        input.flags?.includes('hiv_risk') ||
        input.flags?.includes('unprotected_sex') ||
        input.flags?.includes('msm') ||
        input.flags?.includes('ivdu') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('unprotected sex') ||
          s.toLowerCase().includes('new partner') ||
          s.toLowerCase().includes('iv drug use')
        );
      
      // Direct mention
      const hivMention = 
        input.flags?.includes('acute_hiv') ||
        input.flags?.includes('hiv_seroconversion') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('acute hiv') ||
          s.toLowerCase().includes('hiv seroconversion')
        );
      
      return hivMention || (monoLike && riskFactors);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' }
      ],
      explain: 'Suspected acute HIV infection: perform HIV RNA testing along with antibody testing. Early diagnosis improves outcomes and reduces transmission risk.',
      confidence: 0.8
    }
  },
  {
    id: 'INFX-12',
    name: 'Tetanus',
    category: 'Infectious',
    weight: 9,
    match: (input) => {
      // Tetanus symptoms
      const tetanusSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('lockjaw') ||
        s.toLowerCase().includes('trismus') ||
        s.toLowerCase().includes('muscle spasm') ||
        s.toLowerCase().includes('muscle stiffness') ||
        s.toLowerCase().includes('muscle rigidity') ||
        s.toLowerCase().includes('risus sardonicus') ||
        s.toLowerCase().includes('opisthotonos') ||
        s.toLowerCase().includes('difficulty swallowing') ||
        s.toLowerCase().includes('spasm when stimulated')
      );
      
      // Wound history
      const woundHistory = 
        input.flags?.includes('dirty_wound') ||
        input.flags?.includes('puncture_wound') ||
        input.flags?.includes('burn') ||
        input.flags?.includes('soil_contamination') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('wound') ||
          s.toLowerCase().includes('puncture') ||
          s.toLowerCase().includes('burn') ||
          s.toLowerCase().includes('soil') ||
          s.toLowerCase().includes('contaminated') ||
          s.toLowerCase().includes('rusty')
        );
      
      // Vaccination status
      const poorVaccination = 
        input.flags?.includes('no_tetanus_vaccine') ||
        input.flags?.includes('outdated_tetanus') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('tetanus') && s.toLowerCase().includes('vaccine') && 
           (s.toLowerCase().includes('no') || s.toLowerCase().includes('outdated') || s.toLowerCase().includes('old')))
        );
      
      // Direct mention
      const tetanusMention = 
        input.flags?.includes('tetanus') ||
        input.symptoms.some(s => s.toLowerCase().includes('tetanus'));
      
      return tetanusMention || (tetanusSymptoms && woundHistory) || 
        (tetanusSymptoms && poorVaccination);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Suspected tetanus: secure airway, administer tetanus immunoglobulin, metronidazole, muscle relaxants, and provide supportive care in ICU. Tetanus is a life-threatening emergency.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-13',
    name: 'Orbital/Periorbital Cellulitis',
    category: 'Infectious',
    weight: 8,
    match: (input) => {
      // Periorbital symptoms
      const periorbitalSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('eye swelling') ||
        s.toLowerCase().includes('eyelid swelling') ||
        s.toLowerCase().includes('periorbital swelling') ||
        s.toLowerCase().includes('orbital swelling') ||
        s.toLowerCase().includes('eye redness') ||
        s.toLowerCase().includes('eyelid redness') ||
        s.toLowerCase().includes('periorbital pain')
      );
      
      // Orbital symptoms (more concerning)
      const orbitalSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('proptosis') ||
        s.toLowerCase().includes('eye protrusion') ||
        s.toLowerCase().includes('diplopia') ||
        s.toLowerCase().includes('double vision') ||
        s.toLowerCase().includes('ophthalmoplegia') ||
        s.toLowerCase().includes('vision loss') ||
        s.toLowerCase().includes('eye pain with movement') ||
        s.toLowerCase().includes('limited eye movement')
      );
      
      // Fever/systemic symptoms
      const systemicSymptoms = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('malaise')
        );
      
      // Risk factors
      const riskFactors = input.symptoms.some(s => 
        s.toLowerCase().includes('sinusitis') ||
        s.toLowerCase().includes('sinus infection') ||
        s.toLowerCase().includes('dental infection') ||
        s.toLowerCase().includes('facial trauma') ||
        s.toLowerCase().includes('insect bite')
      );
      
      // Direct mention
      const cellulitisFlag = 
        input.flags?.includes('orbital_cellulitis') ||
        input.flags?.includes('periorbital_cellulitis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('orbital cellulitis') ||
          s.toLowerCase().includes('periorbital cellulitis')
        );
      
      // Orbital cellulitis is more urgent than periorbital
      if (cellulitisFlag || (orbitalSigns && (periorbitalSigns || systemicSymptoms))) {
        return true; // Orbital cellulitis
      }
      
      return periorbitalSigns && (systemicSymptoms || riskFactors);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Suspected orbital/periorbital cellulitis: requires urgent ophthalmology consultation, broad-spectrum antibiotics, and possible surgical drainage. Orbital cellulitis can lead to blindness or intracranial spread.',
      confidence: 0.9
    }
  },
  {
    id: 'INFX-14',
    name: 'Acute Epiglottitis',
    category: 'Infectious',
    weight: 10,
    match: (input) => {
      // Classic symptoms ("4 Ds")
      const classicSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('dysphagia') ||
        s.toLowerCase().includes('drooling') ||
        s.toLowerCase().includes('difficulty swallowing') ||
        s.toLowerCase().includes('voice change') ||
        s.toLowerCase().includes('muffled voice') ||
        s.toLowerCase().includes('hoarse voice') ||
        s.toLowerCase().includes('stridor') ||
        s.toLowerCase().includes('sore throat')
      );
      
      // Toxic appearance/fever
      const toxicAppearance =
        (input.vitals?.temperature !== undefined && input.vitals.temperature >= 38.5) || 
        input.flags?.includes('toxic_appearance') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('toxic') ||
          s.toLowerCase().includes('ill-appearing')
        );
      
      // Sitting forward (tripod position)
      const tripodPosition = input.symptoms.some(s => 
        s.toLowerCase().includes('tripod') ||
        s.toLowerCase().includes('sitting forward') ||
        s.toLowerCase().includes('leaning forward')
      );
      
      // Direct mention
      const epiglottitisMention = 
        input.flags?.includes('epiglottitis') ||
        input.symptoms.some(s => s.toLowerCase().includes('epiglottitis'));
      
      return epiglottitisMention || 
        (classicSymptoms && toxicAppearance) ||
        (classicSymptoms && tripodPosition);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Otolaryngology', type: 'secondary' },
        { name: 'Anesthesiology', type: 'tertiary' }
      ],
      explain: 'Suspected acute epiglottitis: DO NOT examine throat or attempt intubation except in controlled OR setting. Immediate airway team activation required.',
      confidence: 0.95
    }
  },
  {
    id: 'INFX-15',
    name: 'Tuberculosis (Active)',
    category: 'Infectious',
    weight: 7,
    match: (input) => {
      // Classic TB symptoms
      const classicSymptoms = 
        input.symptoms.some(s => 
          (s.toLowerCase().includes('cough') && s.toLowerCase().includes('weeks')) ||
          (s.toLowerCase().includes('cough') && s.toLowerCase().includes('blood')) ||
          s.toLowerCase().includes('hemoptysis') ||
          s.toLowerCase().includes('night sweats') ||
          s.toLowerCase().includes('weight loss') ||
          (s.toLowerCase().includes('fever') && s.toLowerCase().includes('night'))
        );
      
      // Risk factors
      const riskFactors =
        input.flags?.includes('tb_exposure') ||
        input.flags?.includes('hiv_positive') ||
        input.flags?.includes('immunocompromised') ||
        input.flags?.includes('prison') ||
        input.flags?.includes('homeless') ||
        input.flags?.includes('endemic_area') ||
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('hiv') ||
          h.toLowerCase().includes('transplant') ||
          h.toLowerCase().includes('immunosuppression')
        ) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('tb exposure') ||
          s.toLowerCase().includes('prison') ||
          s.toLowerCase().includes('homeless') ||
          (s.toLowerCase().includes('travel') && 
            (s.toLowerCase().includes('asia') || 
             s.toLowerCase().includes('africa') || 
             s.toLowerCase().includes('eastern europe')))
        );
      
      // Direct mention or confirmed TB
      const tbMention = 
        input.flags?.includes('tb_positive') ||
        input.flags?.includes('positive_afb') ||
        input.flags?.includes('active_tb') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('active tuberculosis') ||
          s.toLowerCase().includes('positive afb') ||
          s.toLowerCase().includes('positive igra')
        );
      
      return tbMention || (classicSymptoms && riskFactors);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Infectious Disease', type: 'secondary' },
        { name: 'Pulmonology', type: 'tertiary' }
      ],
      explain: 'Suspected active tuberculosis: implement airborne isolation immediately, obtain sputum for AFB, chest imaging, and consult infectious disease. Public health notification required.',
      confidence: 0.85
    }
  },
  {
    id: 'INFX-16',
    name: 'Brain Abscess',
    category: 'Infectious',
    weight: 9,
    match: (input) => {
      // Neurological symptoms
      const neuroSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('headache') ||
        s.toLowerCase().includes('seizure') ||
        s.toLowerCase().includes('focal deficit') ||
        s.toLowerCase().includes('weakness') ||
        s.toLowerCase().includes('numbness') ||
        s.toLowerCase().includes('vision change') ||
        s.toLowerCase().includes('speech') ||
        s.toLowerCase().includes('confusion') ||
        s.toLowerCase().includes('altered mental')
      );
      
      // Fever/infection signs
      const infectionSigns = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      // Risk factors
      const riskFactors = 
        input.flags?.includes('sinusitis') ||
        input.flags?.includes('otitis') ||
        input.flags?.includes('mastoiditis') ||
        input.flags?.includes('endocarditis') ||
        input.flags?.includes('dental_infection') ||
        input.flags?.includes('immunocompromised') ||
        input.flags?.includes('iv_drug_use') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('sinusitis') ||
          s.toLowerCase().includes('ear infection') ||
          s.toLowerCase().includes('mastoiditis') ||
          s.toLowerCase().includes('endocarditis') ||
          s.toLowerCase().includes('dental') ||
          s.toLowerCase().includes('tooth') ||
          s.toLowerCase().includes('abscess') ||
          s.toLowerCase().includes('iv drug')
        );
      
      // Direct mention
      const abscessMention = 
        input.flags?.includes('brain_abscess') ||
        input.flags?.includes('intracranial_abscess') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('brain abscess') ||
          s.toLowerCase().includes('intracranial abscess')
        );
      
      return abscessMention || (neuroSymptoms && infectionSigns && riskFactors);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Neurosurgery', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Suspected brain abscess: obtain urgent contrast-enhanced brain imaging, blood cultures, and start broad-spectrum antibiotics including coverage for anaerobes. Neurosurgical consultation required.',
      confidence: 0.9
    }
  },
  // --- Metabolic/Endocrine Rules ---
  {
    id: 'META-1',
    name: 'Diabetic Ketoacidosis (DKA)',
    category: 'Metabolic',
    weight: 9,
    match: (input) => {
      // Known diabetes history
      const diabetesHistory = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('diabetes') || 
          h.toLowerCase().includes('t1dm') ||
          h.toLowerCase().includes('type 1')
        ) ||
        input.flags?.includes('diabetes') ||
        input.flags?.includes('t1dm');
      
      // Hyperglycemia
      const hyperglycemia = 
        input.flags?.includes('hyperglycemia') ||
        input.flags?.includes('high_glucose') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('high glucose') || 
          s.toLowerCase().includes('hyperglycemia') ||
          s.toLowerCase().includes('high blood sugar')
        );
      
      // Ketosis/acidosis markers
      const ketosis = 
        input.flags?.includes('ketosis') ||
        input.flags?.includes('ketones') ||
        input.flags?.includes('metabolic_acidosis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('ketones') || 
          s.toLowerCase().includes('ketosis') ||
          s.toLowerCase().includes('acidosis') ||
          s.toLowerCase().includes('fruity breath') ||
          s.toLowerCase().includes('kussmaul breathing') ||
          s.toLowerCase().includes('deep breathing')
        );
      
      // Classic symptoms
      const classicSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('polydipsia') || 
          s.toLowerCase().includes('excessive thirst') ||
          s.toLowerCase().includes('polyuria') ||
          s.toLowerCase().includes('frequent urination') ||
          s.toLowerCase().includes('weight loss') ||
          s.toLowerCase().includes('dehydration') ||
          s.toLowerCase().includes('nausea') ||
          s.toLowerCase().includes('vomiting') ||
          s.toLowerCase().includes('abdominal pain')
        );
      
      // Altered mental status
      const alteredMentalStatus = 
        (input.vitals?.gcs !== undefined && input.vitals.gcs < 15) ||
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental') || 
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('drowsy') ||
          s.toLowerCase().includes('lethargy')
        );
      
      // Direct mention of DKA
      const dkaMention = 
        input.flags?.includes('dka') ||
        input.flags?.includes('diabetic_ketoacidosis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('dka') || 
          s.toLowerCase().includes('diabetic ketoacidosis')
        );
      
      return dkaMention || 
        ((diabetesHistory || hyperglycemia) && (ketosis || (classicSymptoms && alteredMentalStatus)));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Endocrinology', type: 'secondary' }
      ],
      explain: 'Suspected diabetic ketoacidosis: requires immediate IV fluids, insulin therapy, and electrolyte management. Monitor for cerebral edema, especially in pediatric patients.',
      confidence: 0.95
    }
  },
  {
    id: 'META-2',
    name: 'Hyperosmolar Hyperglycemic State (HHS)',
    category: 'Metabolic',
    weight: 9,
    match: (input) => {
      // Usually type 2 diabetes, often elderly
      const type2Diabetes = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('type 2 diabetes') || 
          h.toLowerCase().includes('t2dm')
        ) ||
        input.flags?.includes('t2dm') ||
        (input.flags?.includes('diabetes') && input.age > 50);
      
      // Severe hyperglycemia (typically >600 mg/dL)
      const severeHyperglycemia = 
        input.flags?.includes('severe_hyperglycemia') ||
        input.flags?.includes('glucose_over_600') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('glucose') && s.toLowerCase().includes('600')) || 
          (s.toLowerCase().includes('glucose') && s.toLowerCase().includes('high')) ||
          s.toLowerCase().includes('severe hyperglycemia')
        );
      
      // Hyperosmolarity
      const hyperosmolarity = 
        input.flags?.includes('hyperosmolar') ||
        input.flags?.includes('hyperosmolality') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('hyperosmolar') || 
          s.toLowerCase().includes('severe dehydration')
        );
      
      // Absence of significant ketosis (unlike DKA)
      const minimalKetosis = 
        input.flags?.includes('minimal_ketones') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('ketones') && s.toLowerCase().includes('negative')) || 
          (s.toLowerCase().includes('ketones') && s.toLowerCase().includes('minimal'))
        );
      
      // Altered mental status (often more severe than DKA)
      const alteredMentalStatus = 
        (input.vitals?.gcs !== undefined && input.vitals.gcs < 15) ||
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental') || 
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('lethargy') ||
          s.toLowerCase().includes('coma')
        );
      
      // Direct mention of HHS
      const hhsMention = 
        input.flags?.includes('hhs') ||
        input.flags?.includes('hyperosmolar_state') ||
        input.flags?.includes('honk') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('hhs') || 
          s.toLowerCase().includes('hyperosmolar') ||
          s.toLowerCase().includes('honk') ||
          s.toLowerCase().includes('hyperosmolar hyperglycemic')
        );
      
      return hhsMention || 
        (severeHyperglycemia && (hyperosmolarity || alteredMentalStatus) && (type2Diabetes || !input.flags?.includes('dka')));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Endocrinology', type: 'secondary' }
      ],
      explain: 'Hyperosmolar Hyperglycemic State: extremely high glucose with severe dehydration. Higher mortality than DKA. Requires aggressive fluid resuscitation and careful insulin therapy.',
      confidence: 0.92
    }
  },
  {
    id: 'META-3',
    name: 'Thyroid Storm',
    category: 'Metabolic',
    weight: 9,
    match: (input) => {
      // History of hyperthyroidism or Graves' disease
      const hyperthyroidHistory = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('hyperthyroid') || 
          h.toLowerCase().includes('graves') ||
          h.toLowerCase().includes('thyrotoxicosis')
        ) ||
        input.flags?.includes('hyperthyroidism') ||
        input.flags?.includes('graves_disease');
      
      // Thermoregulatory dysfunction (high fever)
      const fever = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.5) ||
        input.symptoms.some(s => s.toLowerCase().includes('fever') || s.toLowerCase().includes('hyperthermia'));
      
      // Cardiovascular effects
      const cardiovascularEffects = 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.flags?.includes('tachycardia') ||
        input.flags?.includes('afib') ||
        input.flags?.includes('heart_failure') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('tachycardia') || 
          s.toLowerCase().includes('palpitations') ||
          s.toLowerCase().includes('rapid heart') ||
          s.toLowerCase().includes('atrial fibrillation') ||
          s.toLowerCase().includes('chest pain') ||
          s.toLowerCase().includes('heart failure')
        );
      
      // CNS effects
      const cnsEffects = 
        input.flags?.includes('altered_mental_status') ||
        input.flags?.includes('agitation') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('agitation') || 
          s.toLowerCase().includes('delirium') ||
          s.toLowerCase().includes('psychosis') ||
          s.toLowerCase().includes('seizure') ||
          s.toLowerCase().includes('coma') ||
          s.toLowerCase().includes('altered mental')
        );
      
      // GI/hepatic dysfunction
      const giEffects = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('nausea') || 
          s.toLowerCase().includes('vomiting') ||
          s.toLowerCase().includes('diarrhea') ||
          s.toLowerCase().includes('abdominal pain') ||
          s.toLowerCase().includes('jaundice')
        );
      
      // Precipitating factors
      const precipitatingFactors = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('infection') || 
          s.toLowerCase().includes('surgery') ||
          s.toLowerCase().includes('trauma') ||
          s.toLowerCase().includes('stress') ||
          s.toLowerCase().includes('medication non-compliance') ||
          s.toLowerCase().includes('stopped medication') ||
          s.toLowerCase().includes('iodine exposure') ||
          s.toLowerCase().includes('contrast dye')
        );
      
      // Direct mention of thyroid storm
      const thyroidStormMention = 
        input.flags?.includes('thyroid_storm') ||
        input.flags?.includes('thyrotoxic_crisis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('thyroid storm') || 
          s.toLowerCase().includes('thyrotoxic crisis')
        );
      
      return thyroidStormMention || 
        (hyperthyroidHistory && fever && ((cardiovascularEffects && cnsEffects) || (cardiovascularEffects && giEffects) || (cnsEffects && giEffects)));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Endocrinology', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Suspected thyroid storm: life-threatening hyperthyroidism requiring immediate beta-blockade, thionamides, and supportive care. Mortality up to 30% if untreated.',
      confidence: 0.9
    }
  },
  {
    id: 'META-4',
    name: 'Adrenal Crisis',
    category: 'Metabolic',
    weight: 9,
    match: (input) => {
      // History of adrenal insufficiency or steroid use
      const adrenalHistory = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('adrenal insufficiency') || 
          h.toLowerCase().includes('addison') ||
          h.toLowerCase().includes('steroid dependent') ||
          h.toLowerCase().includes('adrenal disease') ||
          h.toLowerCase().includes('hypopituitarism')
        ) ||
        (input.medications || []).some(m => 
          m.toLowerCase().includes('prednisone') || 
          m.toLowerCase().includes('hydrocortisone') ||
          m.toLowerCase().includes('dexamethasone') ||
          m.toLowerCase().includes('steroid') ||
          m.toLowerCase().includes('budesonide')
        ) ||
        input.flags?.includes('adrenal_insufficiency') ||
        input.flags?.includes('steroid_dependent');
      
      // Hemodynamic instability
      const hemodynamicInstability = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) ||
        input.flags?.includes('hypotension') ||
        input.flags?.includes('shock') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('hypotension') || 
          s.toLowerCase().includes('shock') ||
          s.toLowerCase().includes('low blood pressure')
        );
      
      // Acute illness/stress
      const acuteStress = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('infection') || 
          s.toLowerCase().includes('surgery') ||
          s.toLowerCase().includes('trauma') ||
          s.toLowerCase().includes('illness') ||
          s.toLowerCase().includes('missed steroid')
        );
      
      // GI symptoms
      const giSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('nausea') || 
          s.toLowerCase().includes('vomiting') ||
          s.toLowerCase().includes('abdominal pain') ||
          s.toLowerCase().includes('diarrhea')
        );
      
      // Other symptoms
      const otherSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('weakness') || 
          s.toLowerCase().includes('fatigue') ||
          s.toLowerCase().includes('lethargy') ||
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('altered mental') ||
          s.toLowerCase().includes('fever')
        );
      
      // Direct mention of adrenal crisis
      const adrenalCrisisMention = 
        input.flags?.includes('adrenal_crisis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('adrenal crisis') || 
          s.toLowerCase().includes('addisonian crisis')
        );
      
      return adrenalCrisisMention || 
        (adrenalHistory && hemodynamicInstability && (acuteStress || giSymptoms || otherSymptoms));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Endocrinology', type: 'secondary' }
      ],
      explain: 'Suspected adrenal crisis: immediate IV hydrocortisone, fluid resuscitation, and management of precipitating factors. Do not delay steroid administration for test results.',
      confidence: 0.9
    }
  },
  {
    id: 'META-5',
    name: 'Severe Hyponatremia',
    category: 'Metabolic',
    weight: 8,
    match: (input) => {
      // Direct mention of severe hyponatremia
      const hyponatremiaMention = 
        input.flags?.includes('severe_hyponatremia') ||
        input.flags?.includes('sodium_under_120') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe hyponatremia') || 
          (s.toLowerCase().includes('sodium') && s.toLowerCase().includes('low'))
        );
      
      // Neurological symptoms characteristic of hyponatremia
      const neuroSymptoms = 
        input.flags?.includes('altered_mental_status') ||
        input.flags?.includes('seizure') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental') || 
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('seizure') ||
          s.toLowerCase().includes('headache') ||
          s.toLowerCase().includes('lethargy') ||
          s.toLowerCase().includes('disorientation') ||
          s.toLowerCase().includes('coma')
        );
      
      // Risk factors for hyponatremia
      const riskFactors = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('excessive water') || 
          s.toLowerCase().includes('psychogenic polydipsia') ||
          s.toLowerCase().includes('siadh') ||
          s.toLowerCase().includes('heart failure') ||
          s.toLowerCase().includes('cirrhosis') ||
          s.toLowerCase().includes('diuretic') ||
          s.toLowerCase().includes('adrenal insufficiency') ||
          s.toLowerCase().includes('hypothyroid')
        ) ||
        (input.medications || []).some(m => 
          m.toLowerCase().includes('diuretic') || 
          m.toLowerCase().includes('ssri') ||
          m.toLowerCase().includes('carbamazepine') ||
          m.toLowerCase().includes('oxcarbazepine')
        );
      
      return hyponatremiaMention || (neuroSymptoms && riskFactors);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Nephrology', type: 'secondary' }
      ],
      explain: 'Severe hyponatremia with neurological symptoms. Requires careful, controlled sodium correction (avoid too rapid correction to prevent osmotic demyelination syndrome).',
      confidence: 0.9
    }
  },
  {
    id: 'META-6',
    name: 'Severe Hyperkalemia',
    category: 'Metabolic',
    weight: 9,
    match: (input) => {
      // Direct mention of severe hyperkalemia
      const hyperkalemiaMention = 
        input.flags?.includes('severe_hyperkalemia') ||
        input.flags?.includes('potassium_over_6.5') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe hyperkalemia') || 
          (s.toLowerCase().includes('potassium') && s.toLowerCase().includes('high'))
        );
      
      // ECG changes/cardiac effects
      const ecgChanges = 
        input.flags?.includes('ecg_changes') ||
        input.flags?.includes('peaked_t_waves') ||
        input.flags?.includes('widened_qrs') ||
        input.flags?.includes('arrhythmia') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('ecg changes') || 
          s.toLowerCase().includes('peaked t waves') ||
          s.toLowerCase().includes('wide qrs') ||
          s.toLowerCase().includes('arrhythmia') ||
          s.toLowerCase().includes('heart block') ||
          s.toLowerCase().includes('palpitations')
        );
      
      // Risk factors for hyperkalemia
      const riskFactors = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('kidney disease') || 
          h.toLowerCase().includes('renal failure') ||
          h.toLowerCase().includes('ckd') ||
          h.toLowerCase().includes('aki') ||
          h.toLowerCase().includes('dialysis') ||
          h.toLowerCase().includes('adrenal insufficiency')
        ) ||
        (input.medications || []).some(m => 
          m.toLowerCase().includes('ace inhibitor') || 
          m.toLowerCase().includes('arb') ||
          m.toLowerCase().includes('spironolactone') ||
          m.toLowerCase().includes('eplerenone') ||
          m.toLowerCase().includes('potassium sparing') ||
          m.toLowerCase().includes('potassium supplement') ||
          m.toLowerCase().includes('trimethoprim')
        );
      
      // Neuromuscular symptoms
      const neuroSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('weakness') || 
          s.toLowerCase().includes('paresthesia') ||
          s.toLowerCase().includes('paralysis')
        );
      
      return hyperkalemiaMention || (ecgChanges && riskFactors) || 
        (neuroSymptoms && riskFactors && input.flags?.includes('hyperkalemia'));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Nephrology', type: 'secondary' }
      ],
      explain: 'Severe hyperkalemia: potential for lethal arrhythmias. Requires immediate ECG, calcium (membrane stabilization), insulin/glucose, beta-agonists, and definitive treatment (dialysis if severe).',
      confidence: 0.95
    }
  },
  {
    id: 'META-7',
    name: 'Severe Hypoglycemia',
    category: 'Metabolic',
    weight: 9,
    match: (input) => {
      // Direct mention of severe hypoglycemia
      const hypoglycemiaMention = 
        input.flags?.includes('severe_hypoglycemia') ||
        input.flags?.includes('glucose_under_40') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe hypoglycemia') || 
          (s.toLowerCase().includes('glucose') && s.toLowerCase().includes('low')) ||
          (s.toLowerCase().includes('sugar') && s.toLowerCase().includes('low'))
        );
      
      // Neuroglycopenic symptoms
      const neuroSymptoms = 
        input.flags?.includes('altered_mental_status') ||
        input.flags?.includes('seizure') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental') || 
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('seizure') ||
          s.toLowerCase().includes('coma') ||
          s.toLowerCase().includes('unconscious') ||
          s.toLowerCase().includes('dizziness') ||
          s.toLowerCase().includes('weakness')
        );
      
      // Autonomic/adrenergic symptoms
      const autonomicSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('diaphoresis') || 
          s.toLowerCase().includes('sweating') ||
          s.toLowerCase().includes('tremor') ||
          s.toLowerCase().includes('shaking') ||
          s.toLowerCase().includes('palpitations') ||
          s.toLowerCase().includes('anxiety') ||
          s.toLowerCase().includes('hunger')
        );
      
      // Risk factors
      const riskFactors = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('diabetes')
        ) ||
        (input.medications || []).some(m => 
          m.toLowerCase().includes('insulin') || 
          m.toLowerCase().includes('sulfonylurea') ||
          m.toLowerCase().includes('glipizide') ||
          m.toLowerCase().includes('glyburide') ||
          m.toLowerCase().includes('glimepiride')
        );
      
      return hypoglycemiaMention || 
        (riskFactors && (neuroSymptoms || (autonomicSymptoms && input.flags?.includes('hypoglycemia'))));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' }
      ],
      explain: 'Severe hypoglycemia: immediate glucose administration required. IV dextrose for severe cases or altered mental status; oral glucose if patient can safely swallow.',
      confidence: 0.95
    }
  },
  {
    id: 'META-8',
    name: 'Hypercalcemic Crisis',
    category: 'Metabolic',
    weight: 8,
    match: (input) => {
      // Direct mention of severe hypercalcemia
      const hypercalcemiaMention = 
        input.flags?.includes('severe_hypercalcemia') ||
        input.flags?.includes('calcium_over_14') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe hypercalcemia') || 
          (s.toLowerCase().includes('calcium') && s.toLowerCase().includes('high')) ||
          s.toLowerCase().includes('hypercalcemic crisis')
        );
      
      // Neurological symptoms
      const neuroSymptoms = 
        input.flags?.includes('altered_mental_status') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('altered mental') || 
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('lethargy') ||
          s.toLowerCase().includes('weakness') ||
          s.toLowerCase().includes('coma')
        );
      
      // GI symptoms
      const giSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('nausea') || 
          s.toLowerCase().includes('vomiting') ||
          s.toLowerCase().includes('constipation') ||
          s.toLowerCase().includes('abdominal pain')
        );
      
      // Cardiac effects
      const cardiacEffects = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('arrhythmia') || 
          s.toLowerCase().includes('short qt') ||
          s.toLowerCase().includes('bradycardia')
        );
      
      // Renal effects
      const renalEffects = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('polyuria') || 
          s.toLowerCase().includes('polydipsia') ||
          s.toLowerCase().includes('dehydration') ||
          s.toLowerCase().includes('kidney stone') ||
          s.toLowerCase().includes('renal failure')
        );
      
      // Risk factors (malignancy and hyperparathyroidism most common)
      const riskFactors = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('cancer') || 
          h.toLowerCase().includes('malignancy') ||
          h.toLowerCase().includes('hyperparathyroid') ||
          h.toLowerCase().includes('sarcoidosis') ||
          h.toLowerCase().includes('multiple myeloma')
        );
      
      return hypercalcemiaMention || 
        (neuroSymptoms && (giSymptoms || cardiacEffects || renalEffects) && riskFactors);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Nephrology', type: 'secondary' },
        { name: 'Endocrinology', type: 'tertiary' }
      ],
      explain: 'Hypercalcemic crisis: requires aggressive IV fluid resuscitation, bisphosphonates, calcitonin, and management of underlying cause (often malignancy or hyperparathyroidism).',
      confidence: 0.9
    }
  },
  // --- Gastrointestinal/Abdominal Rules ---
  {
    id: 'GI-1',
    name: 'Upper GI Bleeding (Life-threatening)',
    category: 'Gastrointestinal',
    weight: 10,
    match: (input) => {
      // Hematemesis/Coffee ground emesis
      const hematemesis = input.symptoms.some(s => 
        s.toLowerCase().includes('vomiting blood') ||
        s.toLowerCase().includes('hematemesis') ||
        s.toLowerCase().includes('coffee ground') ||
        (s.toLowerCase().includes('vomit') && s.toLowerCase().includes('blood'))
      );
      
      // Melena
      const melena = input.symptoms.some(s => 
        s.toLowerCase().includes('melena') ||
        s.toLowerCase().includes('black stool') ||
        s.toLowerCase().includes('tarry stool') ||
        (s.toLowerCase().includes('stool') && s.toLowerCase().includes('black'))
      );
      
      // Signs of shock
      const shockSigns = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.flags?.includes('hypotension') ||
        input.flags?.includes('shock') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('lightheaded') || 
          s.toLowerCase().includes('syncope') ||
          s.toLowerCase().includes('dizzy') ||
          s.toLowerCase().includes('cold skin') ||
          s.toLowerCase().includes('pale') ||
          s.toLowerCase().includes('clammy')
        );
      
      // Direct mention of severe or massive bleeding
      const severeBleeding = input.symptoms.some(s => 
        (s.toLowerCase().includes('bleeding') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('massive') ||
          s.toLowerCase().includes('large amount')
        )) ||
        (s.toLowerCase().includes('hemorrhage') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('massive')
        ))
      );

      // Specific flags
      const bleedingFlags = 
        input.flags?.includes('gi_bleeding') ||
        input.flags?.includes('upper_gi_bleed') ||
        input.flags?.includes('variceal_bleeding');
      
      // Life-threatening GI bleeding must have bleeding signs AND either shock or mention of severity
      return bleedingFlags || 
        (hematemesis && (shockSigns || severeBleeding)) || 
        (melena && (shockSigns || severeBleeding));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Gastroenterology', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Life-threatening upper GI bleeding with signs of hemodynamic instability. Requires immediate resuscitation, large-bore IV access, blood products, and emergent endoscopy.',
      confidence: 0.95
    }
  },
  {
    id: 'GI-2',
    name: 'Lower GI Bleeding (Life-threatening)',
    category: 'Gastrointestinal',
    weight: 9,
    match: (input) => {
      // Hematochezia
      const hematochezia = input.symptoms.some(s => 
        s.toLowerCase().includes('hematochezia') ||
        s.toLowerCase().includes('bloody stool') ||
        s.toLowerCase().includes('rectal bleeding') ||
        s.toLowerCase().includes('blood per rectum') ||
        (s.toLowerCase().includes('stool') && s.toLowerCase().includes('red blood')) ||
        (s.toLowerCase().includes('stool') && s.toLowerCase().includes('bright red'))
      );
      
      // Signs of shock
      const shockSigns = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.flags?.includes('hypotension') ||
        input.flags?.includes('shock') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('lightheaded') || 
          s.toLowerCase().includes('syncope') ||
          s.toLowerCase().includes('dizzy') ||
          s.toLowerCase().includes('cold skin') ||
          s.toLowerCase().includes('pale') ||
          s.toLowerCase().includes('clammy')
        );
      
      // Direct mention of severe or massive bleeding
      const severeBleeding = input.symptoms.some(s => 
        (s.toLowerCase().includes('bleeding') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('massive') ||
          s.toLowerCase().includes('large amount')
        )) ||
        (s.toLowerCase().includes('hemorrhage') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('massive')
        ))
      );

      // Specific flags
      const bleedingFlags = 
        input.flags?.includes('gi_bleeding') ||
        input.flags?.includes('lower_gi_bleed') ||
        input.flags?.includes('rectal_bleeding');
      
      // Life-threatening GI bleeding must have bleeding signs AND either shock or mention of severity
      return bleedingFlags || (hematochezia && (shockSigns || severeBleeding));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Gastroenterology', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Life-threatening lower GI bleeding with signs of hemodynamic instability. Requires immediate resuscitation, large-bore IV access, blood products, and urgent colonoscopy or angiography.',
      confidence: 0.95
    }
  },
  {
    id: 'GI-3',
    name: 'Perforated Viscus',
    category: 'Gastrointestinal',
    weight: 10,
    match: (input) => {
      // Sudden onset severe abdominal pain
      const suddenSeverePain = input.symptoms.some(s => 
        (s.toLowerCase().includes('abdominal pain') && (
          s.toLowerCase().includes('sudden') || 
          s.toLowerCase().includes('severe') ||
          s.toLowerCase().includes('intense') ||
          s.toLowerCase().includes('worst')
        )) ||
        (s.toLowerCase().includes('belly pain') && (
          s.toLowerCase().includes('sudden') || 
          s.toLowerCase().includes('severe')
        )) ||
        (s.toLowerCase().includes('stomach pain') && (
          s.toLowerCase().includes('sudden') || 
          s.toLowerCase().includes('severe')
        ))
      );
      
      // Rigid abdomen / peritoneal signs
      const peritonealSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('rigid abdomen') ||
        s.toLowerCase().includes('board-like abdomen') ||
        s.toLowerCase().includes('rebound tenderness') ||
        s.toLowerCase().includes('guarding') ||
        s.toLowerCase().includes('peritoneal') ||
        s.toLowerCase().includes('rigid belly')
      );
      
      // Systemic signs
      const systemicSigns = 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('tachycardia') || 
          s.toLowerCase().includes('fever')
        );
      
      // Risk factors or history
      const riskFactors = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('ulcer') ||
        h.toLowerCase().includes('diverticulitis') ||
        h.toLowerCase().includes('inflammatory bowel') ||
        h.toLowerCase().includes('recent endoscopy') ||
        h.toLowerCase().includes('recent surgery')
      ) || input.symptoms.some(s => 
        s.toLowerCase().includes('history of ulcer') ||
        s.toLowerCase().includes('taking nsaids')
      );
      
      // Free air
      const freeAir = 
        input.flags?.includes('free_air') ||
        input.flags?.includes('pneumoperitoneum') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('free air') ||
          s.toLowerCase().includes('pneumoperitoneum')
        );
      
      // Direct mention
      const perforationMention = 
        input.flags?.includes('perforation') ||
        input.flags?.includes('perforated_ulcer') ||
        input.flags?.includes('perforated_viscus') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('perforation') ||
          s.toLowerCase().includes('perforated')
        );
      
      return perforationMention || freeAir || 
        (suddenSeverePain && peritonealSigns) ||
        (suddenSeverePain && peritonealSigns && (systemicSigns || riskFactors));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'General Surgery', type: 'secondary' }
      ],
      explain: 'Suspected perforated viscus: surgical emergency requiring immediate IV antibiotics, fluid resuscitation, and urgent exploratory laparotomy. NPO status and nasogastric decompression indicated.',
      confidence: 0.95
    }
  },
  {
    id: 'GI-4',
    name: 'Bowel Obstruction with Strangulation Risk',
    category: 'Gastrointestinal',
    weight: 9,
    match: (input) => {
      // Core obstruction symptoms
      const obstructionSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('obstruction') ||
        s.toLowerCase().includes('no bowel movement') ||
        s.toLowerCase().includes('unable to pass stool') ||
        s.toLowerCase().includes('no flatus') ||
        s.toLowerCase().includes('distention') ||
        s.toLowerCase().includes('distended abdomen') ||
        s.toLowerCase().includes('bloating') ||
        (s.toLowerCase().includes('vomiting') && (
          s.toLowerCase().includes('fecal') || 
          s.toLowerCase().includes('feculent')
        ))
      );
      
      // Concerning for strangulation
      const strangulationConcern = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe pain') ||
          s.toLowerCase().includes('constant pain') ||
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('tachycardia') ||
          s.toLowerCase().includes('rebound') ||
          s.toLowerCase().includes('guarding')
        ) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 110) ||
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0);
      
      // Risk factors
      const obstructionRisk = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('prior surgery') ||
        h.toLowerCase().includes('adhesions') ||
        h.toLowerCase().includes('hernia') ||
        h.toLowerCase().includes('crohn') ||
        h.toLowerCase().includes('cancer')
      );
      
      // Direct mention
      const obstructionMention = 
        input.flags?.includes('bowel_obstruction') ||
        input.flags?.includes('intestinal_obstruction') ||
        input.flags?.includes('strangulated') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('bowel obstruction') ||
          s.toLowerCase().includes('intestinal obstruction') ||
          s.toLowerCase().includes('small bowel obstruction') ||
          s.toLowerCase().includes('large bowel obstruction') ||
          s.toLowerCase().includes('strangulated')
        );
      
      return obstructionMention || 
        (obstructionSymptoms && strangulationConcern) ||
        (obstructionSymptoms && strangulationConcern && obstructionRisk);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'General Surgery', type: 'secondary' }
      ],
      explain: 'Suspected bowel obstruction with signs of strangulation (fever, tachycardia, severe constant pain). Surgical emergency requiring immediate IV fluids, antibiotics, and likely operative intervention.',
      confidence: 0.92
    }
  },
  {
    id: 'GI-5',
    name: 'Acute Mesenteric Ischemia',
    category: 'Gastrointestinal',
    weight: 10,
    match: (input) => {
      // Core symptoms: severe abdominal pain out of proportion to exam
      const painOutOfProportion = input.symptoms.some(s => 
        (s.toLowerCase().includes('abdominal pain') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('out of proportion') ||
          s.toLowerCase().includes('excessive')
        )) ||
        s.toLowerCase().includes('pain out of proportion')
      );
      
      // Risk factors
      const vascularRiskFactors = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('atrial fibrillation') ||
        h.toLowerCase().includes('heart failure') ||
        h.toLowerCase().includes('atherosclerosis') ||
        h.toLowerCase().includes('hypercoagulable') ||
        h.toLowerCase().includes('recent mi') ||
        h.toLowerCase().includes('valvular disease')
      );
      
      // Additional signs
      const additionalSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('bloody diarrhea') ||
        s.toLowerCase().includes('vomiting') ||
        s.toLowerCase().includes('rapid onset') ||
        s.toLowerCase().includes('urgent need to defecate')
      );
      
      // Direct mention
      const ischemiaMention = 
        input.flags?.includes('mesenteric_ischemia') ||
        input.flags?.includes('intestinal_ischemia') ||
        input.flags?.includes('bowel_ischemia') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('mesenteric ischemia') ||
          s.toLowerCase().includes('intestinal ischemia') ||
          s.toLowerCase().includes('bowel ischemia')
        );
      
      // Lab abnormalities if available
      const labAbnormalities = 
        input.flags?.includes('elevated_lactate') ||
        input.flags?.includes('leukocytosis') ||
        input.flags?.includes('metabolic_acidosis');
      
      return ischemiaMention || 
        (painOutOfProportion && vascularRiskFactors) ||
        (painOutOfProportion && (labAbnormalities || additionalSigns));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Vascular Surgery', type: 'secondary' },
        { name: 'General Surgery', type: 'tertiary' }
      ],
      explain: 'Suspected acute mesenteric ischemia: vascular emergency with high mortality. Requires immediate CT angiography, surgical consultation, and possible emergent laparotomy or endovascular intervention.',
      confidence: 0.9
    }
  },
  {
    id: 'GI-6',
    name: 'Severe Acute Pancreatitis',
    category: 'Gastrointestinal',
    weight: 9,
    match: (input) => {
      // Core symptoms
      const pancreatitisSymptoms = input.symptoms.some(s => 
        (s.toLowerCase().includes('abdominal pain') && (
          s.toLowerCase().includes('epigastric') || 
          s.toLowerCase().includes('upper') ||
          s.toLowerCase().includes('radiating to back')
        )) ||
        (s.toLowerCase().includes('epigastric pain')) ||
        (s.toLowerCase().includes('upper abdominal pain'))
      );
      
      // Risk factors
      const pancreatitisRisk = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('gallstones') ||
        h.toLowerCase().includes('alcohol') ||
        h.toLowerCase().includes('hypertriglyceridemia') ||
        h.toLowerCase().includes('ercp')
      ) || input.symptoms.some(s => 
        s.toLowerCase().includes('alcohol') ||
        s.toLowerCase().includes('gallstone')
      );
      
      // Severe pancreatitis features
      const severeFeatures = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('shortness of breath') ||
          s.toLowerCase().includes('hypoxia') ||
          s.toLowerCase().includes('shock') ||
          s.toLowerCase().includes('altered mental') ||
          s.toLowerCase().includes('severe') ||
          s.toLowerCase().includes('renal failure') ||
          s.toLowerCase().includes('pleural effusion')
        ) ||
        input.flags?.includes('hypoxia') ||
        input.flags?.includes('shock') ||
        input.flags?.includes('organ_failure') ||
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 92) ||
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120);
      
      // Direct mention
      const pancreatitisMention = 
        input.flags?.includes('pancreatitis') ||
        input.flags?.includes('severe_pancreatitis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('pancreatitis') ||
          (s.toLowerCase().includes('elevated') && s.toLowerCase().includes('lipase')) ||
          (s.toLowerCase().includes('elevated') && s.toLowerCase().includes('amylase'))
        );
      
      return pancreatitisMention || 
        (pancreatitisSymptoms && severeFeatures) ||
        (pancreatitisSymptoms && pancreatitisRisk && severeFeatures);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Critical Care', type: 'secondary' },
        { name: 'Gastroenterology', type: 'tertiary' }
      ],
      explain: 'Suspected severe acute pancreatitis with signs of organ dysfunction. Requires aggressive fluid resuscitation, ICU admission, and monitoring for necrosis or organ failure.',
      confidence: 0.9
    }
  },
  {
    id: 'GI-7',
    name: 'Toxic Megacolon',
    category: 'Gastrointestinal',
    weight: 10,
    match: (input) => {
      // Core symptoms
      const colitisSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('bloody diarrhea') ||
        s.toLowerCase().includes('diarrhea') ||
        s.toLowerCase().includes('colitis') ||
        s.toLowerCase().includes('bloody stool') ||
        s.toLowerCase().includes('abdominal pain')
      );
      
      // Toxic features
      const toxicFeatures = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('tachycardia') ||
          s.toLowerCase().includes('distention') ||
          s.toLowerCase().includes('distended abdomen') ||
          s.toLowerCase().includes('altered mental')
        ) ||
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100);
      
      // Risk factors
      const megacolonRisk = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('ulcerative colitis') ||
        h.toLowerCase().includes('crohn') ||
        h.toLowerCase().includes('c. diff') ||
        h.toLowerCase().includes('clostridium difficile') ||
        h.toLowerCase().includes('inflammatory bowel')
      ) || input.symptoms.some(s => 
        s.toLowerCase().includes('ulcerative colitis') ||
        s.toLowerCase().includes('crohn') ||
        s.toLowerCase().includes('c. diff') ||
        s.toLowerCase().includes('clostridium difficile')
      );
      
      // Direct mention
      const megacolonMention = 
        input.flags?.includes('toxic_megacolon') ||
        input.flags?.includes('megacolon') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('toxic megacolon') ||
          s.toLowerCase().includes('megacolon')
        );
      
      return megacolonMention || 
        (colitisSymptoms && toxicFeatures && megacolonRisk);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'General Surgery', type: 'secondary' },
        { name: 'Gastroenterology', type: 'tertiary' }
      ],
      explain: 'Suspected toxic megacolon: life-threatening complication requiring immediate colonic decompression, fluid resuscitation, antibiotics, and surgical consultation for possible emergent colectomy.',
      confidence: 0.95
    }
  },
  {
    id: 'GI-8',
    name: 'Acute Liver Failure',
    category: 'Gastrointestinal',
    weight: 10,
    match: (input) => {
      // Jaundice
      const jaundice = input.symptoms.some(s => 
        s.toLowerCase().includes('jaundice') ||
        s.toLowerCase().includes('yellow skin') ||
        s.toLowerCase().includes('yellow eyes') ||
        s.toLowerCase().includes('scleral icterus')
      );
      
      // Hepatic encephalopathy
      const encephalopathy = input.symptoms.some(s => 
        s.toLowerCase().includes('confusion') ||
        s.toLowerCase().includes('altered mental') ||
        s.toLowerCase().includes('encephalopathy') ||
        s.toLowerCase().includes('asterixis') ||
        s.toLowerCase().includes('flapping tremor')
      );
      
      // Coagulopathy
      const coagulopathy = 
        input.flags?.includes('coagulopathy') ||
        input.flags?.includes('elevated_inr') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('bleeding') ||
          s.toLowerCase().includes('bruising') ||
          s.toLowerCase().includes('coagulopathy') ||
          s.toLowerCase().includes('elevated inr')
        );
      
      // Risk factors
      const liverFailureRisk = 
        input.flags?.includes('acetaminophen') ||
        input.flags?.includes('tylenol_overdose') ||
        input.flags?.includes('hepatitis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('acetaminophen') ||
          s.toLowerCase().includes('tylenol overdose') ||
          s.toLowerCase().includes('mushroom') ||
          s.toLowerCase().includes('hepatitis')
        );
      
      // Direct mention
      const liverFailureMention = 
        input.flags?.includes('liver_failure') ||
        input.flags?.includes('fulminant_hepatic_failure') ||
        input.flags?.includes('acute_liver_failure') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('liver failure') ||
          s.toLowerCase().includes('hepatic failure')
        );
      
      // No previous liver disease
      const noPriorLiverDisease = !(input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('cirrhosis') ||
        h.toLowerCase().includes('chronic liver')
      );
      
      return liverFailureMention || 
        (jaundice && encephalopathy && noPriorLiverDisease) ||
        (jaundice && (encephalopathy || coagulopathy) && liverFailureRisk);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Gastroenterology', type: 'secondary' },
        { name: 'Critical Care', type: 'tertiary' }
      ],
      explain: 'Suspected acute liver failure: medical emergency requiring ICU care, N-acetylcysteine for acetaminophen toxicity, and consideration for transfer to a liver transplant center.',
      confidence: 0.92
    }
  },
  {
    id: 'GI-9',
    name: 'Ruptured Abdominal Aortic Aneurysm',
    category: 'Gastrointestinal',
    weight: 10,
    match: (input) => {
      // Classic triad: abdominal pain, pulsatile mass, hypotension
      const abdominalpain = input.symptoms.some(s => 
        s.toLowerCase().includes('abdominal pain') ||
        s.toLowerCase().includes('back pain') ||
        s.toLowerCase().includes('flank pain')
      );
      
      const pulsatileMass = input.symptoms.some(s => 
        s.toLowerCase().includes('pulsatile') ||
        s.toLowerCase().includes('pulsating mass') ||
        s.toLowerCase().includes('abdominal mass')
      );
      
      const hypotension = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) ||
        input.flags?.includes('hypotension') ||
        input.flags?.includes('shock') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('hypotension') || 
          s.toLowerCase().includes('shock')
        );
      
      // Risk factors
      const aneurysmRisk = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('aaa') ||
        h.toLowerCase().includes('abdominal aortic aneurysm') ||
        h.toLowerCase().includes('aneurysm') ||
        h.toLowerCase().includes('vascular disease')
      );
      
      // Direct mention
      const rupturedAAA = 
        input.flags?.includes('ruptured_aaa') ||
        input.flags?.includes('aaa_rupture') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('ruptured aneurysm') ||
          s.toLowerCase().includes('ruptured aaa') ||
          s.toLowerCase().includes('aortic rupture')
        );
      
      return rupturedAAA || 
        (abdominalpain && hypotension && aneurysmRisk) ||
        (abdominalpain && pulsatileMass && hypotension);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Vascular Surgery', type: 'secondary' }
      ],
      explain: 'Suspected ruptured abdominal aortic aneurysm: immediate vascular surgery consultation, massive transfusion protocol activation, and rapid transport to operating room required. Do not delay for extensive imaging.',
      confidence: 0.99
    }
  },
  {
    id: 'GI-10',
    name: 'Moderate-Risk Upper GI Bleeding',
    category: 'Gastrointestinal',
    weight: 8,
    match: (input) => {
      // Hematemesis/Coffee ground emesis without shock
      const hematemesis = input.symptoms.some(s => 
        s.toLowerCase().includes('vomiting blood') ||
        s.toLowerCase().includes('hematemesis') ||
        s.toLowerCase().includes('coffee ground') ||
        (s.toLowerCase().includes('vomit') && s.toLowerCase().includes('blood'))
      );
      
      // Melena without shock
      const melena = input.symptoms.some(s => 
        s.toLowerCase().includes('melena') ||
        s.toLowerCase().includes('black stool') ||
        s.toLowerCase().includes('tarry stool') ||
        (s.toLowerCase().includes('stool') && s.toLowerCase().includes('black'))
      );
      
      // No signs of shock
      const noShock = 
        (input.vitals?.systolicBP === undefined || input.vitals.systolicBP >= 90) && 
        (input.vitals?.heartRate === undefined || input.vitals.heartRate <= 120) &&
        !input.flags?.includes('hypotension') &&
        !input.flags?.includes('shock');
      
      // Risk factors
      const bleedingRisk = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('ulcer') ||
        h.toLowerCase().includes('varices') ||
        h.toLowerCase().includes('alcoholic') ||
        h.toLowerCase().includes('liver disease') ||
        h.toLowerCase().includes('nsaids') ||
        h.toLowerCase().includes('anticoagulant')
      );
      
      // Direct mention
      const giBleedingMention = 
        input.flags?.includes('gi_bleeding') ||
        input.flags?.includes('upper_gi_bleed') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('gi bleeding') ||
          s.toLowerCase().includes('upper gi bleed')
        );
      
      return (giBleedingMention && noShock) || 
        ((hematemesis || melena) && noShock && bleedingRisk);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Gastroenterology', type: 'secondary' }
      ],
      explain: 'Upper GI bleeding without hemodynamic instability. Requires IV access, fluid resuscitation, blood testing, and consultation for urgent endoscopy within 24 hours.',
      confidence: 0.9
    }
  },
  {
    id: 'GI-11',
    name: 'Acute Cholangitis',
    category: 'Gastrointestinal',
    weight: 9,
    match: (input) => {
      // Charcot's triad: fever, jaundice, right upper quadrant pain
      const fever = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) ||
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      const jaundice = input.symptoms.some(s => 
        s.toLowerCase().includes('jaundice') ||
        s.toLowerCase().includes('yellow skin') ||
        s.toLowerCase().includes('yellow eyes') ||
        s.toLowerCase().includes('scleral icterus')
      );
      
      const rupPain = input.symptoms.some(s => 
        (s.toLowerCase().includes('right upper') && s.toLowerCase().includes('pain')) ||
        (s.toLowerCase().includes('rup') && s.toLowerCase().includes('pain')) ||
        s.toLowerCase().includes('right upper quadrant pain')
      );
      
      // Reynolds' pentad (adds shock and altered mental status): more severe
      const shockOrAlteredMental = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) ||
        input.flags?.includes('hypotension') ||
        input.flags?.includes('shock') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('confusion') || 
          s.toLowerCase().includes('altered mental') ||
          s.toLowerCase().includes('hypotension') ||
          s.toLowerCase().includes('shock')
        );
      
      // Risk factors
      const cholangitisRisk = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('gallstones') ||
        h.toLowerCase().includes('choledocholithiasis') ||
        h.toLowerCase().includes('biliary stent') ||
        h.toLowerCase().includes('ercp') ||
        h.toLowerCase().includes('primary sclerosing cholangitis')
      );
      
      // Direct mention
      const cholangitisFlag = 
        input.flags?.includes('cholangitis') ||
        input.flags?.includes('ascending_cholangitis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('cholangitis') ||
          s.toLowerCase().includes('biliary infection')
        );
      
      return cholangitisFlag || 
        (fever && jaundice && rupPain) ||
        ((fever && jaundice) || (fever && rupPain) || (jaundice && rupPain)) && shockOrAlteredMental && cholangitisRisk;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Gastroenterology', type: 'secondary' },
        { name: 'General Surgery', type: 'tertiary' }
      ],
      explain: 'Suspected acute cholangitis: medical emergency requiring immediate broad-spectrum antibiotics, fluid resuscitation, and urgent biliary decompression (ERCP or percutaneous drainage).',
      confidence: 0.92
    }
  },
  {
    id: 'GI-12',
    name: 'Acute Cholecystitis',
    category: 'Gastrointestinal',
    weight: 8,
    match: (input) => {
      // Key symptoms
      const rightUpperPain = input.symptoms.some(s => 
        (s.toLowerCase().includes('right upper') && s.toLowerCase().includes('pain')) ||
        (s.toLowerCase().includes('rup') && s.toLowerCase().includes('pain')) ||
        s.toLowerCase().includes('right upper quadrant pain')
      );
      
      const murphySign = input.symptoms.some(s => 
        s.toLowerCase().includes('murphy') ||
        s.toLowerCase().includes('inspiratory arrest') ||
        (s.toLowerCase().includes('pain') && s.toLowerCase().includes('breathing'))
      );
      
      // Fever/inflammatory signs
      const inflammatorySigns = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('nausea') ||
          s.toLowerCase().includes('vomiting')
        );
      
      // Risk factors
      const gallstoneRisk = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('gallstones') ||
        h.toLowerCase().includes('cholelithiasis') ||
        h.toLowerCase().includes('biliary colic')
      );
      
      // Direct mention
      const cholecystitisFlag = 
        input.flags?.includes('cholecystitis') ||
        input.flags?.includes('gallbladder_inflammation') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('cholecystitis') ||
          s.toLowerCase().includes('inflamed gallbladder')
        );
      
      return cholecystitisFlag || 
        (rightUpperPain && murphySign && inflammatorySigns) ||
        (rightUpperPain && murphySign && gallstoneRisk);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'General Surgery', type: 'secondary' }
      ],
      explain: 'Suspected acute cholecystitis: requires prompt IV antibiotics, pain control, surgical consultation, and likely cholecystectomy (either urgent or interval depending on severity).',
      confidence: 0.9
    }
  },
  {
    id: 'GI-13',
    name: 'Moderate-Risk Lower GI Bleeding',
    category: 'Gastrointestinal',
    weight: 7,
    match: (input) => {
      // Hematochezia without shock
      const hematochezia = input.symptoms.some(s => 
        s.toLowerCase().includes('hematochezia') ||
        s.toLowerCase().includes('bloody stool') ||
        s.toLowerCase().includes('rectal bleeding') ||
        s.toLowerCase().includes('blood per rectum') ||
        (s.toLowerCase().includes('stool') && s.toLowerCase().includes('red blood')) ||
        (s.toLowerCase().includes('stool') && s.toLowerCase().includes('bright red'))
      );
      
      // No signs of shock
      const noShock = 
        (input.vitals?.systolicBP === undefined || input.vitals.systolicBP >= 90) && 
        (input.vitals?.heartRate === undefined || input.vitals.heartRate <= 120) &&
        !input.flags?.includes('hypotension') &&
        !input.flags?.includes('shock');
      
      // Risk factors for concerning causes
      const concerningRisk = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('diverticulosis') ||
        h.toLowerCase().includes('angiodysplasia') ||
        h.toLowerCase().includes('inflammatory bowel') ||
        h.toLowerCase().includes('cancer') ||
        h.toLowerCase().includes('radiation proctitis') ||
        h.toLowerCase().includes('anticoagulant') ||
        h.toLowerCase().includes('nsaids')
      );
      
      // Direct mention
      const lowerGIBleedingMention = 
        input.flags?.includes('lower_gi_bleed') ||
        input.flags?.includes('rectal_bleeding') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('lower gi bleed') ||
          s.toLowerCase().includes('rectal bleeding')
        );
      
      return (lowerGIBleedingMention && noShock) || 
        (hematochezia && noShock && concerningRisk);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Gastroenterology', type: 'secondary' }
      ],
      explain: 'Lower GI bleeding without hemodynamic instability. Requires IV access, fluid support, blood testing, and evaluation for colonoscopy within 24 hours.',
      confidence: 0.85
    }
  },
  {
    id: 'GI-14',
    name: 'Acute Bowel Obstruction (Without Strangulation)',
    category: 'Gastrointestinal',
    weight: 7,
    match: (input) => {
      // Core obstruction symptoms
      const obstructionSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('obstruction') ||
        s.toLowerCase().includes('no bowel movement') ||
        s.toLowerCase().includes('unable to pass stool') ||
        s.toLowerCase().includes('no flatus') ||
        s.toLowerCase().includes('distention') ||
        s.toLowerCase().includes('distended abdomen') ||
        s.toLowerCase().includes('bloating') ||
        (s.toLowerCase().includes('vomiting') && (
          s.toLowerCase().includes('fecal') || 
          s.toLowerCase().includes('feculent')
        ))
      );
      
      // No signs of strangulation
      const noStrangulationSigns = !input.symptoms.some(s => 
        s.toLowerCase().includes('severe pain') ||
        s.toLowerCase().includes('constant pain') ||
        s.toLowerCase().includes('peritoneal') ||
        s.toLowerCase().includes('peritonitis') ||
        s.toLowerCase().includes('rebound') ||
        s.toLowerCase().includes('guarding')
      ) && (input.vitals?.temperature === undefined || input.vitals.temperature <= 38.0);
      
      // Risk factors
      const obstructionRisk = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('prior surgery') ||
        h.toLowerCase().includes('adhesions') ||
        h.toLowerCase().includes('hernia') ||
        h.toLowerCase().includes('crohn') ||
        h.toLowerCase().includes('cancer')
      );
      
      // Direct mention
      const obstructionMention = 
        input.flags?.includes('bowel_obstruction') ||
        input.flags?.includes('intestinal_obstruction') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('bowel obstruction') ||
          s.toLowerCase().includes('intestinal obstruction') ||
          s.toLowerCase().includes('small bowel obstruction') ||
          s.toLowerCase().includes('large bowel obstruction')
        );
      
      return (obstructionMention && noStrangulationSigns) || 
        (obstructionSymptoms && noStrangulationSigns && obstructionRisk);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'General Surgery', type: 'secondary' }
      ],
      explain: 'Suspected bowel obstruction without signs of strangulation. Requires IV fluids, NPO status, nasogastric decompression, and serial examinations to monitor for deterioration.',
      confidence: 0.85
    }
  },
  {
    id: 'GI-15',
    name: 'Mild Acute Pancreatitis',
    category: 'Gastrointestinal',
    weight: 7,
    match: (input) => {
      // Core symptoms
      const pancreatitisSymptoms = input.symptoms.some(s => 
        (s.toLowerCase().includes('abdominal pain') && (
          s.toLowerCase().includes('epigastric') || 
          s.toLowerCase().includes('upper') ||
          s.toLowerCase().includes('radiating to back')
        )) ||
        (s.toLowerCase().includes('epigastric pain')) ||
        (s.toLowerCase().includes('upper abdominal pain'))
      );
      
      // Risk factors
      const pancreatitisRisk = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('gallstones') ||
        h.toLowerCase().includes('alcohol') ||
        h.toLowerCase().includes('hypertriglyceridemia') ||
        h.toLowerCase().includes('ercp')
      ) || input.symptoms.some(s => 
        s.toLowerCase().includes('alcohol') ||
        s.toLowerCase().includes('gallstone')
      );
      
      // No severe features
      const noSevereFeatures = 
        !input.symptoms.some(s => 
          s.toLowerCase().includes('shortness of breath') ||
          s.toLowerCase().includes('hypoxia') ||
          s.toLowerCase().includes('shock') ||
          s.toLowerCase().includes('altered mental')
        ) &&
        !input.flags?.includes('hypoxia') &&
        !input.flags?.includes('shock') &&
        !input.flags?.includes('organ_failure') &&
        (input.vitals?.oxygenSaturation === undefined || input.vitals.oxygenSaturation >= 92) &&
        (input.vitals?.systolicBP === undefined || input.vitals.systolicBP >= 90);
      
      // Direct mention
      const pancreatitisMention = 
        input.flags?.includes('pancreatitis') ||
        input.flags?.includes('mild_pancreatitis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('pancreatitis') ||
          (s.toLowerCase().includes('elevated') && s.toLowerCase().includes('lipase')) ||
          (s.toLowerCase().includes('elevated') && s.toLowerCase().includes('amylase'))
        );
      
      return (pancreatitisMention && noSevereFeatures) || 
        (pancreatitisSymptoms && pancreatitisRisk && noSevereFeatures);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Gastroenterology', type: 'secondary' }
      ],
      explain: 'Suspected mild acute pancreatitis without organ dysfunction. Requires IV fluids, pain control, and monitoring for deterioration or complications. Early feeding encouraged if tolerating PO.',
      confidence: 0.85
    }
  },
  {
    id: 'GI-16',
    name: 'Diverticulitis with Complications',
    category: 'Gastrointestinal',
    weight: 8,
    match: (input) => {
      // Core symptoms
      const diverticulitisSymptoms = input.symptoms.some(s => 
        (s.toLowerCase().includes('abdominal pain') && (
          s.toLowerCase().includes('left lower') || 
          s.toLowerCase().includes('llq') ||
          s.toLowerCase().includes('left sided')
        )) ||
        s.toLowerCase().includes('left lower quadrant pain')
      );
      
      // Complications
      const complications = 
        input.flags?.includes('abscess') ||
        input.flags?.includes('microperforation') ||
        input.flags?.includes('localized_peritonitis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('abscess') ||
          s.toLowerCase().includes('perforation') ||
          s.toLowerCase().includes('obstruction') ||
          s.toLowerCase().includes('fistula') ||
          s.toLowerCase().includes('stricture') ||
          s.toLowerCase().includes('rebound tenderness') ||
          s.toLowerCase().includes('guarding')
        );
      
      // Systemic signs
      const systemicSigns = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('chills')
        );
      
      // Risk factors
      const diverticulitisRisk = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('diverticulosis') ||
        h.toLowerCase().includes('diverticulitis') ||
        h.toLowerCase().includes('diverticular disease')
      );
      
      // Direct mention
      const diverticulitisFlag = 
        input.flags?.includes('diverticulitis') ||
        input.flags?.includes('complicated_diverticulitis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('diverticulitis') ||
          s.toLowerCase().includes('diverticular abscess')
        );
      
      return (diverticulitisFlag && (complications || systemicSigns)) || 
        (diverticulitisSymptoms && complications && (systemicSigns || diverticulitisRisk));
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'General Surgery', type: 'secondary' },
        { name: 'Gastroenterology', type: 'tertiary' }
      ],
      explain: 'Suspected complicated diverticulitis with signs of abscess, localized perforation, or obstruction. Requires IV antibiotics, surgical consultation, and CT scan to assess for collections requiring drainage.',
      confidence: 0.9
    }
  },
  {
    id: 'GI-17',
    name: 'Appendicitis',
    category: 'Gastrointestinal',
    weight: 8,
    match: (input) => {
      // Classic migration of pain (periumbilical to RLQ)
      const migratingPain = input.symptoms.some(s => 
        (s.toLowerCase().includes('pain') && s.toLowerCase().includes('migration')) ||
        (s.toLowerCase().includes('pain') && s.toLowerCase().includes('moved')) ||
        (s.toLowerCase().includes('started') && s.toLowerCase().includes('around umbilicus') && s.toLowerCase().includes('right lower'))
      );
      
      // RLQ pain
      const rlqPain = input.symptoms.some(s => 
        (s.toLowerCase().includes('right lower') && s.toLowerCase().includes('pain')) ||
        (s.toLowerCase().includes('rlq') && s.toLowerCase().includes('pain')) ||
        s.toLowerCase().includes('right lower quadrant pain') ||
        s.toLowerCase().includes('mcburney\'s point')
      );
      
      // Associated symptoms
      const associatedSymptoms = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 37.5) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('anorexia') ||
          s.toLowerCase().includes('nausea') ||
          s.toLowerCase().includes('vomiting') ||
          s.toLowerCase().includes('fever')
        );
      
      // Peritoneal signs
      const peritonealSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('rebound') ||
        s.toLowerCase().includes('guarding') ||
        s.toLowerCase().includes('cough tenderness') ||
        s.toLowerCase().includes('percussion tenderness') ||
        s.toLowerCase().includes('rovsing') ||
        s.toLowerCase().includes('psoas') ||
        s.toLowerCase().includes('obturator')
      );
      
      // Direct mention
      const appendicitisMention = 
        input.flags?.includes('appendicitis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('appendicitis')
        );
      
      return appendicitisMention || 
        (rlqPain && (migratingPain || peritonealSigns) && associatedSymptoms);
    },
    result: {
      triageScore: 'Urgent',
      priorityLevel: 2,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'General Surgery', type: 'secondary' }
      ],
      explain: 'Suspected appendicitis: requires prompt surgical consultation, analgesics, antibiotics, and likely appendectomy.',
      confidence: 0.9
    }
  },
  {
    id: 'IMMUNO-1',
    name: 'Anaphylaxis',
    category: 'Immunological/Allergic',
    weight: 10,
    match: (input) => {
      // Exposure to allergen
      const allergenExposure = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('allergen exposure') || 
          s.toLowerCase().includes('allergic reaction') || 
          s.toLowerCase().includes('insect sting') ||
          s.toLowerCase().includes('food allergy') ||
          s.toLowerCase().includes('medication allergy') ||
          s.toLowerCase().includes('after eating') ||
          s.toLowerCase().includes('after taking medication')
        ) || 
        input.flags?.includes('allergen_exposure');
      
      // Skin/mucosal symptoms
      const skinSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('hives') || 
          s.toLowerCase().includes('rash') || 
          s.toLowerCase().includes('itching') ||
          s.toLowerCase().includes('flushing') ||
          s.toLowerCase().includes('swelling') ||
          s.toLowerCase().includes('urticaria')
        );
      
      // Respiratory compromise
      const respiratorySymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('shortness of breath') || 
          s.toLowerCase().includes('wheezing') || 
          s.toLowerCase().includes('stridor') ||
          s.toLowerCase().includes('difficulty breathing') ||
          s.toLowerCase().includes('cannot breathe') ||
          s.toLowerCase().includes('respiratory distress')
        ) || 
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 24);
      
      // Reduced BP / shock
      const cardiovascularSymptoms = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 100) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('hypotension') || 
          s.toLowerCase().includes('dizziness') || 
          s.toLowerCase().includes('syncope') ||
          s.toLowerCase().includes('collapse') ||
          s.toLowerCase().includes('shock') ||
          s.toLowerCase().includes('tachycardia')
        ) || 
        input.flags?.includes('hypotension') || 
        input.flags?.includes('tachycardia');
      
      // GI symptoms
      const giSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('vomiting') || 
          s.toLowerCase().includes('diarrhea') || 
          s.toLowerCase().includes('abdominal pain') ||
          s.toLowerCase().includes('nausea')
        );
      
      // Known severe allergies
      const severeAllergies = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('anaphylaxis') || 
          h.toLowerCase().includes('severe allergy') ||
          h.toLowerCase().includes('epipen')
        ) ||
        input.flags?.includes('history_of_anaphylaxis');
      
      // Direct mention of anaphylaxis
      const anaphylaxisMention = 
        input.flags?.includes('anaphylaxis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('anaphylaxis') || 
          s.toLowerCase().includes('anaphylactic')
        );
      
      // Previous epinephrine administration
      const epinephrineUse = 
        input.flags?.includes('epipen_use') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('used epipen') || 
          s.toLowerCase().includes('epinephrine auto-injector')
        );
      
      return anaphylaxisMention || epinephrineUse || 
        // Classic criteria: skin + respiratory/cardiovascular
        (allergenExposure && skinSymptoms && (respiratorySymptoms || cardiovascularSymptoms)) ||
        // Exposure + 2 organ systems in someone with known severe allergies
        (allergenExposure && severeAllergies && (
          (skinSymptoms && respiratorySymptoms) || 
          (skinSymptoms && cardiovascularSymptoms) || 
          (skinSymptoms && giSymptoms) || 
          (respiratorySymptoms && cardiovascularSymptoms) || 
          (respiratorySymptoms && giSymptoms)
        )) ||
        // Any respiratory compromise after allergen exposure (high concern)
        (allergenExposure && respiratorySymptoms) ||
        // Any cardiovascular compromise after allergen exposure (high concern)
        (allergenExposure && cardiovascularSymptoms);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Allergy & Immunology', type: 'secondary' }
      ],
      explain: 'Anaphylaxis: life-threatening allergic reaction requiring immediate intervention. Immediate administration of epinephrine, airway assessment, and close monitoring for biphasic reactions.',
      confidence: 0.97
    }
  },
  {
    id: 'IMMUNO-2',
    name: 'Severe Drug Reaction (SJS/TEN/DRESS)',
    category: 'Immunological/Allergic',
    weight: 9,
    match: (input) => {
      // Recent medication exposure
      const medicationExposure = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('medication') || 
          s.toLowerCase().includes('drug') || 
          s.toLowerCase().includes('antibiotic') ||
          s.toLowerCase().includes('anticonvulsant') ||
          s.toLowerCase().includes('allopurinol') ||
          s.toLowerCase().includes('sulfa') ||
          s.toLowerCase().includes('nsaid')
        ) || 
        input.flags?.includes('new_medication') ||
        input.flags?.includes('medication_reaction');
      
      // Fever
      const fever = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) || 
        input.symptoms.some(s => s.toLowerCase().includes('fever'));
      
      // Mucocutaneous involvement
      const mucocutaneousInvolvement = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('rash') || 
          s.toLowerCase().includes('blisters') || 
          s.toLowerCase().includes('skin peeling') ||
          s.toLowerCase().includes('mucosal lesions') ||
          s.toLowerCase().includes('target lesions') ||
          s.toLowerCase().includes('erythema multiforme') ||
          s.toLowerCase().includes('painful skin') ||
          s.toLowerCase().includes('raw skin')
        );
      
      // Mucosal involvement (critical for SJS/TEN)
      const mucosalInvolvement = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('mouth sores') || 
          s.toLowerCase().includes('eye pain') || 
          s.toLowerCase().includes('genital sores') ||
          s.toLowerCase().includes('painful eyes') ||
          s.toLowerCase().includes('conjunctivitis') ||
          s.toLowerCase().includes('mucosal')
        );
      
      // Body surface area affected
      const extensiveInvolvement = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('widespread') || 
          s.toLowerCase().includes('extensive') || 
          s.toLowerCase().includes('all over body') ||
          s.toLowerCase().includes('large area')
        ) ||
        input.flags?.includes('extensive_skin_involvement');
      
      // Airway symptoms
      const airwaySymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('shortness of breath') || 
          s.toLowerCase().includes('difficulty breathing') || 
          s.toLowerCase().includes('throat pain') ||
          s.toLowerCase().includes('mouth pain')
        );
      
      // Systemic symptoms 
      const systemicSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('lymphadenopathy') || 
          s.toLowerCase().includes('swollen lymph nodes') || 
          s.toLowerCase().includes('liver involvement') ||
          s.toLowerCase().includes('jaundice') ||
          s.toLowerCase().includes('eosinophilia')
        ) ||
        input.flags?.includes('organ_involvement') ||
        input.flags?.includes('eosinophilia');
      
      // Direct mention of severe cutaneous reactions
      const severeReactionMention = 
        input.flags?.includes('sjs') ||
        input.flags?.includes('ten') ||
        input.flags?.includes('dress') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('stevens-johnson') || 
          s.toLowerCase().includes('toxic epidermal necrolysis') ||
          s.toLowerCase().includes('sjs') ||
          s.toLowerCase().includes('ten') ||
          s.toLowerCase().includes('dress syndrome') ||
          s.toLowerCase().includes('drug reaction with eosinophilia')
        );
      
      return severeReactionMention || 
        // SJS/TEN presentation
        (medicationExposure && fever && mucocutaneousInvolvement && mucosalInvolvement) ||
        // Extensive mucocutaneous involvement
        (mucocutaneousInvolvement && mucosalInvolvement && extensiveInvolvement) ||
        // DRESS syndrome indicators
        (medicationExposure && fever && mucocutaneousInvolvement && systemicSymptoms) ||
        // Any severe drug reaction with airway involvement
        ((severeReactionMention || (medicationExposure && mucocutaneousInvolvement)) && airwaySymptoms);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Dermatology', type: 'secondary' },
        { name: 'Burn Unit', type: 'tertiary' }
      ],
      explain: 'Severe cutaneous adverse reaction (SJS/TEN/DRESS): life-threatening medical emergency with high mortality risk. Requires immediate discontinuation of suspected medication, airway management, fluid resuscitation, and specialized wound care. Burn unit may be needed.',
      confidence: 0.9
    }
  },
  {
    id: 'IMMUNO-3',
    name: 'Angioedema with Airway Threat',
    category: 'Immunological/Allergic',
    weight: 9,
    match: (input) => {
      // Angioedema/swelling
      const angioedema = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('angioedema') || 
          s.toLowerCase().includes('swelling') || 
          s.toLowerCase().includes('facial swelling') ||
          s.toLowerCase().includes('lip swelling') ||
          s.toLowerCase().includes('tongue swelling') ||
          s.toLowerCase().includes('throat swelling')
        ) || 
        input.flags?.includes('angioedema');
      
      // Face/lips involvement (higher risk)
      const facialInvolvement = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('facial swelling') || 
          s.toLowerCase().includes('lip swelling') || 
          s.toLowerCase().includes('periorbital swelling')
        );
      
      // Tongue/pharyngeal/laryngeal involvement (highest risk)
      const airwayInvolvement = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('tongue swelling') || 
          s.toLowerCase().includes('throat swelling') || 
          s.toLowerCase().includes('throat tightness') ||
          s.toLowerCase().includes('difficulty swallowing') ||
          s.toLowerCase().includes('drooling') ||
          s.toLowerCase().includes('hoarseness') ||
          s.toLowerCase().includes('voice change') ||
          s.toLowerCase().includes('stridor')
        ) ||
        input.flags?.includes('tongue_swelling') ||
        input.flags?.includes('laryngeal_edema') ||
        input.flags?.includes('throat_swelling');
      
      // Respiratory distress
      const respiratoryDistress = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('shortness of breath') || 
          s.toLowerCase().includes('difficulty breathing') || 
          s.toLowerCase().includes('respiratory distress')
        ) || 
        (input.vitals?.oxygenSaturation !== undefined && input.vitals.oxygenSaturation < 94) ||
        (input.vitals?.respiratoryRate !== undefined && input.vitals.respiratoryRate > 24);
      
      // ACE inhibitor use (important for non-allergic angioedema)
      const aceInhibitorUse = 
        (input.medications || []).some(m => 
          m.toLowerCase().includes('lisinopril') || 
          m.toLowerCase().includes('enalapril') ||
          m.toLowerCase().includes('ramipril') ||
          m.toLowerCase().includes('pril') ||
          m.toLowerCase().includes('ace inhibitor')
        ) ||
        input.flags?.includes('ace_inhibitor');
      
      // Direct mention of severe or airway-threatening angioedema
      const severeAngioedema = 
        input.flags?.includes('severe_angioedema') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('angioedema') && s.toLowerCase().includes('severe')) || 
          (s.toLowerCase().includes('swelling') && s.toLowerCase().includes('airway'))
        );
      
      return severeAngioedema || 
        // Any angioedema with direct airway involvement
        (angioedema && airwayInvolvement) ||
        // Any angioedema with respiratory symptoms
        (angioedema && respiratoryDistress) ||
        // Even facial angioedema from ACE inhibitors warrants careful assessment
        (angioedema && facialInvolvement && aceInhibitorUse);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Allergy & Immunology', type: 'secondary' },
        { name: 'ENT', type: 'tertiary' }
      ],
      explain: 'Angioedema with potential airway compromise: rapidly progressive threat requiring immediate airway assessment and management. Risk of complete airway obstruction necessitates constant monitoring and early intubation if progressive.',
      confidence: 0.95
    }
  },
  // --- Hematological Rules ---
  {
    id: 'HEMA-1',
    name: 'Severe Bleeding Disorder',
    category: 'Hematological',
    weight: 10,
    match: (input) => {
      // Active bleeding
      const activeBleed = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('bleeding') || 
          s.toLowerCase().includes('hemorrhage') || 
          s.toLowerCase().includes('blood') ||
          s.toLowerCase().includes('hematemesis') ||
          s.toLowerCase().includes('melena') ||
          s.toLowerCase().includes('hematochezia') ||
          s.toLowerCase().includes('epistaxis') ||
          s.toLowerCase().includes('hematuria') ||
          s.toLowerCase().includes('hemoptysis')
        ) || 
        input.flags?.includes('active_bleeding');
      
      // Known bleeding disorder
      const bleedingDisorder = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('hemophilia') || 
          h.toLowerCase().includes('von willebrand') || 
          h.toLowerCase().includes('bleeding disorder') ||
          h.toLowerCase().includes('thrombocytopenia') ||
          h.toLowerCase().includes('coagulopathy') ||
          h.toLowerCase().includes('factor deficiency') ||
          h.toLowerCase().includes('dic') ||
          h.toLowerCase().includes('disseminated intravascular')
        ) ||
        input.flags?.includes('bleeding_disorder') ||
        input.flags?.includes('hemophilia') ||
        input.flags?.includes('coagulopathy');
      
      // Anticoagulant medications
      const anticoagulants = 
        (input.medications || []).some(m => 
          m.toLowerCase().includes('warfarin') || 
          m.toLowerCase().includes('coumadin') ||
          m.toLowerCase().includes('xarelto') ||
          m.toLowerCase().includes('eliquis') ||
          m.toLowerCase().includes('pradaxa') ||
          m.toLowerCase().includes('savaysa') ||
          m.toLowerCase().includes('heparin') ||
          m.toLowerCase().includes('lovenox') ||
          m.toLowerCase().includes('apixaban') ||
          m.toLowerCase().includes('rivaroxaban') ||
          m.toLowerCase().includes('dabigatran') ||
          m.toLowerCase().includes('edoxaban') ||
          m.toLowerCase().includes('doac') ||
          m.toLowerCase().includes('noac')
        ) ||
        input.flags?.includes('anticoagulant');
      
      // Vital sign abnormalities
      const abnormalVitals = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) || 
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 120) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('tachycardia') || 
          s.toLowerCase().includes('hypotension') || 
          s.toLowerCase().includes('shock')
        ) || 
        input.flags?.includes('tachycardia') || 
        input.flags?.includes('hypotension');
      
      // Platelet/coagulation abnormalities
      const labAbnormalities = 
        input.flags?.includes('thrombocytopenia') ||
        input.flags?.includes('elevated_inr') ||
        input.flags?.includes('elevated_ptt') ||
        input.flags?.includes('abnormal_coags');
      
      // DIC indicators
      const dicSigns = 
        input.flags?.includes('dic') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('disseminated intravascular coagulation') || 
          s.toLowerCase().includes('dic')
        );
      
      // Direct mention of severe bleeding
      const severeBleedingMention = 
        input.flags?.includes('severe_bleeding') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('severe') && s.toLowerCase().includes('bleeding')) || 
          (s.toLowerCase().includes('massive') && s.toLowerCase().includes('hemorrhage'))
        );
      
      return severeBleedingMention || dicSigns ||
        // Known bleeding disorder with active bleeding
        (bleedingDisorder && activeBleed) ||
        // Anticoagulant use with significant bleeding
        (anticoagulants && activeBleed && (abnormalVitals || labAbnormalities)) ||
        // Any severe bleeding with hemodynamic compromise
        (activeBleed && abnormalVitals);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Hematology', type: 'secondary' }
      ],
      explain: 'Severe bleeding disorder with active hemorrhage. Requires immediate hemostatic measures, blood product transfusion, and correction of coagulopathy. May need reversal agents for anticoagulants.',
      confidence: 0.95
    }
  },
  {
    id: 'HEMA-2',
    name: 'Sickle Cell Crisis',
    category: 'Hematological',
    weight: 8,
    match: (input) => {
      // Known sickle cell disease
      const sickleCellDisease = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('sickle cell') || 
          h.toLowerCase().includes('scd') || 
          h.toLowerCase().includes('hemoglobin ss') ||
          h.toLowerCase().includes('hemoglobin sc') ||
          h.toLowerCase().includes('hb ss') ||
          h.toLowerCase().includes('hb sc')
        ) ||
        input.flags?.includes('sickle_cell_disease') ||
        input.flags?.includes('scd');
      
      // Vaso-occlusive crisis symptoms
      const painCrisis = 
        input.symptoms.some(s => 
          (s.toLowerCase().includes('pain') && s.toLowerCase().includes('crisis')) || 
          (s.toLowerCase().includes('sickle cell') && s.toLowerCase().includes('pain')) ||
          (s.toLowerCase().includes('severe') && s.toLowerCase().includes('pain')) ||
          s.toLowerCase().includes('vaso-occlusive') ||
          s.toLowerCase().includes('voc')
        ) ||
        input.flags?.includes('voc') ||
        input.flags?.includes('pain_crisis');
      
      // Acute chest syndrome signs
      const acuteChestSyndrome = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('acute chest syndrome') || 
          (s.toLowerCase().includes('chest pain') && sickleCellDisease) ||
          (s.toLowerCase().includes('shortness of breath') && sickleCellDisease) ||
          (s.toLowerCase().includes('fever') && sickleCellDisease && s.toLowerCase().includes('chest'))
        ) ||
        input.flags?.includes('acute_chest_syndrome') ||
        input.flags?.includes('acs');
      
      // Stroke symptoms in SCD
      const strokeSigns = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('stroke') || 
          s.toLowerCase().includes('weakness') ||
          s.toLowerCase().includes('numbness') ||
          s.toLowerCase().includes('slurred speech') ||
          s.toLowerCase().includes('confusion') ||
          s.toLowerCase().includes('headache')
        ) && sickleCellDisease;
      
      // Splenic sequestration
      const splenicSequestration = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('splenic sequestration') || 
          s.toLowerCase().includes('spleen') ||
          s.toLowerCase().includes('left upper quadrant') ||
          s.toLowerCase().includes('abdominal pain')
        ) && sickleCellDisease;
      
      // Severe anemia in SCD
      const severeAnemia = 
        input.flags?.includes('severe_anemia') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('pallor') || 
          s.toLowerCase().includes('fatigue') ||
          s.toLowerCase().includes('weakness') ||
          s.toLowerCase().includes('shortness of breath') ||
          s.toLowerCase().includes('dizziness')
        ) && sickleCellDisease;
      
      // Aplastic crisis
      const aplasticCrisis = 
        input.flags?.includes('aplastic_crisis') ||
        (input.symptoms.some(s => 
          s.toLowerCase().includes('pallor') || 
          s.toLowerCase().includes('fatigue')
        ) && sickleCellDisease && 
        input.symptoms.some(s => s.toLowerCase().includes('infection')));
      
      // Direct mention of sickle cell crisis
      const crisisMention = 
        input.flags?.includes('sickle_cell_crisis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('sickle cell crisis')
        );
      
      return crisisMention || 
        // Acute chest syndrome (life-threatening complication)
        (sickleCellDisease && acuteChestSyndrome) ||
        // Stroke in SCD
        (sickleCellDisease && strokeSigns) ||
        // Severe VOC
        (sickleCellDisease && painCrisis) ||
        // Other serious complications
        (sickleCellDisease && (splenicSequestration || severeAnemia || aplasticCrisis));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Hematology', type: 'secondary' }
      ],
      explain: 'Sickle cell crisis: acute complication requiring immediate intervention. Needs IV fluids, pain management, oxygen, and monitoring for acute chest syndrome or other life-threatening complications.',
      confidence: 0.9
    }
  },
  {
    id: 'HEMA-3',
    name: 'Thrombotic Event',
    category: 'Hematological',
    weight: 9,
    match: (input) => {
      // DVT symptoms
      const dvtSigns = 
        input.symptoms.some(s => 
          (s.toLowerCase().includes('leg') && s.toLowerCase().includes('swelling')) || 
          (s.toLowerCase().includes('leg') && s.toLowerCase().includes('pain')) ||
          (s.toLowerCase().includes('calf') && s.toLowerCase().includes('pain')) ||
          (s.toLowerCase().includes('leg') && s.toLowerCase().includes('red')) ||
          s.toLowerCase().includes('dvt') ||
          s.toLowerCase().includes('deep vein thrombosis')
        ) ||
        input.flags?.includes('dvt') ||
        input.flags?.includes('deep_vein_thrombosis');
      
      // PE symptoms
      const peSigns = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('pulmonary embolism') || 
          s.toLowerCase().includes('pe') ||
          (s.toLowerCase().includes('shortness of breath') && s.toLowerCase().includes('sudden')) ||
          (s.toLowerCase().includes('chest pain') && s.toLowerCase().includes('sharp')) ||
          s.toLowerCase().includes('hemoptysis')
        ) ||
        input.flags?.includes('pe') ||
        input.flags?.includes('pulmonary_embolism');
      
      // CVA/stroke symptoms
      const strokeSigns = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('stroke') || 
          s.toLowerCase().includes('cva') ||
          s.toLowerCase().includes('cerebrovascular accident') ||
          s.toLowerCase().includes('facial droop') ||
          s.toLowerCase().includes('arm weakness') ||
          s.toLowerCase().includes('speech difficulty') ||
          s.toLowerCase().includes('hemiparesis') ||
          s.toLowerCase().includes('aphasia') ||
          s.toLowerCase().includes('sudden confusion')
        ) ||
        input.flags?.includes('stroke') ||
        input.flags?.includes('cva');
      
      // Arterial thrombosis symptoms
      const arterialThrombosis = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('arterial thrombosis') || 
          s.toLowerCase().includes('ischemic limb') ||
          (s.toLowerCase().includes('cold') && s.toLowerCase().includes('limb')) ||
          (s.toLowerCase().includes('pale') && s.toLowerCase().includes('limb')) ||
          (s.toLowerCase().includes('pulseless') && s.toLowerCase().includes('limb')) ||
          s.toLowerCase().includes('acute limb ischemia')
        ) ||
        input.flags?.includes('arterial_thrombosis') ||
        input.flags?.includes('limb_ischemia');
      
      // TTP/HUS/other thrombotic microangiopathy
      const microangiopathy = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('ttp') || 
          s.toLowerCase().includes('thrombotic thrombocytopenic purpura') ||
          s.toLowerCase().includes('hus') ||
          s.toLowerCase().includes('hemolytic uremic syndrome') ||
          s.toLowerCase().includes('microangiopathy')
        ) ||
        input.flags?.includes('ttp') ||
        input.flags?.includes('hus') ||
        input.flags?.includes('microangiopathy');
      
      // Risk factors
      const thrombosisRiskFactors = 
        input.flags?.includes('thrombophilia') ||
        input.flags?.includes('protein_c_deficiency') ||
        input.flags?.includes('protein_s_deficiency') ||
        input.flags?.includes('factor_v_leiden') ||
        input.flags?.includes('prothrombin_mutation') ||
        input.flags?.includes('antiphospholipid_syndrome') ||
        input.flags?.includes('pregnancy') ||
        input.flags?.includes('postpartum') ||
        input.flags?.includes('malignancy') ||
        input.flags?.includes('immobility') ||
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('cancer') || The 
          h.toLowerCase().includes('thrombophilia') ||
          h.toLowerCase().includes('dvt') ||
          h.toLowerCase().includes('pe') ||
          h.toLowerCase().includes('protein c') ||
          h.toLowerCase().includes('protein s') ||
          h.toLowerCase().includes('factor v leiden') ||
          h.toLowerCase().includes('prothrombin')
        );
      
      // Direct mention of severe thrombotic event
      const thrombosisDirectMention = 
        input.flags?.includes('thrombosis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('clot') || 
          s.toLowerCase().includes('thrombus') ||
          s.toLowerCase().includes('thrombosis') ||
          s.toLowerCase().includes('thrombotic')
        );
      
      return microangiopathy || 
        // Any thrombosis with direct mention
        (thrombosisDirectMention && (dvtSigns || peSigns || strokeSigns || arterialThrombosis)) ||
        // PE is always high priority
        peSigns ||
        // Stroke is always high priority
        strokeSigns ||
        // Arterial thrombosis is always high priority
        arterialThrombosis ||
        // DVT with risk factors
        (dvtSigns && thrombosisRiskFactors);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Hematology', type: 'secondary' },
        { name: 'Vascular Surgery', type: 'tertiary' }
      ],
      explain: 'Acute thrombotic event: potentially life-threatening condition requiring immediate evaluation and anticoagulation. Pulmonary embolism, stroke, or arterial thrombosis may require thrombolysis or thrombectomy.',
      confidence: 0.95
    }
  },
  // --- Renal/Urological Rules ---
  {
    id: 'RENAL-1',
    name: 'Acute Kidney Injury',
    category: 'Renal/Urological',
    weight: 8,
    match: (input) => {
      // Elevated creatinine
      const elevatedCreatinine = 
        input.flags?.includes('elevated_creatinine') ||
        input.flags?.includes('aki') ||
        input.flags?.includes('renal_failure') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('elevated creatinine') || 
          s.toLowerCase().includes('rising creatinine') ||
          s.toLowerCase().includes('acute kidney injury') ||
          s.toLowerCase().includes('renal failure')
        );
      
      // Oliguria/anuria
      const oliguria = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('decreased urine output') || 
          s.toLowerCase().includes('oliguria') || 
          s.toLowerCase().includes('anuria') ||
          s.toLowerCase().includes('no urine') ||
          s.toLowerCase().includes('not urinating')
        ) || 
        input.flags?.includes('oliguria') || 
        input.flags?.includes('anuria');
      
      // Fluid overload
      const fluidOverload = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('edema') || 
          s.toLowerCase().includes('fluid overload') || 
          s.toLowerCase().includes('shortness of breath') ||
          s.toLowerCase().includes('swelling')
        ) && (elevatedCreatinine || oliguria);
      
      // Electrolyte disturbances
      const electrolyteDist = 
        input.flags?.includes('hyperkalemia') ||
        input.flags?.includes('elevated_potassium') ||
        input.flags?.includes('electrolyte_abnormality') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('hyperkalemia') || 
          s.toLowerCase().includes('high potassium') ||
          s.toLowerCase().includes('electrolyte abnormality')
        );
      
      // Uremic symptoms
      const uremicSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('confusion') || 
          s.toLowerCase().includes('lethargy') || 
          s.toLowerCase().includes('uremic') ||
          s.toLowerCase().includes('encephalopathy') ||
          s.toLowerCase().includes('pericarditis') ||
          s.toLowerCase().includes('asterixis') ||
          s.toLowerCase().includes('metallic taste')
        ) && elevatedCreatinine;
      
      // Nephrotoxin exposure
      const nephrotoxicExposure = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('contrast') || 
          h.toLowerCase().includes('nsaids') || 
          h.toLowerCase().includes('aminoglycoside') ||
          h.toLowerCase().includes('cisplatin') ||
          h.toLowerCase().includes('amphotericin')
        ) ||
        input.flags?.includes('nephrotoxic_exposure') ||
        (input.flags?.includes('contrast_exposure') && elevatedCreatinine);
      
      // Risk factors
      const riskFactors = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('chronic kidney disease') || 
          h.toLowerCase().includes('ckd') || 
          h.toLowerCase().includes('diabetes') ||
          h.toLowerCase().includes('hypertension') ||
          h.toLowerCase().includes('heart failure')
        ) && elevatedCreatinine;
      
      // Severe AKI
      const severeAKI = 
        input.flags?.includes('severe_aki') ||
        input.flags?.includes('dialysis_needed') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('severe') && s.toLowerCase().includes('kidney')) ||
          s.toLowerCase().includes('dialysis needed')
        );
      
      return severeAKI || 
        // AKI with concerning features
        (elevatedCreatinine && (oliguria || fluidOverload || electrolyteDist || uremicSymptoms)) ||
        // Nephrotoxin exposure with AKI
        (nephrotoxicExposure && elevatedCreatinine) ||
        // High-risk patients with AKI
        (riskFactors && elevatedCreatinine && oliguria);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Nephrology', type: 'secondary' }
      ],
      explain: 'Acute kidney injury with signs of severe renal dysfunction. Requires urgent assessment of volume status, electrolytes, and potential need for dialysis. Nephrotoxic medications should be held.',
      confidence: 0.9
    }
  },
  {
    id: 'RENAL-2',
    name: 'Urinary Obstruction',
    category: 'Renal/Urological',
    weight: 8,
    match: (input) => {
      // Symptoms of obstruction
      const obstructionSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('inability to urinate') || 
          s.toLowerCase().includes('urinary retention') || 
          s.toLowerCase().includes('suprapubic pain') ||
          s.toLowerCase().includes('distended bladder') ||
          s.toLowerCase().includes('cannot urinate')
        ) || 
        input.flags?.includes('urinary_retention') || 
        input.flags?.includes('urinary_obstruction');
      
      // Flank pain suggesting upper tract obstruction
      const flankPain = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('flank pain') || 
          s.toLowerCase().includes('kidney pain') || 
          s.toLowerCase().includes('renal colic')
        );
      
      // Hydronephrosis/hydroureter
      const hydronephrosis = 
        input.flags?.includes('hydronephrosis') ||
        input.flags?.includes('hydroureter') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('hydronephrosis') || 
          s.toLowerCase().includes('hydroureter')
        );
      
      // History of stones or obstructive causes
      const obstructiveHistory = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('kidney stone') || 
          h.toLowerCase().includes('renal stone') || 
          h.toLowerCase().includes('urethral stricture') ||
          h.toLowerCase().includes('bph') ||
          h.toLowerCase().includes('prostate') ||
          h.toLowerCase().includes('neurogenic bladder')
        ) ||
        input.flags?.includes('kidney_stone') ||
        input.flags?.includes('renal_stone') ||
        input.flags?.includes('ureteral_stone');
      
      // Renal dysfunction due to obstruction
      const renalDysfunction = 
        input.flags?.includes('elevated_creatinine') ||
        input.flags?.includes('aki') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('elevated creatinine') || 
          s.toLowerCase().includes('acute kidney injury')
        );
      
      // UTI with obstruction
      const utiWithObstruction = 
        (input.symptoms.some(s => 
          s.toLowerCase().includes('fever') || 
          s.toLowerCase().includes('chills') ||
          s.toLowerCase().includes('urinary tract infection') ||
          s.toLowerCase().includes('uti')
        ) || 
        input.flags?.includes('fever') ||
        input.flags?.includes('uti')) &&
        (obstructionSymptoms || flankPain);
      
      // Bilateral obstruction or solitary kidney
      const highRiskObstruction = 
        input.flags?.includes('bilateral_obstruction') ||
        input.flags?.includes('solitary_kidney') ||
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('solitary kidney') || 
          h.toLowerCase().includes('single kidney') ||
          h.toLowerCase().includes('transplant kidney')
        );
      
      // Direct mention of severe obstruction
      const severeObstruction = 
        input.flags?.includes('severe_obstruction') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('severe') && s.toLowerCase().includes('obstruction')) ||
          (s.toLowerCase().includes('complete') && s.toLowerCase().includes('blockage'))
        );
      
      return severeObstruction || 
        // Infection + obstruction = emergency (obstructive pyelonephritis)
        utiWithObstruction ||
        // Obstruction causing renal injury
        (obstructionSymptoms && renalDysfunction) ||
        // Bilateral or solitary kidney obstruction
        (highRiskObstruction && (obstructionSymptoms || flankPain)) ||
        // Confirmed hydronephrosis
        hydronephrosis;
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Urology', type: 'secondary' }
      ],
      explain: 'Urinary obstruction with risk of renal damage or infection. May require urgent decompression via catheterization or nephrostomy. Obstructive pyelonephritis is a surgical emergency.',
      confidence: 0.85
    }
  },
  {
    id: 'RENAL-3',
    name: 'Testicular Torsion',
    category: 'Renal/Urological',
    weight: 10,
    match: (input) => {
      // Males only
      const isMale = 
        input.gender === 'Male' ||
        input.flags?.includes('male');
      
      // Testicular pain/swelling
      const testicularPain = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('testicular pain') || 
          s.toLowerCase().includes('testicle pain') || 
          s.toLowerCase().includes('testis pain') ||
          s.toLowerCase().includes('scrotal pain') ||
          s.toLowerCase().includes('groin pain') ||
          s.toLowerCase().includes('scrotal swelling') ||
          s.toLowerCase().includes('testicle swelling')
        ) || 
        input.flags?.includes('testicular_pain') || 
        input.flags?.includes('scrotal_pain');
      
      // Sudden onset
      const suddenOnset = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('sudden') || 
          s.toLowerCase().includes('acute') || 
          s.toLowerCase().includes('abrupt')
        ) || 
        input.flags?.includes('sudden_onset');
      
      // Duration < 6 hours (critical time window)
      const withinTimeWindow = 
        input.flags?.includes('recent_onset') ||
        input.flags?.includes('within_6_hours') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('started recently') || 
          s.toLowerCase().includes('few hours')
        ) ||
        // If no time mentioned, assume within window for safety
        !input.symptoms.some(s => 
          s.toLowerCase().includes('days') || 
          s.toLowerCase().includes('weeks')
        );
      
      // Associated symptoms
      const associatedSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('nausea') || 
          s.toLowerCase().includes('vomiting') || 
          s.toLowerCase().includes('abdominal pain')
        );
      
      // Exam findings (if documented)
      const examFindings = 
        input.flags?.includes('high_riding_testis') ||
        input.flags?.includes('horizontal_testis') ||
        input.flags?.includes('absent_cremasteric_reflex') ||
        input.flags?.includes('blue_dot_sign') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('high riding') || 
          s.toLowerCase().includes('horizontal') ||
          s.toLowerCase().includes('absent cremasteric') ||
          s.toLowerCase().includes('blue dot')
        );
      
      // Prior episodes
      const priorEpisodes = 
        input.flags?.includes('prior_torsion') ||
        input.flags?.includes('intermittent_torsion') ||
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('prior torsion') || 
          h.toLowerCase().includes('bell clapper deformity')
        );
      
      // Direct mention
      const torsionMention = 
        input.flags?.includes('testicular_torsion') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('testicular torsion') || 
          s.toLowerCase().includes('torsion of the testis') ||
          s.toLowerCase().includes('torsion of testis') ||
          s.toLowerCase().includes('twisted testicle')
        );
      
      return torsionMention || 
        // Classic presentation in males
        (isMale && testicularPain && suddenOnset && withinTimeWindow) ||
        // Suspicious for torsion
        (isMale && testicularPain && (examFindings || (suddenOnset && associatedSymptoms)));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Urology', type: 'secondary' }
      ],
      explain: 'Suspected testicular torsion: surgical emergency requiring immediate intervention within 4-6 hours to preserve testicular function. Immediate urological evaluation needed for manual detorsion and/or surgical exploration.',
      confidence: 0.95
    }
  },
  // --- Psychiatric/Behavioral Rules ---
  {
    id: 'PSYCH-1',
    name: 'Suicidal Behavior',
    category: 'Psychiatric/Behavioral',
    weight: 10,
    match: (input) => {
      // Suicidal ideation or attempt
      const suicidalBehavior = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('suicidal') || 
          s.toLowerCase().includes('suicide') || 
          s.toLowerCase().includes('wants to die') ||
          s.toLowerCase().includes('wants to end life') ||
          s.toLowerCase().includes('wants to kill') ||
          s.toLowerCase().includes('self-harm') ||
          s.toLowerCase().includes('self harm')
        ) || 
        input.flags?.includes('suicidal') || 
        input.flags?.includes('suicide_risk');
      
      // Active attempt or plan
      const activeRisk = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('suicide attempt') || 
          s.toLowerCase().includes('attempted suicide') || 
          s.toLowerCase().includes('overdose') ||
          s.toLowerCase().includes('self-poisoning') ||
          s.toLowerCase().includes('hanging') ||
          s.toLowerCase().includes('cut') ||
          s.toLowerCase().includes('jumped') ||
          s.toLowerCase().includes('suicide plan') ||
          s.toLowerCase().includes('specific plan')
        ) || 
        input.flags?.includes('suicide_attempt') || 
        input.flags?.includes('active_plan');
      
      // Access to means
      const accessToMeans = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('has gun') || 
          s.toLowerCase().includes('has weapon') || 
          s.toLowerCase().includes('has pills') ||
          s.toLowerCase().includes('access to') ||
          s.toLowerCase().includes('stockpiled')
        ) || 
        input.flags?.includes('access_to_means');
      
      // Intent
      const intent = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('determined') || 
          s.toLowerCase().includes('intent') || 
          s.toLowerCase().includes('serious') ||
          s.toLowerCase().includes('committed to') ||
          s.toLowerCase().includes('no reason to live')
        ) || 
        input.flags?.includes('strong_intent');
      
      // Concerning associated behaviors
      const riskBehaviors = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('giving away possessions') || 
          s.toLowerCase().includes('saying goodbye') || 
          s.toLowerCase().includes('suicide note') ||
          s.toLowerCase().includes('final arrangements') ||
          s.toLowerCase().includes('putting affairs in order')
        ) || 
        input.flags?.includes('concerning_behaviors');
      
      // Risk factors 
      const riskFactors = 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('depression') || 
          h.toLowerCase().includes('bipolar') || 
          h.toLowerCase().includes('schizophrenia') ||
          h.toLowerCase().includes('previous suicide attempt') ||
          h.toLowerCase().includes('substance abuse') ||
          h.toLowerCase().includes('ptsd')
        ) ||
        input.flags?.includes('psychiatric_history') ||
        input.flags?.includes('substance_abuse');
      
      // Direct high-risk statements
      const highRiskStatements = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('going to kill myself') || 
          s.toLowerCase().includes('better off dead') || 
          s.toLowerCase().includes('can\'t go on')
        );
      
      return activeRisk || highRiskStatements ||
        // Suicidal ideation with plan and means
        (suicidalBehavior && accessToMeans && intent) ||
        // Suicidal ideation with concerning behaviors 
        (suicidalBehavior && riskBehaviors) ||
        // Suicidal ideation with multiple risk factors
        (suicidalBehavior && intent && riskFactors);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Psychiatry', type: 'secondary' }
      ],
      explain: 'Acute suicide risk requiring immediate intervention. Patient needs constant observation, removal of all dangerous items, and urgent psychiatric evaluation. May need hospitalization for safety.',
      confidence: 0.95
    }
  },
  {
    id: 'PSYCH-2',
    name: 'Acute Psychosis',
    category: 'Psychiatric/Behavioral',
    weight: 9,
    match: (input) => {
      // Psychotic symptoms
      const psychoticSymptoms = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('hallucination') || 
          s.toLowerCase().includes('delusion') || 
          s.toLowerCase().includes('paranoia') ||
          s.toLowerCase().includes('hearing voices') ||
          s.toLowerCase().includes('seeing things') ||
          s.toLowerCase().includes('thought disorder') ||
          s.toLowerCase().includes('disorganized') ||
          s.toLowerCase().includes('bizarre behavior')
        ) || 
        input.flags?.includes('psychosis') || 
        input.flags?.includes('hallucinations') ||
        input.flags?.includes('delusions');
      
      // Impaired reality testing
      const impairmentSeverity = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('unable to care') || 
          s.toLowerCase().includes('not eating') ||
          s.toLowerCase().includes('not drinking') ||
          s.toLowerCase().includes('not sleeping') ||
          s.toLowerCase().includes('command hallucinations') ||
          s.toLowerCase().includes('complete disconnect')
        ) || 
        input.flags?.includes('severe_impairment') || 
        input.flags?.includes('command_hallucinations');
      
      // Potential causes requiring medical intervention
      const medicalCauses = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') || 
          s.toLowerCase().includes('head injury') || 
          s.toLowerCase().includes('drug use') ||
          s.toLowerCase().includes('substance use') ||
          s.toLowerCase().includes('intoxication') ||
          s.toLowerCase().includes('withdrawal')
        ) || 
        input.flags?.includes('fever') || 
        input.flags?.includes('head_injury') ||
        input.flags?.includes('substance_induced');
      
      // Risk to self or others due to psychosis
      const riskBehaviors = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('threatening') || 
          s.toLowerCase().includes('dangerous') || 
          s.toLowerCase().includes('harm') ||
          s.toLowerCase().includes('violent') ||
          s.toLowerCase().includes('aggressive') ||
          s.toLowerCase().includes('unable to care for self')
        ) || 
        input.flags?.includes('risk_to_self') || 
        input.flags?.includes('risk_to_others');
      
      // Medication non-compliance in known psychiatric illness
      const medicationIssues = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('stopped medication') || 
          s.toLowerCase().includes('off meds') || 
          s.toLowerCase().includes('not taking')
        ) && 
        (input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('schizophrenia') || 
          h.toLowerCase().includes('bipolar') || 
          h.toLowerCase().includes('psychosis')
        );
      
      // First psychotic episode (needs urgent evaluation)
      const firstEpisode = 
        input.flags?.includes('first_episode') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('first episode') || 
          s.toLowerCase().includes('never happened before')
        ) && 
        !(input.medicalHistory || []).some(h => 
          h.toLowerCase().includes('psychosis') || 
          h.toLowerCase().includes('schizophrenia') || 
          h.toLowerCase().includes('bipolar')
        );
      
      // Direct mention of acute psychosis
      const acutePsychosisMention = 
        input.flags?.includes('acute_psychosis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('acute psychosis') || 
          s.toLowerCase().includes('psychotic break')
        );
      
      return acutePsychosisMention || 
        // Severe psychotic symptoms especially with risks
        (psychoticSymptoms && (impairmentSeverity || riskBehaviors)) ||
        // Psychosis with possible medical cause (delirium)
        (psychoticSymptoms && medicalCauses) ||
        // Medication non-compliance in psychiatric patient
        medicationIssues ||
        // First psychotic episode (needs comprehensive workup)
        (psychoticSymptoms && firstEpisode);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Psychiatry', type: 'secondary' }
      ],
      explain: 'Acute psychosis: severe impairment in reality testing with potential danger to self/others. Requires immediate assessment for medical causes, safety evaluation, and psychiatric intervention.',
      confidence: 0.9
    }
  },
  {
    id: 'PSYCH-3',
    name: 'Violent Agitation',
    category: 'Psychiatric/Behavioral',
    weight: 10,
    match: (input) => {
      // Violent behavior
      const violentBehavior = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('violent') || 
          s.toLowerCase().includes('aggression') || 
          s.toLowerCase().includes('aggressive') ||
          s.toLowerCase().includes('threatening') ||
          s.toLowerCase().includes('throwing') ||
          s.toLowerCase().includes('breaking') ||
          s.toLowerCase().includes('hitting') ||
          s.toLowerCase().includes('attacked')
        ) || 
        input.flags?.includes('violent') || 
        input.flags?.includes('aggressive') ||
        input.flags?.includes('agitated');
      
      // Severe agitation
      const severeAgitation = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('extreme agitation') || 
          s.toLowerCase().includes('severely agitated') || 
          s.toLowerCase().includes('out of control') ||
          s.toLowerCase().includes('uncontrollable') ||
          s.toLowerCase().includes('extreme distress')
        ) || 
        input.flags?.includes('severe_agitation');
      
      // Direct threat to others
      const dangerToOthers = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('threatening others') || 
          s.toLowerCase().includes('homicidal') || 
          s.toLowerCase().includes('wants to hurt') ||
          s.toLowerCase().includes('intent to harm')
        ) || 
        input.flags?.includes('homicidal') || 
        input.flags?.includes('danger_to_others');
      
      // Restraint needed or used
      const restraintNeeded = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('restraint') || 
          s.toLowerCase().includes('held down') || 
          s.toLowerCase().includes('security')
        ) || 
        input.flags?.includes('restraints_needed') ||
        input.flags?.includes('security_called');
      
      // Potential medical causes of agitation
      const medicalCauses = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') || 
          s.toLowerCase().includes('head injury') || 
          s.toLowerCase().includes('hypoxia') ||
          s.toLowerCase().includes('intoxication') ||
          s.toLowerCase().includes('withdrawal') ||
          s.toLowerCase().includes('drug use') ||
          s.toLowerCase().includes('substance use') ||
          s.toLowerCase().includes('alcohol')
        ) || 
        input.flags?.includes('medical_cause') || 
        input.flags?.includes('substance_induced');
      
      // Weapon possession
      const weaponPossession = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('weapon') || 
          s.toLowerCase().includes('knife') || 
          s.toLowerCase().includes('gun')
        ) || 
        input.flags?.includes('weapon');
      
      // Unable to redirect or de-escalate
      const unableToCommunicate = 
        input.symptoms.some(s => 
          s.toLowerCase().includes('unable to redirect') || 
          s.toLowerCase().includes('won\'t listen') || 
          s.toLowerCase().includes('can\'t be calmed') ||
          s.toLowerCase().includes('not responding to') ||
          s.toLowerCase().includes('de-escalation unsuccessful')
        ) || 
        input.flags?.includes('unable_to_redirect');
      
      // Direct mention of emergency agitation
      const emergencyAgitationMention = 
        input.flags?.includes('emergency_agitation') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('emergency sedation') || 
          s.toLowerCase().includes('chemical restraint needed')
        );
      
      return emergencyAgitationMention || weaponPossession || 
        // Violent behavior with threats or restraint needed
        (violentBehavior && (dangerToOthers || restraintNeeded)) ||
        // Severe agitation that can't be managed
        (severeAgitation && unableToCommunicate) ||
        // Agitation with medical cause (needs urgent medical evaluation)
        ((violentBehavior || severeAgitation) && medicalCauses);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Psychiatry', type: 'secondary' }
      ],
      explain: 'Violent agitation posing immediate safety risk to patient and others. Requires urgent safety measures, medical evaluation for organic causes, and possibly rapid tranquilization. Security personnel may be needed.',
      confidence: 0.95
    }
  },
  // --- Ophthalmological Rules ---
  {
    id: 'OPHTHAL-1',
    name: 'Chemical Eye Burn',
    category: 'Ophthalmological',
    weight: 10,
    match: (input) => {
      // Direct mention of chemical exposure to eye
      const chemicalBurnMention = 
        input.flags?.includes('chemical_eye_burn') ||
        input.flags?.includes('eye_chemical_exposure') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('chemical') && s.toLowerCase().includes('eye')) ||
          (s.toLowerCase().includes('chemical') && s.toLowerCase().includes('splash')) ||
          (s.toLowerCase().includes('acid') && s.toLowerCase().includes('eye')) ||
          (s.toLowerCase().includes('alkali') && s.toLowerCase().includes('eye')) ||
          s.toLowerCase().includes('chemical burn eye') ||
          s.toLowerCase().includes('eye burn')
        );
      
      // Eye symptoms after chemical exposure
      const eyeSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('eye pain') ||
        s.toLowerCase().includes('burning eyes') ||
        s.toLowerCase().includes('vision loss') ||
        s.toLowerCase().includes('blurred vision') ||
        s.toLowerCase().includes('eye redness')
      );
      
      const chemicalExposure = input.symptoms.some(s => 
        s.toLowerCase().includes('chemical') ||
        s.toLowerCase().includes('acid') ||
        s.toLowerCase().includes('alkali') ||
        s.toLowerCase().includes('bleach') ||
        s.toLowerCase().includes('ammonia') ||
        s.toLowerCase().includes('solvent')
      );
      
      return chemicalBurnMention || (eyeSymptoms && chemicalExposure);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Ophthalmology', type: 'secondary' }
      ],
      explain: 'Chemical eye burn: time-critical emergency requiring immediate irrigation. Permanent vision loss may occur within minutes, especially with alkali burns.',
      confidence: 0.97
    }
  },
  {
    id: 'OPHTHAL-2',
    name: 'Acute Angle-Closure Glaucoma',
    category: 'Ophthalmological',
    weight: 9,
    match: (input) => {
      // Classic symptoms of acute angle-closure glaucoma
      const eyeSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('severe eye pain') ||
        s.toLowerCase().includes('eye pressure') ||
        (s.toLowerCase().includes('eye') && s.toLowerCase().includes('pain') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('intense') || 
          s.toLowerCase().includes('worst')
        ))
      );
      
      const visionSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('blurred vision') ||
        s.toLowerCase().includes('vision loss') ||
        s.toLowerCase().includes('decreased vision') ||
        s.toLowerCase().includes('halos around lights') ||
        s.toLowerCase().includes('colored rings')
      );
      
      const associatedSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('headache') ||
        s.toLowerCase().includes('nausea') ||
        s.toLowerCase().includes('vomiting') ||
        s.toLowerCase().includes('photophobia')
      );
      
      // Direct mention
      const angleClosure = 
        input.flags?.includes('angle_closure_glaucoma') ||
        input.flags?.includes('acute_glaucoma') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('angle closure glaucoma') ||
          s.toLowerCase().includes('acute glaucoma')
        );
      
      // Elevated intraocular pressure mention
      const elevatedIOP = 
        input.flags?.includes('elevated_iop') ||
        input.flags?.includes('high_eye_pressure') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('high eye pressure') ||
          s.toLowerCase().includes('elevated intraocular pressure')
        );
      
      return angleClosure || elevatedIOP || (eyeSymptoms && (visionSymptoms || associatedSymptoms));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Ophthalmology', type: 'primary' },
        { name: 'Emergency Medicine', type: 'secondary' }
      ],
      explain: 'Acute angle-closure glaucoma: ocular emergency requiring immediate IOP reduction. Delay in treatment > 6-12 hours significantly increases risk of permanent vision loss.',
      confidence: 0.95
    }
  },
  {
    id: 'OPHTHAL-3',
    name: 'Retinal Detachment',
    category: 'Ophthalmological',
    weight: 8,
    match: (input) => {
      // Classic symptoms of retinal detachment
      const floaters = input.symptoms.some(s => 
        s.toLowerCase().includes('floaters') ||
        s.toLowerCase().includes('spots') ||
        s.toLowerCase().includes('specks') ||
        s.toLowerCase().includes('cobwebs')
      );
      
      const flashes = input.symptoms.some(s => 
        s.toLowerCase().includes('flashes of light') ||
        s.toLowerCase().includes('flashing lights') ||
        s.toLowerCase().includes('lightning streaks')
      );
      
      const visionChanges = input.symptoms.some(s => 
        s.toLowerCase().includes('curtain') ||
        s.toLowerCase().includes('shadow') ||
        s.toLowerCase().includes('veil') ||
        s.toLowerCase().includes('peripheral vision loss')
      );
      
      // Direct mention of retinal detachment
      const detachmentMention = 
        input.flags?.includes('retinal_detachment') ||
        input.symptoms.some(s => s.toLowerCase().includes('retinal detachment'));
      
      // Risk factors
      const riskFactors = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('myopia') ||
        h.toLowerCase().includes('cataract surgery') ||
        h.toLowerCase().includes('trauma') ||
        h.toLowerCase().includes('previous retinal detachment') ||
        h.toLowerCase().includes('diabetic retinopathy')
      );
      
      return detachmentMention || 
        (floaters && flashes) ||
        (floaters && visionChanges) ||
        (flashes && visionChanges) ||
        ((floaters || flashes || visionChanges) && riskFactors);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Ophthalmology', type: 'primary' },
        { name: 'Emergency Medicine', type: 'secondary' }
      ],
      explain: 'Suspected retinal detachment: urgent ophthalmological emergency requiring same-day evaluation and likely surgical intervention. Early treatment maximizes chances of vision preservation.',
      confidence: 0.9
    }
  },
  // --- ENT Rules ---
  {
    id: 'ENT-1',
    name: 'Severe Epistaxis',
    category: 'ENT',
    weight: 8,
    match: (input) => {
      // Direct mention of severe nosebleed
      const severeEpistaxisMention = 
        input.flags?.includes('severe_epistaxis') ||
        input.flags?.includes('uncontrolled_epistaxis') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('nose') && s.toLowerCase().includes('bleed') && (
            s.toLowerCase().includes('severe') ||
            s.toLowerCase().includes('profuse') ||
            s.toLowerCase().includes('uncontrolled') ||
            s.toLowerCase().includes('massive')
          )) ||
          s.toLowerCase().includes('severe epistaxis') ||
          s.toLowerCase().includes('severe nosebleed')
        );
      
      // Signs of hypovolemia/shock from blood loss
      const hypovolemicSigns = 
        (input.vitals?.systolicBP !== undefined && input.vitals.systolicBP < 90) ||
        (input.vitals?.heartRate !== undefined && input.vitals.heartRate > 110) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('dizziness') ||
          s.toLowerCase().includes('lightheaded') ||
          s.toLowerCase().includes('syncope') ||
          s.toLowerCase().includes('pale') ||
          s.toLowerCase().includes('diaphoresis')
        );
      
      // Posterior bleeding or concerning features
      const posteriorSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('posterior') ||
        s.toLowerCase().includes('blood in throat') ||
        s.toLowerCase().includes('swallowing blood')
      );
      
      // Anticoagulation history increases severity
      const anticoagulationRisk = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('warfarin') ||
        h.toLowerCase().includes('coumadin') ||
        h.toLowerCase().includes('xarelto') ||
        h.toLowerCase().includes('eliquis') ||
        h.toLowerCase().includes('pradaxa') ||
        h.toLowerCase().includes('anticoagulant') ||
        h.toLowerCase().includes('blood thinner')
      );
      
      return severeEpistaxisMention || 
        (input.symptoms.some(s => s.toLowerCase().includes('nosebleed') || s.toLowerCase().includes('epistaxis')) && 
          (hypovolemicSigns || posteriorSigns || anticoagulationRisk));
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'ENT', type: 'secondary' }
      ],
      explain: 'Severe epistaxis: potentially life-threatening blood loss requiring immediate control measures. Posterior bleeding or anticoagulation increase risk of airway compromise and hemodynamic instability.',
      confidence: 0.9
    }
  },
  {
    id: 'ENT-2',
    name: 'Airway Foreign Body',
    category: 'ENT',
    weight: 10,
    match: (input) => {
      // Direct mention of foreign body in airway/throat
      const foreignBodyMention = 
        input.flags?.includes('airway_foreign_body') ||
        input.flags?.includes('throat_foreign_body') ||
        input.symptoms.some(s => 
          (s.toLowerCase().includes('foreign') && (
            s.toLowerCase().includes('airway') ||
            s.toLowerCase().includes('throat') ||
            s.toLowerCase().includes('trachea') ||
            s.toLowerCase().includes('bronchus') ||
            s.toLowerCase().includes('larynx')
          )) ||
          s.toLowerCase().includes('object in throat') ||
          s.toLowerCase().includes('something stuck in throat')
        );
      
      // Choking or airway obstruction signs
      const chokingSigns = input.symptoms.some(s => 
        s.toLowerCase().includes('choking') ||
        s.toLowerCase().includes('gagging') ||
        s.toLowerCase().includes('can't breathe') ||
        s.toLowerCase().includes('cannot breathe') ||
        s.toLowerCase().includes('difficulty breathing') ||
        s.toLowerCase().includes('unable to speak') ||
        s.toLowerCase().includes('airway obstruction') ||
        s.toLowerCase().includes('stridor')
      );
      
      // History of aspiration
      const aspirationHistory = input.symptoms.some(s => 
        s.toLowerCase().includes('aspiration') ||
        s.toLowerCase().includes('inhaled object') ||
        s.toLowerCase().includes('swallowed object') ||
        s.toLowerCase().includes('was eating when')
      );
      
      return foreignBodyMention || (chokingSigns && aspirationHistory);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'ENT', type: 'secondary' }
      ],
      explain: 'Suspected airway foreign body: immediate life-threatening emergency requiring rapid assessment and intervention. Complete airway obstruction can cause death within minutes.',
      confidence: 0.95
    }
  },
  {
    id: 'ENT-3',
    name: 'Deep Space Neck Infection',
    category: 'ENT',
    weight: 9,
    match: (input) => {
      // Direct mention of deep neck infection
      const neckInfectionMention = 
        input.flags?.includes('deep_neck_infection') ||
        input.flags?.includes('ludwig_angina') ||
        input.flags?.includes('retropharyngeal_abscess') ||
        input.flags?.includes('peritonsillar_abscess') ||
        input.flags?.includes('parapharyngeal_abscess') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('ludwig') ||
          s.toLowerCase().includes('retropharyngeal abscess') ||
          s.toLowerCase().includes('peritonsillar abscess') ||
          s.toLowerCase().includes('parapharyngeal abscess') ||
          s.toLowerCase().includes('deep neck infection') ||
          s.toLowerCase().includes('neck abscess')
        );
      
      // Signs of severe infection with neck/throat involvement
      const neckSymptoms = input.symptoms.some(s => 
        s.toLowerCase().includes('neck swelling') ||
        s.toLowerCase().includes('neck pain') ||
        s.toLowerCase().includes('difficulty swallowing') ||
        s.toLowerCase().includes('painful swallowing') ||
        s.toLowerCase().includes('dysphagia') ||
        s.toLowerCase().includes('odynophagia') ||
        s.toLowerCase().includes('trismus') ||
        s.toLowerCase().includes('inability to open mouth')
      );
      
      // Systemic/severe infection signs
      const systemic = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.5) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('chills') ||
          s.toLowerCase().includes('rigors')
        );
      
      // Airway compromise signs
      const airwayCompromise = input.symptoms.some(s => 
        s.toLowerCase().includes('difficulty breathing') ||
        s.toLowerCase().includes('stridor') ||
        s.toLowerCase().includes('drooling') ||
        s.toLowerCase().includes('muffled voice') ||
        s.toLowerCase().includes('airway compromise')
      );
      
      return neckInfectionMention || 
        (neckSymptoms && systemic && airwayCompromise) || 
        (neckSymptoms && airwayCompromise);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'ENT', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Deep space neck infection: rapidly progressive infection that can compromise airway, spread to mediastinum, or cause sepsis. Immediate IV antibiotics, surgical evaluation, and potentially airway management required.',
      confidence: 0.9
    }
  },
  // --- Musculoskeletal Rules (Non-Traumatic) ---
  {
    id: 'MSK-1',
    name: 'Compartment Syndrome',
    category: 'Musculoskeletal',
    weight: 10,
    match: (input) => {
      // Direct mention of compartment syndrome
      const compartmentSyndromeMention = 
        input.flags?.includes('compartment_syndrome') ||
        input.symptoms.some(s => s.toLowerCase().includes('compartment syndrome'));
      
      // Classic symptoms of compartment syndrome (6 Ps)
      const pain = input.symptoms.some(s => 
        (s.toLowerCase().includes('pain') && (
          s.toLowerCase().includes('severe') || 
          s.toLowerCase().includes('extreme') ||
          s.toLowerCase().includes('excruciating') ||
          s.toLowerCase().includes('disproportionate') ||
          s.toLowerCase().includes('out of proportion')
        )) ||
        (s.toLowerCase().includes('pain') && s.toLowerCase().includes('passive movement'))
      );
      
      const pressurePallor = input.symptoms.some(s => 
        s.toLowerCase().includes('tense compartment') ||
        s.toLowerCase().includes('firm compartment') ||
        s.toLowerCase().includes('hard compartment') ||
        s.toLowerCase().includes('tight compartment') ||
        s.toLowerCase().includes('swollen extremity') ||
        s.toLowerCase().includes('pallor') ||
        s.toLowerCase().includes('pale extremity')
      );
      
      const paresthesia = input.symptoms.some(s => 
        s.toLowerCase().includes('paresthesia') ||
        s.toLowerCase().includes('numbness') ||
        s.toLowerCase().includes('tingling')
      );
      
      const paralysis = input.symptoms.some(s => 
        s.toLowerCase().includes('weakness') ||
        s.toLowerCase().includes('paralysis') ||
        s.toLowerCase().includes('decreased movement') ||
        s.toLowerCase().includes('motor deficit')
      );
      
      const pulselessness = input.symptoms.some(s => 
        s.toLowerCase().includes('decreased pulse') ||
        s.toLowerCase().includes('diminished pulse') ||
        s.toLowerCase().includes('absent pulse') ||
        s.toLowerCase().includes('pulselessness')
      );
      
      // Risk factors for compartment syndrome
      const riskFactors = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('fracture') ||
        h.toLowerCase().includes('crush injury') ||
        h.toLowerCase().includes('tight cast') ||
        h.toLowerCase().includes('burn') ||
        h.toLowerCase().includes('snake bite') ||
        h.toLowerCase().includes('reperfusion') ||
        h.toLowerCase().includes('vascular surgery')
      ) || input.symptoms.some(s => 
        s.toLowerCase().includes('fracture') ||
        s.toLowerCase().includes('crush') ||
        s.toLowerCase().includes('tight cast') ||
        s.toLowerCase().includes('burn')
      );
      
      // At least 3 of the classic signs with risk factor, or direct mention
      const signCount = [pain, pressurePallor, paresthesia, paralysis, pulselessness].filter(Boolean).length;
      
      return compartmentSyndromeMention || (signCount >= 3 && riskFactors);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Orthopedics', type: 'secondary' },
        { name: 'Vascular Surgery', type: 'tertiary' }
      ],
      explain: 'Suspected compartment syndrome: surgical emergency requiring immediate fasciotomy to prevent permanent tissue damage. Delays beyond 6-8 hours lead to irreversible muscle and nerve damage.',
      confidence: 0.95
    }
  },
  {
    id: 'MSK-2',
    name: 'Septic Arthritis',
    category: 'Musculoskeletal',
    weight: 9,
    match: (input) => {
      // Direct mention of septic arthritis
      const septicArthritisMention = 
        input.flags?.includes('septic_arthritis') ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('septic arthritis') ||
          s.toLowerCase().includes('infected joint')
        );
      
      // Joint symptoms
      const jointSymptoms = input.symptoms.some(s => 
        (s.toLowerCase().includes('joint') && (
          s.toLowerCase().includes('pain') ||
          s.toLowerCase().includes('swelling') ||
          s.toLowerCase().includes('redness') ||
          s.toLowerCase().includes('warmth')
        )) ||
        s.toLowerCase().includes('monoarthritis') ||
        s.toLowerCase().includes('monoarticular') ||
        s.toLowerCase().includes('hot joint') ||
        s.toLowerCase().includes('swollen joint')
      );
      
      // Reduced joint mobility
      const reducedMobility = input.symptoms.some(s => 
        s.toLowerCase().includes('unable to move joint') ||
        s.toLowerCase().includes('can't move joint') ||
        s.toLowerCase().includes('limited range of motion') ||
        s.toLowerCase().includes('decreased motion')
      );
      
      // Systemic symptoms suggesting infection
      const systemicSymptoms = 
        (input.vitals?.temperature !== undefined && input.vitals.temperature > 38.0) ||
        input.symptoms.some(s => 
          s.toLowerCase().includes('fever') ||
          s.toLowerCase().includes('chills') ||
          s.toLowerCase().includes('sweats')
        );
      
      // Risk factors for septic arthritis
      const riskFactors = (input.medicalHistory || []).some(h => 
        h.toLowerCase().includes('immunocompromised') ||
        h.toLowerCase().includes('diabetes') ||
        h.toLowerCase().includes('rheumatoid') ||
        h.toLowerCase().includes('prosthetic joint') ||
        h.toLowerCase().includes('joint injection') ||
        h.toLowerCase().includes('iv drug use') ||
        h.toLowerCase().includes('recent joint surgery')
      );
      
      return septicArthritisMention || 
        (jointSymptoms && reducedMobility && systemicSymptoms) ||
        (jointSymptoms && systemicSymptoms && riskFactors);
    },
    result: {
      triageScore: 'Critical',
      priorityLevel: 1,
      suggestedDepartments: [
        { name: 'Emergency Medicine', type: 'primary' },
        { name: 'Orthopedics', type: 'secondary' },
        { name: 'Infectious Disease', type: 'tertiary' }
      ],
      explain: 'Suspected septic arthritis: medical emergency requiring joint aspiration, IV antibiotics, and possible surgical irrigation. Delays in treatment can lead to permanent joint destruction within days.',
      confidence: 0.9
    }
  }
];

export function applyEnhancedTriageRules(input: TriageRequest): TriageRuleResult {
  // Find all matching rules
  const matches = enhancedTriageRules.filter(rule => rule.match(input));
  if (matches.length === 0) {
    return {
      triageScore: 'Low',
      priorityLevel: 5,
      suggestedDepartments: [{ name: 'General Medicine', type: 'primary' }],
      explainability: ['No high-risk criteria met → default to Low priority.']
    };
  }
  // Pick the rule with the highest weight
  const topRule = matches.reduce((a, b) => (a.weight > b.weight ? a : b));
  const explanations = matches.map(m => m.result.explain);
  return {
    triageScore: topRule.result.triageScore,
    priorityLevel: topRule.result.priorityLevel,
    suggestedDepartments: topRule.result.suggestedDepartments,
    explainability: explanations
  };
} 