# Medical Triage Rules System

This directory contains the rules for the medical triage system.

## Triage Rules

The triage system is organized into domains/categories to help properly categorize and prioritize patients:

- `triageRules.ts` - Basic triage rules
- `enhancedTriageRules.ts` - Comprehensive triage rules with more detailed criteria
- `pediatricTriageRules.ts` - Pediatric-specific considerations
- `geriatricTriageRules.ts` - Geriatric-specific considerations

## Pediatric-Specific Considerations

The pediatric-specific rules (`pediatricTriageRules.ts`) can be incorporated alongside other domains in the main triage system. These rules are designed to account for:

1. Special considerations for existing conditions in children
2. Age-specific normal values (such as different respiratory rate ranges)
3. Different presentations of common conditions in pediatric patients
4. Conditions that may be more serious in children than adults

## Geriatric-Specific Considerations

The geriatric-specific rules (`geriatricTriageRules.ts`) address the unique needs of elderly patients and can be incorporated alongside other domains. These rules account for:

1. Special considerations for existing conditions in elderly patients
2. Atypical presentations of common conditions in older adults
3. Age-related risks such as falls, polypharmacy, and cognitive changes
4. Higher risk of serious complications from seemingly minor symptoms

## How to Use Domain-Specific Rules

To incorporate the pediatric and geriatric rules into your triage system:

```typescript
// In your triage application file
import { enhancedTriageRules } from './enhancedTriageRules';
import { pediatricTriageRules } from './pediatricTriageRules';
import { geriatricTriageRules } from './geriatricTriageRules';
import type { TriageRequest, TriageRuleResult } from '@/types/triage';

// Combine all rules
const allTriageRules = [
  ...enhancedTriageRules,
  ...pediatricTriageRules,
  ...geriatricTriageRules
];

// Apply rules function
export function applyAllTriageRules(input: TriageRequest): TriageRuleResult {
  // Find all matching rules
  const matches = allTriageRules.filter(rule => rule.match(input));
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
```

## Pediatric Rules Overview

The pediatric rules include:

1. **Pediatric Fever - Infant** - Special handling for fever in infants under 3 months
2. **Pediatric Respiratory Distress** - Age-specific respiratory rate ranges
3. **Pediatric Dehydration** - Children dehydrate more quickly than adults
4. **Pediatric Congenital Heart Disease** - Specific considerations for CHD
5. **Pediatric Asthma Exacerbation** - Children may deteriorate rapidly
6. **Pediatric Diabetes** - Risk of DKA develops more rapidly in children
7. **Pediatric Seizure** - Febrile seizures and first-time seizures
8. **Pediatric Ingestion/Poisoning** - Children are more vulnerable to toxic effects
9. **Pediatric Rash with Fever** - Risk of serious infections like meningococcemia
10. **Pediatric Sickle Cell Crisis** - Special considerations for pediatric sickle cell patients

## Geriatric Rules Overview

The geriatric rules include:

1. **Geriatric Fall with Anticoagulation** - High risk for intracranial hemorrhage
2. **Geriatric Confusion/Delirium** - Acute onset delirium as indicator of serious conditions
3. **Geriatric Fever** - Lower threshold for significant fever in elderly
4. **Geriatric Polypharmacy Adverse Effects** - Medication interactions and adverse effects
5. **Geriatric Chest Pain** - Atypical presentations of cardiac conditions
6. **Geriatric Abdominal Pain** - Risk of serious conditions with minimal symptoms
7. **Geriatric Urinary Tract Infection** - Atypical presentations in elderly
8. **Geriatric Respiratory Infection** - Higher risk of complications
9. **Geriatric Stroke Symptoms** - Time-critical evaluation for potential interventions
10. **Geriatric Fracture Risk** - Higher risk of fractures with minor trauma 