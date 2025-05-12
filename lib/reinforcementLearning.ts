import { supabase } from '@/lib/supabase';
import type { TriageResponse } from '@/types/triage';

// Types for the feedback system
export interface ClinicianFeedback {
  triage_id: string;
  actual_triage_score: string;
  actual_priority_level: number;
  actual_department: string;
  actual_diagnoses: string[];
  feedback_comments: string;
  clinician_id: string;
}

export interface FeedbackAdjustment {
  symptom: string;
  conditionAssociation: {
    condition: string;
    strengthChange: number; // -1 to 1 range
  }[];
  priorityAdjustment: number; // -2 to 2 range
}

export interface LearningState {
  symptomWeights: {
    [symptom: string]: {
      [condition: string]: number;
    };
  };
  diagnosisConfidence: {
    [diagnosis: string]: {
      correctPredictions: number;
      totalPredictions: number;
    };
  };
  departmentAccuracy: {
    [department: string]: {
      correctAssignments: number;
      totalAssignments: number;
    };
  };
  lastUpdated: string;
}

/**
 * Process clinician feedback to improve triage decision making
 * This is a simplified implementation for the MVP
 * In production, this would use more sophisticated RL algorithms
 */
export async function processFeedback(feedback: ClinicianFeedback): Promise<{ success: boolean; adjustments: FeedbackAdjustment[] }> {
  try {
    // 1. Retrieve the original triage response
    const { data: triageData, error: triageError } = await supabase
      .from('triage_responses')
      .select('*')
      .eq('id', feedback.triage_id)
      .single();
    
    if (triageError || !triageData) {
      console.error('Error retrieving triage data:', triageError);
      return { success: false, adjustments: [] };
    }
    
    const originalTriage = triageData as unknown as TriageResponse;
    
    // 2. Retrieve current learning state
    const learningState = await getLearningState();
    
    // 3. Generate adjustments based on feedback
    const adjustments: FeedbackAdjustment[] = [];
    
    // 3.1 Compare triage scores and adjust symptom weights
    if (originalTriage.triageScore !== feedback.actual_triage_score) {
      const symptoms = extractSymptoms(originalTriage);
      const priorityDifference = getPriorityDifference(
        originalTriage.triageScore, 
        feedback.actual_triage_score
      );
      
      // Create adjustments for each symptom
      symptoms.forEach(symptom => {
        const adjustment: FeedbackAdjustment = {
          symptom,
          conditionAssociation: [],
          priorityAdjustment: priorityDifference * 0.1 // Scale down the effect
        };
        
        // If we have actual diagnoses, adjust condition associations
        feedback.actual_diagnoses.forEach(diagnosis => {
          adjustment.conditionAssociation.push({
            condition: diagnosis,
            strengthChange: priorityDifference > 0 ? 0.05 : -0.05
          });
        });
        
        adjustments.push(adjustment);
      });
    }
    
    // 3.2 Compare departments and adjust department weights
    if (originalTriage.suggestedDepartments[0]?.name !== feedback.actual_department) {
      // Track department accuracy
      const departmentKey = originalTriage.suggestedDepartments[0]?.name || 'Unknown';
      if (!learningState.departmentAccuracy[departmentKey]) {
        learningState.departmentAccuracy[departmentKey] = {
          correctAssignments: 0,
          totalAssignments: 1
        };
      } else {
        learningState.departmentAccuracy[departmentKey].totalAssignments += 1;
      }
      
      // Track correct department
      const correctDeptKey = feedback.actual_department;
      if (!learningState.departmentAccuracy[correctDeptKey]) {
        learningState.departmentAccuracy[correctDeptKey] = {
          correctAssignments: 1,
          totalAssignments: 1
        };
      } else {
        learningState.departmentAccuracy[correctDeptKey].correctAssignments += 1;
        learningState.departmentAccuracy[correctDeptKey].totalAssignments += 1;
      }
    } else if (originalTriage.suggestedDepartments[0]?.name === feedback.actual_department) {
      // Correct department assignment
      const departmentKey = originalTriage.suggestedDepartments[0]?.name;
      if (!learningState.departmentAccuracy[departmentKey]) {
        learningState.departmentAccuracy[departmentKey] = {
          correctAssignments: 1,
          totalAssignments: 1
        };
      } else {
        learningState.departmentAccuracy[departmentKey].correctAssignments += 1;
        learningState.departmentAccuracy[departmentKey].totalAssignments += 1;
      }
    }
    
    // 3.3 Compare diagnoses and update diagnosis confidence
    const predictedDiagnoses = originalTriage.potentialDiagnoses || [];
    const actualDiagnoses = feedback.actual_diagnoses || [];
    
    // For each predicted diagnosis, check if it was correct
    predictedDiagnoses.forEach(diagnosis => {
      const diagnosisKey = diagnosis.toLowerCase();
      const wasCorrect = actualDiagnoses.some(
        actual => actual.toLowerCase() === diagnosisKey
      );
      
      if (!learningState.diagnosisConfidence[diagnosisKey]) {
        learningState.diagnosisConfidence[diagnosisKey] = {
          correctPredictions: wasCorrect ? 1 : 0,
          totalPredictions: 1
        };
      } else {
        if (wasCorrect) {
          learningState.diagnosisConfidence[diagnosisKey].correctPredictions += 1;
        }
        learningState.diagnosisConfidence[diagnosisKey].totalPredictions += 1;
      }
    });
    
    // 4. Update learning state with timestamp
    learningState.lastUpdated = new Date().toISOString();
    await saveLearningState(learningState);
    
    // 5. Save feedback record for future analysis
    await supabase.from('triage_feedback').insert({
      triage_id: feedback.triage_id,
      actual_triage_score: feedback.actual_triage_score,
      actual_priority_level: feedback.actual_priority_level,
      actual_department: feedback.actual_department,
      actual_diagnoses: feedback.actual_diagnoses,
      feedback_comments: feedback.feedback_comments,
      clinician_id: feedback.clinician_id,
      adjustments_made: adjustments,
      created_at: new Date().toISOString()
    });
    
    return { success: true, adjustments };
  } catch (error) {
    console.error('Error processing feedback:', error);
    return { success: false, adjustments: [] };
  }
}

/**
 * Get current learning state from database or initialize default
 */
async function getLearningState(): Promise<LearningState> {
  const { data, error } = await supabase
    .from('triage_learning_state')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) {
    // Return default initial state
    return {
      symptomWeights: {},
      diagnosisConfidence: {},
      departmentAccuracy: {},
      lastUpdated: new Date().toISOString()
    };
  }
  
  return data.state as LearningState;
}

/**
 * Save updated learning state to database
 */
async function saveLearningState(state: LearningState): Promise<void> {
  await supabase.from('triage_learning_state').insert({
    state,
    created_at: new Date().toISOString()
  });
}

/**
 * Helper function to extract symptoms from triage response
 */
function extractSymptoms(triage: TriageResponse): string[] {
  const explainability = triage.explainabilityData?.keyFactors || [];
  const symptoms: string[] = [];
  
  explainability.forEach(factor => {
    // Simple extraction logic - in production this would be more sophisticated
    const match = factor.match(/Symptom: ([\w\s]+)/i);
    if (match && match[1]) {
      symptoms.push(match[1].trim());
    }
  });
  
  return symptoms;
}

/**
 * Helper function to determine priority difference
 */
function getPriorityDifference(
  originalScore: string, 
  actualScore: string
): number {
  const priorityMap: {[key: string]: number} = {
    'Critical': 1,
    'High': 2,
    'Medium': 3,
    'Low': 4,
    'Non-Urgent': 5
  };
  
  const originalPriority = priorityMap[originalScore] || 3;
  const actualPriority = priorityMap[actualScore] || 3;
  
  // Return difference (negative if actual priority was more urgent)
  return originalPriority - actualPriority;
}

/**
 * Apply learned adjustments to a new triage request
 * This is called during triage to incorporate learning
 */
export function applyLearningAdjustments(
  triageResponse: TriageResponse,
  symptoms: string[]
): TriageResponse {
  // This function would be enhanced in production to apply more sophisticated
  // adjustments based on the reinforcement learning model
  
  // For the MVP, we're keeping this simple
  return triageResponse;
} 