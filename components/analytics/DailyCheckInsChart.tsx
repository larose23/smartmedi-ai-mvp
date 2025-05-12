'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';

interface DailyCheckInsChartProps {
  data: any[];
}

export default function DailyCheckInsChart({ data }: DailyCheckInsChartProps) {
  const chartData = useMemo(() => {
    const today = new Date();
    const dateMap = new Map();
    
    // Initialize last 30 days
    for (let i = 0; i < 30; i++) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      dateMap.set(dateStr, {
        date: dateStr,
        displayDate: format(date, 'MMM dd'),
        total: 0,
        high: 0,
        medium: 0,
        low: 0
      });
    }
    
    // Aggregate check-ins by day
    data.forEach(checkIn => {
      try {
        if (!checkIn.created_at) return;
        
        const date = parseISO(checkIn.created_at);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        if (dateMap.has(dateStr)) {
          const entry = dateMap.get(dateStr);
          entry.total += 1;
          
          if (checkIn.triage_score === 'High') {
            entry.high += 1;
          } else if (checkIn.triage_score === 'Medium') {
            entry.medium += 1;
          } else if (checkIn.triage_score === 'Low') {
            entry.low += 1;
          }
          
          dateMap.set(dateStr, entry);
        }
      } catch (err) {
        console.error('Error processing date', err);
      }
    });
    
    // Convert map to array and sort by date
    return Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="displayDate" 
          tick={{ fontSize: 12 }} 
          tickMargin={10}
        />
        <YAxis />
        <Tooltip 
          formatter={(value, name: string) => [value, name === 'total' ? 'Total' : `${name.charAt(0).toUpperCase()}${name.slice(1)}`]}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Legend />
        <Bar dataKey="high" stackId="a" fill="#ef4444" name="High Priority" />
        <Bar dataKey="medium" stackId="a" fill="#f97316" name="Medium Priority" />
        <Bar dataKey="low" stackId="a" fill="#3b82f6" name="Low Priority" />
      </BarChart>
    </ResponsiveContainer>
  );
} 