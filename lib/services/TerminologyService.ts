import { supabase } from '@/lib/supabase';

export interface CodeMapping {
  sourceSystem: 'SNOMED' | 'LOINC' | 'ICD10';
  sourceCode: string;
  targetSystem: 'SNOMED' | 'LOINC' | 'ICD10';
  targetCode: string;
  description: string;
  confidence: number;
  lastUpdated: string;
}

export interface TerminologySet {
  system: 'SNOMED' | 'LOINC' | 'ICD10';
  code: string;
  display: string;
  version: string;
  status: 'active' | 'inactive';
  properties: Record<string, any>;
}

export class TerminologyService {
  // Code Mapping
  static async createCodeMapping(mapping: Omit<CodeMapping, 'lastUpdated'>): Promise<CodeMapping> {
    try {
      const { data, error } = await supabase
        .from('code_mappings')
        .insert({
          ...mapping,
          lastUpdated: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating code mapping:', error);
      throw error;
    }
  }

  static async getCodeMapping(sourceSystem: string, sourceCode: string): Promise<CodeMapping[]> {
    try {
      const { data, error } = await supabase
        .from('code_mappings')
        .select('*')
        .eq('sourceSystem', sourceSystem)
        .eq('sourceCode', sourceCode);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting code mapping:', error);
      throw error;
    }
  }

  // Terminology Sets
  static async createTerminologySet(terminology: Omit<TerminologySet, 'version'>): Promise<TerminologySet> {
    try {
      const { data, error } = await supabase
        .from('terminology_sets')
        .insert({
          ...terminology,
          version: '1.0' // Initial version
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating terminology set:', error);
      throw error;
    }
  }

  static async getTerminologySet(system: string, code: string): Promise<TerminologySet | null> {
    try {
      const { data, error } = await supabase
        .from('terminology_sets')
        .select('*')
        .eq('system', system)
        .eq('code', code)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting terminology set:', error);
      throw error;
    }
  }

  // Code Translation
  static async translateCode(
    code: string,
    fromSystem: 'SNOMED' | 'LOINC' | 'ICD10',
    toSystem: 'SNOMED' | 'LOINC' | 'ICD10'
  ): Promise<string | null> {
    try {
      const mappings = await this.getCodeMapping(fromSystem, code);
      const mapping = mappings.find(m => m.targetSystem === toSystem);
      return mapping?.targetCode || null;
    } catch (error) {
      console.error('Error translating code:', error);
      throw error;
    }
  }

  // Batch Translation
  static async translateCodes(
    codes: string[],
    fromSystem: 'SNOMED' | 'LOINC' | 'ICD10',
    toSystem: 'SNOMED' | 'LOINC' | 'ICD10'
  ): Promise<Record<string, string>> {
    try {
      const { data, error } = await supabase
        .from('code_mappings')
        .select('*')
        .in('sourceCode', codes)
        .eq('sourceSystem', fromSystem)
        .eq('targetSystem', toSystem);

      if (error) throw error;

      const translations: Record<string, string> = {};
      data.forEach(mapping => {
        translations[mapping.sourceCode] = mapping.targetCode;
      });

      return translations;
    } catch (error) {
      console.error('Error translating codes:', error);
      throw error;
    }
  }

  // Terminology Validation
  static async validateCode(
    code: string,
    system: 'SNOMED' | 'LOINC' | 'ICD10'
  ): Promise<boolean> {
    try {
      const terminology = await this.getTerminologySet(system, code);
      return terminology?.status === 'active';
    } catch (error) {
      console.error('Error validating code:', error);
      throw error;
    }
  }

  // Terminology Search
  static async searchTerminology(
    system: 'SNOMED' | 'LOINC' | 'ICD10',
    query: string,
    limit: number = 10
  ): Promise<TerminologySet[]> {
    try {
      const { data, error } = await supabase
        .from('terminology_sets')
        .select('*')
        .eq('system', system)
        .ilike('display', `%${query}%`)
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching terminology:', error);
      throw error;
    }
  }
} 