import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface RiskFactor {
  id: string;
  name: string;
  probability: number;
  confidence: number;
  parentFactors: string[];
  childFactors: string[];
  weight: number;
}

export interface DeteriorationProbability {
  timeFrame: '1hr' | '4hr' | '24hr';
  probability: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  contributingFactors: {
    factorId: string;
    weight: number;
  }[];
}

export interface ScenarioModel {
  id: string;
  name: string;
  baseFactors: RiskFactor[];
  modifiedFactors: {
    factorId: string;
    newProbability: number;
  }[];
  resultingProbabilities: DeteriorationProbability[];
}

export class BayesianNetworkService {
  private static instance: BayesianNetworkService;
  private riskFactors: Map<string, RiskFactor> = new Map();
  private deteriorationProbabilities: DeteriorationProbability[] = [];

  private constructor() {}

  static getInstance(): BayesianNetworkService {
    if (!BayesianNetworkService.instance) {
      BayesianNetworkService.instance = new BayesianNetworkService();
    }
    return BayesianNetworkService.instance;
  }

  async fetchRiskFactors(caseId: string): Promise<RiskFactor[]> {
    try {
      const { data, error } = await supabase
        .from('risk_factors')
        .select('*')
        .eq('case_id', caseId);

      if (error) throw error;

      this.riskFactors = new Map(
        data.map((factor: any) => [factor.id, factor])
      );

      return data;
    } catch (error) {
      console.error('Error fetching risk factors:', error);
      throw error;
    }
  }

  async fetchDeteriorationProbabilities(caseId: string): Promise<DeteriorationProbability[]> {
    try {
      const { data, error } = await supabase
        .from('deterioration_probabilities')
        .select('*')
        .eq('case_id', caseId);

      if (error) throw error;

      this.deteriorationProbabilities = data;
      return data;
    } catch (error) {
      console.error('Error fetching deterioration probabilities:', error);
      throw error;
    }
  }

  async saveScenarioModel(scenario: ScenarioModel): Promise<void> {
    try {
      const { error } = await supabase
        .from('scenario_models')
        .insert([scenario]);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving scenario model:', error);
      throw error;
    }
  }

  calculateCascadingProbabilities(factorId: string): Map<string, number> {
    const probabilities = new Map<string, number>();
    const factor = this.riskFactors.get(factorId);

    if (!factor) return probabilities;

    const calculateProbability = (currentFactor: RiskFactor, visited: Set<string>): number => {
      if (visited.has(currentFactor.id)) return currentFactor.probability;
      visited.add(currentFactor.id);

      let probability = currentFactor.probability;
      for (const parentId of currentFactor.parentFactors) {
        const parent = this.riskFactors.get(parentId);
        if (parent) {
          probability *= calculateProbability(parent, visited);
        }
      }

      return probability;
    };

    const visited = new Set<string>();
    probabilities.set(factorId, calculateProbability(factor, visited));

    return probabilities;
  }

  calculateDeteriorationProbability(
    timeFrame: '1hr' | '4hr' | '24hr',
    modifiedFactors?: Map<string, number>
  ): DeteriorationProbability {
    const baseProbability = this.deteriorationProbabilities.find(
      p => p.timeFrame === timeFrame
    );

    if (!baseProbability) {
      throw new Error(`No base probability found for time frame: ${timeFrame}`);
    }

    if (!modifiedFactors) {
      return baseProbability;
    }

    // Calculate modified probability based on changed factors
    let modifiedProbability = baseProbability.probability;
    const modifiedContributingFactors = [...baseProbability.contributingFactors];

    for (const [factorId, newProbability] of modifiedFactors.entries()) {
      const factor = this.riskFactors.get(factorId);
      if (factor) {
        const weight = factor.weight;
        const probabilityDiff = newProbability - factor.probability;
        modifiedProbability += probabilityDiff * weight;

        // Update contributing factors
        const factorIndex = modifiedContributingFactors.findIndex(
          f => f.factorId === factorId
        );
        if (factorIndex !== -1) {
          modifiedContributingFactors[factorIndex] = {
            factorId,
            weight: weight * (1 + probabilityDiff)
          };
        }
      }
    }

    return {
      ...baseProbability,
      probability: Math.max(0, Math.min(1, modifiedProbability)),
      contributingFactors: modifiedContributingFactors
    };
  }

  generateWhatIfScenario(
    baseFactors: RiskFactor[],
    modifiedFactors: Map<string, number>
  ): ScenarioModel {
    const scenario: ScenarioModel = {
      id: crypto.randomUUID(),
      name: `Scenario ${new Date().toISOString()}`,
      baseFactors,
      modifiedFactors: Array.from(modifiedFactors.entries()).map(([factorId, probability]) => ({
        factorId,
        newProbability: probability
      })),
      resultingProbabilities: ['1hr', '4hr', '24hr'].map(timeFrame =>
        this.calculateDeteriorationProbability(timeFrame as '1hr' | '4hr' | '24hr', modifiedFactors)
      )
    };

    return scenario;
  }
} 