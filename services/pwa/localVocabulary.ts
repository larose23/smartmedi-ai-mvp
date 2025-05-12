const vocabulary = [
  'Diabetes',
  'Hypertension',
  'Asthma',
  'Heart Disease',
  'Cancer',
  'Metformin',
  'Lisinopril',
  'Albuterol',
  'Atorvastatin',
  'Insulin',
  // Add more terms as needed
];

export function searchVocabulary(query: string): string[] {
  if (!query) return [];
  const q = query.toLowerCase();
  return vocabulary.filter((term) => term.toLowerCase().includes(q)).slice(0, 8);
} 