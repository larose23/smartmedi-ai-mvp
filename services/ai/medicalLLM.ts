import OpenAI from 'openai';
import { MedicalSymptom } from '@/types/medical';

interface LLMResponse {
  symptoms: MedicalSymptom[];
  confidence: number;
  explanation: string;
}

export class MedicalLLMService {
  private openai: OpenAI;
  private model: string = 'gpt-4';

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async parseSymptoms(text: string): Promise<LLMResponse> {
    try {
      const prompt = this.constructPrompt(text);
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a medical AI assistant specialized in symptom analysis. Extract and classify symptoms from patient descriptions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      return this.parseLLMResponse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error in medical LLM service:', error);
      throw new Error('Failed to parse symptoms using LLM');
    }
  }

  private constructPrompt(text: string): string {
    return `Analyze the following patient description and extract symptoms:
    "${text}"
    
    Please provide:
    1. List of identified symptoms with their severity
    2. Confidence score for each symptom
    3. Brief explanation of the analysis
    
    Format the response as JSON.`;
  }

  private parseLLMResponse(response: string): LLMResponse {
    try {
      const parsed = JSON.parse(response);
      return {
        symptoms: parsed.symptoms,
        confidence: parsed.confidence,
        explanation: parsed.explanation
      };
    } catch (error) {
      throw new Error('Failed to parse LLM response');
    }
  }
} 