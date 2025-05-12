import { TriageRuleDefinition, RuleCondition, CompositeCondition, SymptomCondition, VitalCondition, RiskFactorCondition, DemographicCondition, TemporalCondition } from './ruleDefinitions';
import type { TriageRequest } from '@/types/triage';

export interface RuleEvaluationResult {
  matched: boolean;
  explanations: string[];
}

export function evaluateTriageRule(rule: TriageRuleDefinition, input: TriageRequest): RuleEvaluationResult {
  const explanations: string[] = [];
  const matched = evaluateCondition(rule.condition, input, explanations);
  // Check exceptions
  if (matched && rule.exceptions) {
    for (const exc of rule.exceptions) {
      if (evaluateCondition(exc, input, explanations)) {
        explanations.push('Exception matched, rule excluded.');
        return { matched: false, explanations };
      }
    }
  }
  return { matched, explanations };
}

function evaluateCondition(
  cond: RuleCondition | CompositeCondition,
  input: TriageRequest,
  explanations: string[]
): boolean {
  if (cond.type === 'composite') {
    const composite = cond as CompositeCondition;
    const results = composite.conditions.map(c => evaluateCondition(c, input, explanations));
    if (composite.operator === 'AND') {
      return results.every(Boolean);
    } else if (composite.operator === 'OR') {
      if (composite.minMatches !== undefined) {
        return results.filter(Boolean).length >= composite.minMatches;
      }
      return results.some(Boolean);
    }
    return false;
  }
  switch (cond.type) {
    case 'symptom':
      return evalSymptom(cond as SymptomCondition, input, explanations);
    case 'vital':
      return evalVital(cond as VitalCondition, input, explanations);
    case 'riskFactor':
      return evalRiskFactor(cond as RiskFactorCondition, input, explanations);
    case 'demographic':
      return evalDemographic(cond as DemographicCondition, input, explanations);
    case 'temporal':
      return evalTemporal(cond as TemporalCondition, input, explanations);
    default:
      explanations.push(`Unknown condition type: ${(cond as any).type}`);
      return false;
  }
}

function evalSymptom(cond: SymptomCondition, input: TriageRequest, explanations: string[]): boolean {
  const present = input.symptoms?.map(s => s.toLowerCase()).includes(cond.symptomId.toLowerCase());
  if (cond.presence === !!present) {
    explanations.push(`Symptom '${cond.symptomId}' presence=${cond.presence}`);
    return true;
  }
  return false;
}

function evalVital(cond: VitalCondition, input: TriageRequest, explanations: string[]): boolean {
  const vitals = input.vitalSigns || input.vitals || {};
  const value = vitals[cond.vitalId];
  if (typeof value !== 'number') return false;
  let result = false;
  switch (cond.comparator) {
    case '<': result = value < cond.value; break;
    case '<=': result = value <= cond.value; break;
    case '>': result = value > cond.value; break;
    case '>=': result = value >= cond.value; break;
    case '=': result = value === cond.value; break;
    case '!=': result = value !== cond.value; break;
  }
  if (result) explanations.push(`Vital '${cond.vitalId}' ${cond.comparator} ${cond.value} (actual: ${value})`);
  return result;
}

function evalRiskFactor(cond: RiskFactorCondition, input: TriageRequest, explanations: string[]): boolean {
  const present = input.medicalHistory?.map(f => f.toLowerCase()).includes(cond.factor.toLowerCase());
  if (cond.presence === !!present) {
    explanations.push(`Risk factor '${cond.factor}' presence=${cond.presence}`);
    return true;
  }
  return false;
}

function evalDemographic(cond: DemographicCondition, input: TriageRequest, explanations: string[]): boolean {
  const value = (input as any)[cond.attribute];
  if (value === undefined) return false;
  let result = false;
  switch (cond.comparator) {
    case '<': result = value < cond.value; break;
    case '<=': result = value <= cond.value; break;
    case '>': result = value > cond.value; break;
    case '>=': result = value >= cond.value; break;
    case '=': result = value === cond.value; break;
    case '!=': result = value !== cond.value; break;
  }
  if (result) explanations.push(`Demographic '${cond.attribute}' ${cond.comparator} ${cond.value} (actual: ${value})`);
  return result;
}

function evalTemporal(cond: TemporalCondition, input: TriageRequest, explanations: string[]): boolean {
  // For now, just a stub. Extend as needed.
  explanations.push(`Temporal condition on '${cond.attribute}' not fully implemented.`);
  return false;
} 