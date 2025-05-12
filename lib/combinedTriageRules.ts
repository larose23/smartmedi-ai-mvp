import type { TriageRequest, TriageRuleResult } from '@/types/triage';
import { enhancedTriageRules, EnhancedTriageRule } from './enhancedTriageRules';
import { pediatricTriageRules } from './pediatricTriageRules';
import { geriatricTriageRules } from './geriatricTriageRules';

/**
 * Combined triage rules incorporating general, pediatric, and geriatric-specific rules
 */
export const combinedTriageRules: EnhancedTriageRule[] = [
  ...enhancedTriageRules,
  ...pediatricTriageRules,
  ...geriatricTriageRules
];

/**
 * Apply the combined triage rules to a patient's input
 * This includes general medical rules, pediatric-specific considerations,
 * and geriatric-specific considerations
 */
export function applyCombinedTriageRules(input: TriageRequest): TriageRuleResult {
  // Find all matching rules
  const matches = combinedTriageRules.filter(rule => rule.match(input));
  
  // Default if no rules match
  if (matches.length === 0) {
    return {
      triageScore: 'Low',
      priorityLevel: 5,
      suggestedDepartments: [{ name: 'General Medicine', type: 'primary' }],
      explainability: ['No high-risk criteria met → default to Low priority.']
    };
  }
  
  // Pick the rule with the highest weight (highest priority)
  const topRule = matches.reduce((a, b) => (a.weight > b.weight ? a : b));
  
  // Collect explanations from all matching rules for better explainability
  const explanations = matches.map(m => m.result.explain);
  
  // Return the result using the highest-weight rule's triage score and priority
  return {
    triageScore: topRule.result.triageScore,
    priorityLevel: topRule.result.priorityLevel,
    suggestedDepartments: topRule.result.suggestedDepartments,
    explainability: explanations
  };
} 