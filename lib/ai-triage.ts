import OpenAI from 'openai';
import { CheckIn } from '@/types/triage';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AITriageAnalysis {
  triage_score: 'High' | 'Medium' | 'Low';
  suggested_department: string;
  estimated_wait_minutes: number;
  potential_diagnoses: string[];
  recommended_actions: string[];
  risk_factors: string[];
  reasoning: string;
}

// Helper function to safely handle array or string properties
const formatArray = (value: string | string[] | undefined): string => {
  if (!value) return 'None provided';
  if (Array.isArray(value)) return value.join(', ');
  return value;
};

export async function analyzeSymptomsWithAI(checkIn: CheckIn): Promise<AITriageAnalysis> {
  const prompt = `As a medical triage AI, analyze the following patient information and provide a detailed assessment:

Primary Symptom: ${checkIn.primary_symptom}
Additional Symptoms: ${formatArray(checkIn.additional_symptoms)}
Pain Level: ${checkIn.symptoms.pain_level}/10
Pain Location: ${checkIn.symptoms.pain_location}
${checkIn.symptoms.pain_characteristics ? `Pain Characteristics: ${formatArray(checkIn.symptoms.pain_characteristics)}` : ''}
Impact on Activities: ${formatArray(checkIn.symptoms.impact_on_activities)}
Medical History: ${formatArray(checkIn.symptoms.medical_history)}
Current Symptoms: ${formatArray(checkIn.symptoms.current_symptoms)}

Please provide a detailed analysis in the following JSON format:
{
  "triage_score": "High" | "Medium" | "Low",
  "suggested_department": "string",
  "estimated_wait_minutes": number,
  "potential_diagnoses": string[],
  "recommended_actions": string[],
  "risk_factors": string[],
  "reasoning": "string"
}

Consider the severity of symptoms, potential life-threatening conditions, and appropriate medical response.`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a medical triage AI assistant. Analyze patient symptoms and provide accurate triage recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-4",
      response_format: { type: "json_object" }
    });

    // Safely handle potentially null content
    const content = completion.choices[0].message.content || '{}';
    const response = JSON.parse(content);
    return response as AITriageAnalysis;
  } catch (error) {
    console.error('Error in AI triage analysis:', error);
    throw new Error('Failed to analyze symptoms with AI');
  }
} 