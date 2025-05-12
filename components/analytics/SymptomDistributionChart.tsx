'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SymptomDistributionChartProps {
  data: any[];
}

export default function SymptomDistributionChart({ data }: SymptomDistributionChartProps) {
  const chartData = useMemo(() => {
    const symptomCounts = new Map();
    
    // Count primary symptoms
    data.forEach(checkIn => {
      if (!checkIn.primary_symptom) return;
      
      // Skip generic or empty entries
      if (['Not specified', 'Unknown', ''].includes(checkIn.primary_symptom)) return;
      
      const symptom = checkIn.primary_symptom;
      symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1);
      
      // Also count additional symptoms if available
      if (Array.isArray(checkIn.additional_symptoms)) {
        checkIn.additional_symptoms.forEach((additionalSymptom: string) => {
          if (!additionalSymptom || ['Not specified', 'Unknown', ''].includes(additionalSymptom)) return;
          symptomCounts.set(additionalSymptom, (symptomCounts.get(additionalSymptom) || 0) + 1);
        });
      }
    });
    
    // Convert to array format for chart, keeping only top 15 symptoms
    return Array.from(symptomCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 15);
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis 
          dataKey="name" 
          type="category" 
          tick={{ fontSize: 12 }}
          width={100}
        />
        <Tooltip 
          formatter={(value) => [`${value} patients`, 'Frequency']}
        />
        <Legend />
        <Bar dataKey="count" fill="#3b82f6" name="Symptom Frequency" />
      </BarChart>
    </ResponsiveContainer>
  );
} 