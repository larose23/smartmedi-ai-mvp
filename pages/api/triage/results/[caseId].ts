import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { triageService } from '../../../../services/triageService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { caseId } = req.query;

  if (!caseId || typeof caseId !== 'string') {
    return res.status(400).json({ error: 'Invalid case ID' });
  }

  try {
    // Fetch the triage case
    const { data: triageCase, error: caseError } = await supabase
      .from('triage_cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError) {
      throw caseError;
    }

    if (!triageCase) {
      return res.status(404).json({ error: 'Triage case not found' });
    }

    // Get the transformer model results
    const transformerResults = await triageService.getTransformerResults(caseId);

    // Format the response
    const response = {
      severityHeatmap: transformerResults.symptomSeverities.map(symptom => ({
        symptom: symptom.name,
        severity: symptom.severity,
        confidence: symptom.confidence,
      })),
      relationships: transformerResults.relationships.map(rel => ({
        source: rel.sourceSymptom,
        target: rel.targetSymptom,
        confidence: rel.confidence,
        type: rel.relationshipType,
      })),
      followUpQuestions: transformerResults.followUpQuestions.map(q => ({
        question: q.text,
        relevance: q.relevanceScore,
        context: q.context,
      })),
      temporalPattern: {
        onset: triageCase.onset_time,
        duration: triageCase.duration,
        frequency: triageCase.frequency,
        pattern: transformerResults.temporalPattern.map(point => ({
          x: point.timestamp,
          y: point.intensity,
        })),
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching triage results:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 