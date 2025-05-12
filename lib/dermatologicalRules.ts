// Temporary file with dermatological rules to add to enhancedTriageRules.ts

// --- Dermatological/Cutaneous Rules ---
const dermatologicalRules = [
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