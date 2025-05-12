import { NextRequest } from 'next/server';
import { successResponse, errorResponse, withErrorHandling, validateRequest } from '@/lib/api/routeHelpers';
import { HttpStatus } from '@/lib/api/types';
import type { TriageRequest, TriageResponse } from '@/types/triage';
import { applyEnhancedTriageRules } from '@/lib/enhancedTriageRules';
import { analyzeSymptomsByTransformer } from '@/lib/transformerModel';
import { calculateRiskStratification } from '@/lib/bayesianNetwork';
import { applyLearningAdjustments } from '@/lib/reinforcementLearning';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TriageSystem } from '@/services/ai/triageSystem';
import { z } from 'zod';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for triage request
const TriageRequestSchema = z.object({
  patientDescription: z.string(),
  vitals: z.object({
    heartRate: z.number(),
    bloodPressure: z.object({
      systolic: z.number(),
      diastolic: z.number()
    }),
    respiratoryRate: z.number(),
    oxygenSaturation: z.number(),
    temperature: z.number()
  }),
  vitalHistory: z.array(z.object({
    timestamp: z.string(),
    vitals: z.object({
      heartRate: z.number(),
      bloodPressure: z.object({
        systolic: z.number(),
        diastolic: z.number()
      }),
      respiratoryRate: z.number(),
      oxygenSaturation: z.number(),
      temperature: z.number()
    })
  })),
  comorbidities: z.array(z.object({
    name: z.string(),
    severity: z.enum(['mild', 'moderate', 'severe']),
    isActive: z.boolean()
  })),
  riskFactors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    weight: z.number(),
    category: z.string(),
    description: z.string()
  }))
});

// Helper: Validate request body
function isValidTriageRequest(body: any): body is TriageRequest {
  return (
    typeof body === 'object' &&
    Array.isArray(body.symptoms)
  );
}

// Helper: Calculate estimated wait time based on triage score
function calculateEstimatedWaitTime(triageScore: string): number {
  switch (triageScore) {
    case 'High':
      return 10; // 10 minutes
    case 'Medium':
      return 30; // 30 minutes
    case 'Low':
      return 60; // 60 minutes
    default:
      return 45; // Default
  }
}

// Helper: Generate potential diagnoses based on symptoms and analysis
function generatePotentialDiagnoses(request: TriageRequest, analysis: any): string[] {
  // This would be a more complex algorithm in practice
  return analysis.possibleConditions || [];
}

// Helper: Generate recommended actions based on triage score and risk analysis
function generateRecommendedActions(
  triageScore: string,
  request: TriageRequest,
  riskAnalysis: any
): string[] {
  const urgency = triageScore === 'High' ? 'immediate' : triageScore === 'Medium' ? 'prompt' : 'routine';
  const actions = [`${urgency} medical evaluation`];
  
  // Add additional recommendations based on risk factors
  if (riskAnalysis.identifiedRiskFactors.length > 0) {
    actions.push(`monitor for ${riskAnalysis.identifiedRiskFactors.map((rf: any) => rf.factor).join(', ')}`);
  }
  
  // Add symptom-specific actions
  if (request.symptoms.includes('chest_pain')) {
    actions.push('ECG monitoring');
  }
  
  if (request.symptoms.includes('shortness_of_breath')) {
    actions.push('oxygen saturation monitoring');
  }
  
  return actions;
}

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = TriageRequestSchema.parse(body);

    // Initialize triage system
    const triageSystem = new TriageSystem(process.env.OPENAI_API_KEY!);

    // Process triage case
    const result = await triageSystem.processTriageCase(
      validatedData.patientDescription,
      validatedData.vitals,
      validatedData.vitalHistory.map(h => ({
        timestamp: new Date(h.timestamp),
        vitals: h.vitals
      })),
      validatedData.comorbidities,
      validatedData.riskFactors
    );

    // Log triage result to Supabase
    const { error: logError } = await supabase
      .from('triage_logs')
      .insert({
        patient_description: validatedData.patientDescription,
        vitals: validatedData.vitals,
        vital_history: validatedData.vitalHistory,
        comorbidities: validatedData.comorbidities,
        risk_factors: validatedData.riskFactors,
        triage_decision: result.triageDecision,
        risk_assessment: result.riskAssessment,
        clinical_validation: result.clinicalValidation,
        decision_metrics: result.metrics,
        decision_path: result.decisionPath,
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging triage result:', logError);
      throw new Error('Failed to log triage result');
    }

    // Return success response
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error processing triage request:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to process triage request'
    }, { status: 500 });
  }
} 