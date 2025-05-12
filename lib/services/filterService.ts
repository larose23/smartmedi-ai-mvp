import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';
import { RiskAssessment } from './riskAssessment';

// Define condition types and operators for complex filtering
export type FilterOperator = 'AND' | 'OR' | 'NOT';
export type ComparisonOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'IN' | 'NOT_IN';

export interface FilterCondition {
  field: string;
  operator: ComparisonOperator;
  value: any;
}

export interface FilterGroup {
  operator: FilterOperator;
  conditions: (FilterCondition | FilterGroup)[];
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: {
    riskLevel?: ('low' | 'medium' | 'high')[];
    priority?: number[];
    categories?: string[];
    timeRange?: {
      start: Date;
      end: Date;
    };
    departments?: string[];
    conditions?: string[];
    medications?: string[];
    // New field for complex filtering
    complexConditions?: FilterGroup;
  };
  createdBy: string;
  isShared: boolean;
  department?: string;
  lastUsed: Date;
  // Add color for visual identification
  color?: string;
  // Add tags for categorization
  tags?: string[];
}

export interface SearchResult {
  patientId: string;
  relevance: number;
  matches: {
    field: string;
    value: string;
    context: string;
  }[];
}

export class FilterService {
  private static instance: FilterService;
  private presets: Map<string, FilterPreset> = new Map();

  private constructor() {
    // Initialize with some default presets
    this.initializeDefaultPresets();
  }

  public static getInstance(): FilterService {
    if (!FilterService.instance) {
      FilterService.instance = new FilterService();
    }
    return FilterService.instance;
  }

  private initializeDefaultPresets() {
    const defaultPresets: FilterPreset[] = [
      {
        id: 'high-risk-patients',
        name: 'High Risk Patients',
        description: 'Patients with high risk factors requiring immediate attention',
        filters: {
          riskLevel: ['high'],
          priority: [1, 2]
        },
        createdBy: 'system',
        isShared: true,
        lastUsed: new Date()
      },
      {
        id: 'cardiology-follow-up',
        name: 'Cardiology Follow-up',
        description: 'Patients requiring cardiology department follow-up',
        filters: {
          departments: ['cardiology'],
          conditions: ['heart disease', 'hypertension', 'arrhythmia']
        },
        createdBy: 'system',
        isShared: true,
        department: 'cardiology',
        lastUsed: new Date()
      }
    ];

    defaultPresets.forEach(preset => this.presets.set(preset.id, preset));
  }

  async savePreset(preset: Omit<FilterPreset, 'id' | 'lastUsed'>): Promise<FilterPreset> {
    try {
      const newPreset: FilterPreset = {
        ...preset,
        id: `preset-${Date.now()}`,
        lastUsed: new Date()
      };

      this.presets.set(newPreset.id, newPreset);

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'filter_preset_save',
        { presetId: newPreset.id, name: newPreset.name },
        '127.0.0.1',
        'FilterService',
        true
      );

      return newPreset;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'filter_preset_save_error',
        { error: error.message },
        '127.0.0.1',
        'FilterService'
      );
      throw error;
    }
  }

  async getPresets(userId: string, department?: string): Promise<FilterPreset[]> {
    try {
      const presets = Array.from(this.presets.values()).filter(preset => 
        preset.isShared || 
        preset.createdBy === userId ||
        (department && preset.department === department)
      );

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'filter_presets_access',
        { userId, department },
        '127.0.0.1',
        'FilterService',
        true
      );

      return presets;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'filter_presets_access_error',
        { error: error.message },
        '127.0.0.1',
        'FilterService'
      );
      throw error;
    }
  }

  async deletePreset(presetId: string, userId: string): Promise<void> {
    try {
      const preset = this.presets.get(presetId);
      if (!preset) {
        throw new Error('Preset not found');
      }

      // Only allow deletion if user created the preset or is an admin
      if (preset.createdBy !== userId && !preset.isShared) {
        throw new Error('Unauthorized to delete this preset');
      }

      this.presets.delete(presetId);

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'filter_preset_delete',
        { presetId, name: preset.name },
        '127.0.0.1',
        'FilterService',
        true
      );
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'filter_preset_delete_error',
        { error: error.message },
        '127.0.0.1',
        'FilterService'
      );
      throw error;
    }
  }

  async updatePreset(
    presetId: string,
    updates: Partial<Omit<FilterPreset, 'id' | 'createdBy' | 'lastUsed'>>,
    userId: string
  ): Promise<FilterPreset> {
    try {
      const preset = this.presets.get(presetId);
      if (!preset) {
        throw new Error('Preset not found');
      }

      // Only allow updates if user created the preset or is an admin
      if (preset.createdBy !== userId && !preset.isShared) {
        throw new Error('Unauthorized to update this preset');
      }

      const updatedPreset: FilterPreset = {
        ...preset,
        ...updates,
        lastUsed: new Date()
      };

      this.presets.set(presetId, updatedPreset);

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'filter_preset_update',
        { presetId, name: updatedPreset.name },
        '127.0.0.1',
        'FilterService',
        true
      );

      return updatedPreset;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'filter_preset_update_error',
        { error: error.message },
        '127.0.0.1',
        'FilterService'
      );
      throw error;
    }
  }

  async searchPatients(
    query: string,
    department?: string,
    role?: string
  ): Promise<SearchResult[]> {
    try {
      // Tokenize the query
      const tokens = query.toLowerCase().split(/\s+/);
      
      // Define search patterns
      const patterns = {
        conditions: ['condition', 'diagnosis', 'disease', 'illness'],
        medications: ['medication', 'drug', 'prescription', 'medicine'],
        timeRange: ['last', 'recent', 'past', 'since'],
        riskLevel: ['high risk', 'low risk', 'medium risk'],
        priority: ['urgent', 'priority', 'important']
      };

      // Extract search criteria
      const criteria = {
        conditions: [] as string[],
        medications: [] as string[],
        timeRange: null as { start: Date; end: Date } | null,
        riskLevel: null as string | null,
        priority: null as number | null
      };

      // Process tokens to extract search criteria
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        // Check for conditions
        if (patterns.conditions.some(p => token.includes(p))) {
          const nextToken = tokens[i + 1];
          if (nextToken) {
            criteria.conditions.push(nextToken);
          }
        }
        
        // Check for medications
        if (patterns.medications.some(p => token.includes(p))) {
          const nextToken = tokens[i + 1];
          if (nextToken) {
            criteria.medications.push(nextToken);
          }
        }
        
        // Check for time range
        if (patterns.timeRange.includes(token)) {
          const number = parseInt(tokens[i + 1]);
          const unit = tokens[i + 2];
          if (!isNaN(number) && unit) {
            const end = new Date();
            const start = new Date();
            if (unit.includes('month')) {
              start.setMonth(start.getMonth() - number);
            } else if (unit.includes('day')) {
              start.setDate(start.getDate() - number);
            } else if (unit.includes('year')) {
              start.setFullYear(start.getFullYear() - number);
            }
            criteria.timeRange = { start, end };
          }
        }
        
        // Check for risk level
        if (patterns.riskLevel.some(p => token.includes(p))) {
          if (token.includes('high')) {
            criteria.riskLevel = 'high';
          } else if (token.includes('low')) {
            criteria.riskLevel = 'low';
          } else if (token.includes('medium')) {
            criteria.riskLevel = 'medium';
          }
        }
        
        // Check for priority
        if (patterns.priority.includes(token)) {
          criteria.priority = 1; // High priority
        }
      }

      // TODO: Implement actual patient record search using the criteria
      // This would typically involve:
      // 1. Querying the patient database
      // 2. Matching against the extracted criteria
      // 3. Scoring relevance based on matches
      // 4. Filtering by department/role permissions
      
      const mockResults: SearchResult[] = [
        {
          patientId: 'patient-1',
          relevance: 0.95,
          matches: [
            {
              field: 'conditions',
              value: 'hypertension',
              context: 'Patient has been diagnosed with hypertension'
            }
          ]
        }
      ];

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'patient_search',
        { query, department, role, criteria },
        '127.0.0.1',
        'FilterService',
        true
      );

      return mockResults;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'patient_search_error',
        { error: error.message },
        '127.0.0.1',
        'FilterService'
      );
      throw error;
    }
  }

  async applyComplexFilters(
    patients: any[],
    filterGroup: FilterGroup
  ): Promise<any[]> {
    try {
      return patients.filter(patient => this.evaluateFilterGroup(patient, filterGroup));
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'complex_filter_application_error',
        { error: error.message },
        '127.0.0.1',
        'FilterService'
      );
      throw error;
    }
  }

  private evaluateFilterGroup(patient: any, group: FilterGroup): boolean {
    if (group.operator === 'AND') {
      return group.conditions.every(condition => {
        if ('field' in condition) {
          return this.evaluateCondition(patient, condition as FilterCondition);
        } else {
          return this.evaluateFilterGroup(patient, condition as FilterGroup);
        }
      });
    } else if (group.operator === 'OR') {
      return group.conditions.some(condition => {
        if ('field' in condition) {
          return this.evaluateCondition(patient, condition as FilterCondition);
        } else {
          return this.evaluateFilterGroup(patient, condition as FilterGroup);
        }
      });
    } else if (group.operator === 'NOT') {
      // For NOT, we expect only one condition
      const condition = group.conditions[0];
      if ('field' in condition) {
        return !this.evaluateCondition(patient, condition as FilterCondition);
      } else {
        return !this.evaluateFilterGroup(patient, condition as FilterGroup);
      }
    }
    
    return false;
  }

  private evaluateCondition(patient: any, condition: FilterCondition): boolean {
    const { field, operator, value } = condition;
    
    // Safely get nested fields using dot notation (e.g., "lab.glucose.value")
    const fieldValue = field.split('.').reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), patient);
    
    if (fieldValue === undefined) return false;
    
    switch (operator) {
      case '=':
        return fieldValue === value;
      case '!=':
        return fieldValue !== value;
      case '>':
        return fieldValue > value;
      case '<':
        return fieldValue < value;
      case '>=':
        return fieldValue >= value;
      case '<=':
        return fieldValue <= value;
      case 'CONTAINS':
        return typeof fieldValue === 'string' && fieldValue.includes(value);
      case 'STARTS_WITH':
        return typeof fieldValue === 'string' && fieldValue.startsWith(value);
      case 'ENDS_WITH':
        return typeof fieldValue === 'string' && fieldValue.endsWith(value);
      case 'IN':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'NOT_IN':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  async applyFilters(
    patients: { id: string; assessment: RiskAssessment }[],
    filters: FilterPreset['filters']
  ): Promise<string[]> {
    try {
      // If complex conditions are defined, use them first
      if (filters.complexConditions) {
        const filteredPatients = await this.applyComplexFilters(patients, filters.complexConditions);
        return filteredPatients.map(patient => patient.id);
      }
      
      const filteredPatients = patients.filter(patient => {
        const assessment = patient.assessment;
        
        // Apply risk level filter
        if (filters.riskLevel && !filters.riskLevel.includes(assessment.overallRisk)) {
          return false;
        }

        // Apply priority filter
        if (filters.priority && !filters.priority.includes(assessment.priority)) {
          return false;
        }

        // Apply category filter
        if (filters.categories) {
          const hasMatchingCategory = assessment.riskFactors.some(factor =>
            filters.categories!.includes(factor.category)
          );
          if (!hasMatchingCategory) return false;
        }

        // Apply time range filter
        if (filters.timeRange) {
          const assessmentDate = assessment.timestamp;
          if (
            assessmentDate < filters.timeRange.start ||
            assessmentDate > filters.timeRange.end
          ) {
            return false;
          }
        }

        return true;
      });

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'filter_application',
        { filterCount: Object.keys(filters).length },
        '127.0.0.1',
        'FilterService',
        true
      );

      return filteredPatients.map(p => p.id);
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'filter_application_error',
        { error: error.message },
        '127.0.0.1',
        'FilterService'
      );
      throw error;
    }
  }
} 