import { describe, it, expect } from 'vitest';

function calculateTriageScore(symptom: string): 'High' | 'Medium' | 'Low' {
  switch (symptom) {
    case 'Chest Pain':
      return 'High';
    case 'Fever':
      return 'Medium';
    default:
      return 'Low';
  }
}

describe('Triage Logic', () => {
  it('should assign High priority to Chest Pain', () => {
    expect(calculateTriageScore('Chest Pain')).toBe('High');
  });

  it('should assign Medium priority to Fever', () => {
    expect(calculateTriageScore('Fever')).toBe('Medium');
  });

  it('should assign Low priority to Headache', () => {
    expect(calculateTriageScore('Headache')).toBe('Low');
  });

  it('should assign Low priority to Other symptoms', () => {
    expect(calculateTriageScore('Other')).toBe('Low');
  });
}); 