# SmartMedi AI Triage System

## Overview

The SmartMedi AI Triage System is a comprehensive medical triage solution that leverages multiple AI techniques to provide accurate patient assessments. The system combines rule-based logic with advanced AI approaches including transformer models for symptom analysis, Bayesian networks for risk stratification, and reinforcement learning for continuous improvement based on clinician feedback.

## System Architecture

The triage system consists of the following components:

1. **Rule-based Triage Engine**
   - Basic rule set for common conditions
   - Enhanced rule set with comprehensive criteria
   - Pediatric-specific rules
   - Geriatric-specific rules
   - Combined rules integration

2. **Transformer Model for Symptom Analysis**
   - Natural language processing of symptoms
   - Symptom severity assessment
   - Symptom relationship mapping
   - Follow-up question generation

3. **Bayesian Network for Risk Stratification**
   - Risk factor identification
   - Deterioration probability calculation
   - Risk factor relationship modeling
   - Evidence-based reasoning chain

4. **Reinforcement Learning from Clinician Feedback**
   - Continuous system improvement
   - Adaptation based on real-world outcomes
   - Weight adjustment for diagnosis and department accuracy
   - Performance tracking over time

5. **Comprehensive Response Generation**
   - Triage score and priority level assignment
   - Estimated wait time calculation
   - Potential diagnosis generation
   - Recommended action suggestions
   - Risk factor identification
   - Detailed explainability data

## Implementation Details

### 1. Rule-based Triage Engine

The rule-based engine evaluates patient data against a set of predefined rules based on clinical guidelines. The system includes:

- Basic triage rules for common conditions (`triageRules.ts`)
- Enhanced rules with detailed criteria (`enhancedTriageRules.ts`)
- Pediatric-specific rules for children (`pediatricTriageRules.ts`)
- Geriatric-specific rules for elderly patients (`geriatricTriageRules.ts`)
- Combined rules that integrate all rule sets (`combinedTriageRules.ts`)

Rules evaluate symptoms, vital signs, medical history, age, and other factors to determine the appropriate triage score.

### 2. Transformer Model for Symptom Analysis

The transformer model (`transformerModel.ts`) analyzes patient symptoms using NLP techniques to:

- Assess symptom severity on a scale of 0-1
- Identify related symptoms that might indicate specific conditions
- Group symptoms into clinical categories (respiratory, gastrointestinal, neurological, etc.)
- Determine when more information is needed
- Generate contextual follow-up questions based on provided symptoms

This component enhances the system's ability to understand and interpret patient-reported symptoms.

### 3. Bayesian Network for Risk Stratification

The Bayesian network (`bayesianNetwork.ts`) uses probabilistic reasoning to:

- Identify risk factors based on symptoms, medical history, and vital signs
- Calculate deterioration probability over different time frames
- Generate an overall risk assessment
- Provide an evidence-based reasoning chain explaining the risk assessment

The network includes specialized nodes for cardiac, respiratory, septic, neurological, and diabetic emergencies.

### 4. Reinforcement Learning System

The reinforcement learning system (`reinforcementLearning.ts`) enables continuous improvement by:

- Processing clinician feedback on triage outcomes
- Adjusting weights for symptom-condition associations
- Tracking diagnosis and department suggestion accuracy
- Applying learned adjustments to new triage requests

This creates a feedback loop that improves the system's accuracy over time based on real-world outcomes.

### 5. Comprehensive Triage API

The triage API (`app/api/triage/route.ts`) integrates all components to:

- Process patient data
- Apply rule-based triage
- Analyze symptoms using the transformer model
- Assess risks using the Bayesian network
- Generate comprehensive triage responses
- Store responses for feedback and learning

## Database Structure

The system uses the following database tables:

1. **triage_responses**
   - Stores all triage requests and responses
   - Includes request data, response data, and timestamps
   - Flags for training examples

2. **triage_feedback**
   - Stores clinician feedback on triage assessments
   - Links to original triage responses
   - Records actual outcomes vs. predicted outcomes
   - Tracks adjustments made based on feedback

3. **triage_learning_state**
   - Stores the current state of the reinforcement learning system
   - Includes learned weights and confidence scores
   - Maintains historical performance metrics

## Setup and Testing

The system includes scripts for:

1. **Database Setup**: `scripts/triage-db-setup.ts`
   - Creates required database tables
   - Sets up indexes for performance
   - Initializes learning state

2. **System Testing**: `scripts/test-triage.ts`
   - Runs test cases through the triage system
   - Verifies functionality of all components
   - Displays detailed outputs for verification

To set up and test the system:

```bash
# Set up database tables
npm run setup:triage-db

# Test the triage system
npm run triage:test
```

## API Usage

The triage API accepts POST requests with patient data and returns comprehensive triage assessments.

### Request Format:

```json
{
  "symptoms": ["chest pain", "shortness of breath"],
  "medicalHistory": ["hypertension", "diabetes"],
  "age": 65,
  "vitalSigns": {
    "heartRate": 110,
    "respiratoryRate": 24,
    "temperature": 37.2,
    "oxygenSaturation": 94,
    "systolicBP": 160,
    "diastolicBP": 95
  }
}
```

### Response Format:

```json
{
  "triageScore": "High",
  "priorityLevel": 2,
  "confidenceScore": 85,
  "suggestedDepartments": [
    {
      "name": "Cardiology",
      "type": "primary"
    }
  ],
  "estimatedWaitMinutes": 15,
  "potentialDiagnoses": [
    "Possible Angina",
    "Myocardial Infarction"
  ],
  "recommendedActions": [
    "ECG",
    "Cardiac Enzyme Tests",
    "Vital Signs Monitoring"
  ],
  "riskFactors": [
    "Cardiac Complications",
    "Hypertension"
  ],
  "deteriorationProbability": [
    {
      "timeFrame": "1 hour",
      "probability": 0.2
    },
    {
      "timeFrame": "4 hours",
      "probability": 0.3
    },
    {
      "timeFrame": "24 hours",
      "probability": 0.4
    }
  ],
  "explainabilityData": {
    "keyFactors": [
      "Chest pain triggers High triage score",
      "History of hypertension increases cardiac risk",
      "Elevated heart rate (110) is concerning"
    ],
    "modelVersion": "enhanced-rules-v1.1-with-bayesian-risk",
    "reasoningChain": [
      "Chest pain detected",
      "Vital signs assessed",
      "Medical history considered"
    ],
    "symptomSeverity": {
      "chest pain": 0.8,
      "shortness of breath": 0.7
    },
    "symptomRelations": {
      "respiratory": [
        "shortness of breath"
      ],
      "cardiac": [
        "chest pain"
      ]
    },
    "needsMoreInfo": false
  }
}
```

## Future Enhancements

The triage system can be further enhanced with:

1. **Advanced NLP Models**: Replace the simulated transformer model with a production-grade NLP model for improved symptom analysis.

2. **Full Bayesian Network**: Implement a complete Bayesian network with more complex relationships between risk factors.

3. **Reinforcement Learning Integration**: Enhance the reinforcement learning system with more sophisticated algorithms for weight adjustment.

4. **Additional Domain Support**: Expand the system with support for additional domains like psychiatric emergencies, obstetrics, and trauma.

5. **Real-time Monitoring**: Add real-time monitoring of triage performance and learning metrics.

## Conclusion

The SmartMedi AI Triage System combines rule-based medicine with advanced AI techniques to provide accurate, explainable, and continuously improving triage assessments. The system's modular architecture allows for easy extension and enhancement as medical knowledge and AI capabilities evolve. 