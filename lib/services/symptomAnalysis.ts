import { securityLogger } from '../security/logger';
import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';

interface SymptomAnalysis {
  primarySymptoms: string[];
  relatedSymptoms: string[];
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
  frequency: string;
  triggers: string[];
  alleviatingFactors: string[];
  medicalTerminology: string[];
  suggestedQuestions: string[];
  confidence: number;
}

interface SymptomValidator {
  isValid: boolean;
  suggestedTerm?: string;
  confidence: number;
  alternatives: string[];
}

class SymptomAnalysisService {
  private static instance: SymptomAnalysisService;
  private readonly MEDICAL_TERMS: Set<string>;
  private readonly SYMPTOM_PATTERNS: Map<string, RegExp>;
  private readonly SEVERITY_INDICATORS: Map<string, number>;

  private constructor() {
    // Initialize medical terminology database
    this.MEDICAL_TERMS = new Set([
      'headache', 'migraine', 'fever', 'nausea', 'vomiting', 'dizziness',
      'fatigue', 'cough', 'shortness of breath', 'chest pain', 'abdominal pain',
      'diarrhea', 'constipation', 'rash', 'swelling', 'joint pain', 'muscle pain',
      'anxiety', 'depression', 'insomnia', 'hypertension', 'diabetes', 'asthma'
      // Add more medical terms as needed
    ]);

    // Initialize symptom patterns for NLP
    this.SYMPTOM_PATTERNS = new Map([
      ['pain', /(?:pain|ache|sore|tender|hurts?|discomfort)/i],
      ['duration', /(?:for|since|lasting|persisting|ongoing|chronic|acute)/i],
      ['frequency', /(?:daily|weekly|monthly|occasional|constant|intermittent)/i],
      ['severity', /(?:mild|moderate|severe|intense|excruciating|unbearable)/i],
      ['location', /(?:in|on|at|around|throughout|radiating)/i],
      ['timing', /(?:morning|afternoon|evening|night|during|after|before)/i]
    ]);

    // Initialize severity scoring
    this.SEVERITY_INDICATORS = new Map([
      ['mild', 1],
      ['moderate', 2],
      ['severe', 3],
      ['intense', 3],
      ['excruciating', 4],
      ['unbearable', 4]
    ]);
  }

  public static getInstance(): SymptomAnalysisService {
    if (!SymptomAnalysisService.instance) {
      SymptomAnalysisService.instance = new SymptomAnalysisService();
    }
    return SymptomAnalysisService.instance;
  }

  public async analyzeSymptoms(
    text: string,
    userId: string,
    userRole: string
  ): Promise<SymptomAnalysis> {
    try {
      // Log access for HIPAA compliance
      await hipaaAuditLogger.logAccess(
        userId,
        userRole,
        PHICategory.PHI,
        'symptom_analysis',
        { textLength: text.length },
        '127.0.0.1',
        'SymptomAnalysisService',
        true
      );

      // Extract primary symptoms
      const primarySymptoms = this.extractPrimarySymptoms(text);
      
      // Analyze severity
      const severity = this.analyzeSeverity(text);
      
      // Extract duration and frequency
      const { duration, frequency } = this.extractTemporalInfo(text);
      
      // Identify triggers and alleviating factors
      const { triggers, alleviatingFactors } = this.extractFactors(text);
      
      // Validate and map to medical terminology
      const medicalTerminology = await this.validateAndMapTerms(primarySymptoms);
      
      // Generate follow-up questions
      const suggestedQuestions = this.generateFollowUpQuestions(
        primarySymptoms,
        severity,
        duration,
        frequency
      );

      return {
        primarySymptoms,
        relatedSymptoms: this.findRelatedSymptoms(primarySymptoms),
        severity,
        duration,
        frequency,
        triggers,
        alleviatingFactors,
        medicalTerminology,
        suggestedQuestions,
        confidence: this.calculateConfidence(text, medicalTerminology)
      };
    } catch (error) {
      securityLogger.log({
        type: 'symptom_analysis',
        severity: 'high',
        message: 'Failed to analyze symptoms',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  public async validateSymptom(
    symptom: string,
    userId: string,
    userRole: string
  ): Promise<SymptomValidator> {
    try {
      // Log access for HIPAA compliance
      await hipaaAuditLogger.logAccess(
        userId,
        userRole,
        PHICategory.PHI,
        'symptom_validation',
        { symptom },
        '127.0.0.1',
        'SymptomAnalysisService',
        true
      );

      const normalizedSymptom = this.normalizeSymptom(symptom);
      const isValid = this.MEDICAL_TERMS.has(normalizedSymptom);
      
      if (isValid) {
        return {
          isValid: true,
          confidence: 1.0,
          alternatives: []
        };
      }

      // Find closest matching medical term
      const { suggestedTerm, confidence, alternatives } = 
        this.findClosestMedicalTerm(normalizedSymptom);

      return {
        isValid: false,
        suggestedTerm,
        confidence,
        alternatives
      };
    } catch (error) {
      securityLogger.log({
        type: 'symptom_validation',
        severity: 'high',
        message: 'Failed to validate symptom',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  private extractPrimarySymptoms(text: string): string[] {
    const symptoms: string[] = [];
    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
      for (const [pattern, regex] of this.SYMPTOM_PATTERNS) {
        if (regex.test(sentence)) {
          const symptom = this.extractSymptomFromSentence(sentence);
          if (symptom) {
            symptoms.push(symptom);
          }
        }
      }
    }

    return [...new Set(symptoms)]; // Remove duplicates
  }

  private extractSymptomFromSentence(sentence: string): string | null {
    // Implement symptom extraction logic
    // This is a simplified version - you might want to use a more sophisticated NLP approach
    const words = sentence.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (this.MEDICAL_TERMS.has(word)) {
        return word;
      }
    }
    return null;
  }

  private analyzeSeverity(text: string): 'mild' | 'moderate' | 'severe' {
    let maxSeverity = 0;
    let severityLevel: 'mild' | 'moderate' | 'severe' = 'mild';

    for (const [term, score] of this.SEVERITY_INDICATORS) {
      if (text.toLowerCase().includes(term) && score > maxSeverity) {
        maxSeverity = score;
        if (score <= 1) severityLevel = 'mild';
        else if (score <= 3) severityLevel = 'moderate';
        else severityLevel = 'severe';
      }
    }

    return severityLevel;
  }

  private extractTemporalInfo(text: string): { duration: string; frequency: string } {
    const duration = this.extractPattern(text, this.SYMPTOM_PATTERNS.get('duration')!);
    const frequency = this.extractPattern(text, this.SYMPTOM_PATTERNS.get('frequency')!);
    
    return {
      duration: duration || 'unknown',
      frequency: frequency || 'unknown'
    };
  }

  private extractFactors(text: string): { triggers: string[]; alleviatingFactors: string[] } {
    const triggers: string[] = [];
    const alleviatingFactors: string[] = [];

    // Look for trigger patterns
    if (text.match(/(?:triggered by|caused by|when|after)/i)) {
      triggers.push(...this.extractFactorList(text, /(?:triggered by|caused by|when|after)/i));
    }

    // Look for alleviating patterns
    if (text.match(/(?:relieved by|better with|improves with)/i)) {
      alleviatingFactors.push(...this.extractFactorList(text, /(?:relieved by|better with|improves with)/i));
    }

    return { triggers, alleviatingFactors };
  }

  private extractFactorList(text: string, pattern: RegExp): string[] {
    const matches = text.match(new RegExp(`${pattern.source}\\s*([^.!?]+)`, 'i'));
    if (!matches) return [];
    
    return matches[1]
      .split(/,\s*|\sand\s/)
      .map(factor => factor.trim())
      .filter(factor => factor.length > 0);
  }

  private async validateAndMapTerms(symptoms: string[]): Promise<string[]> {
    const validatedTerms: string[] = [];
    
    for (const symptom of symptoms) {
      const { suggestedTerm } = await this.validateSymptom(symptom, 'system', 'system');
      if (suggestedTerm) {
        validatedTerms.push(suggestedTerm);
      }
    }
    
    return [...new Set(validatedTerms)];
  }

  private findRelatedSymptoms(primarySymptoms: string[]): string[] {
    // Implement symptom relationship mapping
    // This is a simplified version - you might want to use a medical knowledge graph
    const relatedSymptoms: string[] = [];
    
    for (const symptom of primarySymptoms) {
      // Add related symptoms based on common associations
      switch (symptom.toLowerCase()) {
        case 'headache':
          relatedSymptoms.push('nausea', 'sensitivity to light', 'dizziness');
          break;
        case 'chest pain':
          relatedSymptoms.push('shortness of breath', 'sweating', 'nausea');
          break;
        // Add more symptom relationships
      }
    }
    
    return [...new Set(relatedSymptoms)];
  }

  private generateFollowUpQuestions(
    symptoms: string[],
    severity: string,
    duration: string,
    frequency: string
  ): string[] {
    const questions: string[] = [];
    
    // Generate questions based on symptoms
    for (const symptom of symptoms) {
      questions.push(
        `How would you rate the severity of your ${symptom} on a scale of 1-10?`,
        `Does anything make your ${symptom} better or worse?`,
        `Have you experienced any other symptoms along with your ${symptom}?`
      );
    }
    
    // Generate questions based on severity
    if (severity === 'severe') {
      questions.push(
        'Have you sought emergency care for these symptoms?',
        'Are you currently taking any pain medication?'
      );
    }
    
    // Generate questions based on duration
    if (duration === 'unknown') {
      questions.push(
        'How long have you been experiencing these symptoms?',
        'Did these symptoms start suddenly or gradually?'
      );
    }
    
    // Generate questions based on frequency
    if (frequency === 'unknown') {
      questions.push(
        'How often do you experience these symptoms?',
        'Are the symptoms constant or do they come and go?'
      );
    }
    
    return questions;
  }

  private calculateConfidence(text: string, medicalTerms: string[]): number {
    // Implement confidence scoring based on:
    // 1. Number of medical terms recognized
    // 2. Clarity of symptom description
    // 3. Presence of temporal information
    // 4. Presence of severity indicators
    
    let score = 0;
    
    // Medical terms recognition
    score += (medicalTerms.length / this.MEDICAL_TERMS.size) * 0.4;
    
    // Clarity of description
    const wordCount = text.split(/\s+/).length;
    score += Math.min(wordCount / 50, 1) * 0.2;
    
    // Temporal information
    if (this.SYMPTOM_PATTERNS.get('duration')!.test(text)) score += 0.2;
    if (this.SYMPTOM_PATTERNS.get('frequency')!.test(text)) score += 0.2;
    
    return Math.min(score, 1);
  }

  private normalizeSymptom(symptom: string): string {
    return symptom
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, ' ');
  }

  private findClosestMedicalTerm(symptom: string): {
    suggestedTerm: string;
    confidence: number;
    alternatives: string[];
  } {
    // Implement Levenshtein distance or similar algorithm for fuzzy matching
    // This is a simplified version
    let bestMatch = '';
    let bestScore = 0;
    const alternatives: string[] = [];
    
    for (const term of this.MEDICAL_TERMS) {
      const score = this.calculateSimilarity(symptom, term);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = term;
      }
      if (score > 0.7) {
        alternatives.push(term);
      }
    }
    
    return {
      suggestedTerm: bestMatch,
      confidence: bestScore,
      alternatives: alternatives.filter(term => term !== bestMatch)
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Implement Levenshtein distance or similar algorithm
    // This is a simplified version using character overlap
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    return intersection.size / Math.max(set1.size, set2.size);
  }

  private extractPattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[0] : null;
  }
}

// Export singleton instance
export const symptomAnalysisService = SymptomAnalysisService.getInstance(); 