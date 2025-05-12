# Medical Triage System with Pediatric and Geriatric Domain Support

This repository contains a medical triage system that incorporates general medical triage rules along with pediatric-specific and geriatric-specific considerations.

## Overview

The triage system is designed to categorize and prioritize patients based on their symptoms, vital signs, medical history, and other relevant factors. The system is organized into domains/categories to better handle different types of medical conditions.

The system includes **Pediatric-Specific** and **Geriatric-Specific** domains to enhance the triage process by accounting for the unique considerations needed when triaging these patient populations.

## System Components

The triage system consists of multiple rule sets that can be used independently or combined:

- **Basic Triage Rules** (`triageRules.ts`): Simple triage rules for common conditions
- **Enhanced Triage Rules** (`enhancedTriageRules.ts`): Comprehensive rules with detailed criteria
- **Pediatric-Specific Rules** (`pediatricTriageRules.ts`): Rules tailored for pediatric patients
- **Geriatric-Specific Rules** (`geriatricTriageRules.ts`): Rules tailored for elderly patients
- **Combined Rules** (`combinedTriageRules.ts`): Integration of all rule sets

## Pediatric Domain Features

The pediatric domain adds special considerations for children, including:

1. **Age-appropriate vital sign ranges**
   - Different normal respiratory rates based on age
   - Different heart rate norms
   - BP considerations

2. **Special handling of conditions that present differently in children**
   - Fever in infants under 3 months (treated as critical)
   - Febrile seizures in young children
   - Dehydration (progresses more rapidly)
   - Respiratory distress (different warning signs)

3. **Conditions common to or specific to pediatrics**
   - Congenital heart disease
   - Pediatric asthma presentations
   - Pediatric diabetes and DKA
   - Ingestion/poisoning (higher risk in children)

## Geriatric Domain Features

The geriatric domain adds special considerations for elderly patients, including:

1. **Different clinical presentations in older adults**
   - Atypical presentations of common conditions
   - Blunted fever response
   - Subtle symptoms for serious conditions

2. **Age-related risk factors**
   - Fall risk, especially with anticoagulation
   - Polypharmacy and medication adverse effects
   - Cognitive changes and delirium
   - Higher risk of fractures

3. **Conditions requiring special attention in elderly**
   - Delirium as sign of underlying conditions
   - Urinary tract infections presenting as confusion
   - Cardiac conditions with atypical symptoms
   - Stroke with time-sensitive interventions

## Implemented Pediatric Rules

The pediatric domain includes 10 rules:

1. **Pediatric Fever - Infant**: Critical priority for infants under 3 months with fever
2. **Pediatric Respiratory Distress**: Age-specific respiratory rate evaluations
3. **Pediatric Dehydration**: Special attention to dehydration with gastroenteritis
4. **Pediatric Congenital Heart Disease**: Recognition of CHD-specific warning signs
5. **Pediatric Asthma Exacerbation**: Child-specific asthma presentations
6. **Pediatric Diabetes**: Specific criteria for diabetic emergencies in children
7. **Pediatric Seizure**: Handling of first-time and febrile seizures
8. **Pediatric Ingestion/Poisoning**: Higher risk assessments for toxic exposures
9. **Pediatric Rash with Fever**: Recognizing potentially dangerous infections
10. **Pediatric Sickle Cell Crisis**: Special considerations for pediatric sickle cell patients

## Implemented Geriatric Rules

The geriatric domain includes 10 rules:

1. **Geriatric Fall with Anticoagulation**: Urgent evaluation for potential intracranial hemorrhage
2. **Geriatric Confusion/Delirium**: Recognition of acute onset confusion as a serious sign
3. **Geriatric Fever**: Lower threshold for significant fever in elderly patients
4. **Geriatric Polypharmacy Adverse Effects**: Medication interactions and side effects
5. **Geriatric Chest Pain**: Atypical presentations of cardiac conditions in elderly
6. **Geriatric Abdominal Pain**: Risk of serious conditions with minimal symptoms
7. **Geriatric Urinary Tract Infection**: Recognizing atypical UTI presentations
8. **Geriatric Respiratory Infection**: Higher risk of pneumonia and complications
9. **Geriatric Stroke Symptoms**: Time-critical evaluation for potential interventions
10. **Geriatric Fracture Risk**: Higher risk of fractures with minor trauma

## How to Use

The system is designed to be flexible. You can use the domain-specific rules either:

1. **Independently** - For domain-specific triage
2. **Combined with other rules** - For comprehensive triage that includes all considerations

### Example: Combined Usage

```typescript
import { applyCombinedTriageRules } from './lib/combinedTriageRules';

// Patient data
const patientData = {
  age: 72,
  dateOfBirth: '1952-02-15',
  symptoms: ['dizziness', 'confusion', 'mild fever'],
  vitals: {
    temperature: 37.8,
    heartRate: 88,
    respiratoryRate: 20,
    oxygenSaturation: 96
  },
  medicalHistory: ['hypertension', 'diabetes', 'atrial fibrillation']
};

// Perform triage
const triageResult = applyCombinedTriageRules(patientData);

console.log(`Triage Score: ${triageResult.triageScore}`);
console.log(`Priority Level: ${triageResult.priorityLevel}`);
console.log(`Departments: ${triageResult.suggestedDepartments.map(d => d.name).join(', ')}`);
```

## Examples

The repository includes example cases for both pediatric and geriatric patients:

- `lib/examples/pediatricTriageExample.ts`: Demonstrates how the pediatric rules are applied
- `lib/examples/geriatricTriageExample.ts`: Demonstrates how the geriatric rules are applied

To run the examples:

1. Uncomment the function call at the bottom of the example files
2. Execute the files with TypeScript

## Implementation Notes

The domain-specific triage rules implement the following design principles:

1. **Age-specific criteria**: Rules check if the patient is in the appropriate age range
2. **Different normal ranges**: Age-stratified vital sign evaluations
3. **Risk stratification**: Conditions with higher risk in specific populations are given higher weights
4. **Integration**: Rules can be used alongside other domains

## Future Extensions

The triage system can be extended with additional domains for:

- Obstetrics and pregnancy-related conditions
- Psychiatric emergencies
- Trauma-specific evaluations
- More detailed disease-specific evaluations 