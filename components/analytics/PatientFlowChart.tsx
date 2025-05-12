'use client';

import { useMemo } from 'react';
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO, startOfHour, addHours, getHours, set } from 'date-fns';

interface PatientFlowChartProps {
  data: any[];
}

export default function PatientFlowChart({ data }: PatientFlowChartProps) {
  const chartData = useMemo(() => {
    // Initialize hourly buckets for the last 24 hours
    const now = new Date();
    const hourBuckets = new Map();
    
    for (let i = 0; i < 24; i++) {
      const hour = set(startOfHour(now), { hours: i });
      const hourStr = format(hour, 'HH:00');
      
      hourBuckets.set(hourStr, {
        hour: hourStr,
        total: 0,
        high: 0,
        medium: 0,
        low: 0
      });
    }
    
    // Aggregate check-ins by hour of day
    data.forEach(checkIn => {
      try {
        if (!checkIn.created_at) return;
        
        const date = parseISO(checkIn.created_at);
        const hourStr = format(date, 'HH:00');
        
        if (hourBuckets.has(hourStr)) {
          const entry = hourBuckets.get(hourStr);
          entry.total += 1;
          
          if (checkIn.triage_score === 'High') {
            entry.high += 1;
          } else if (checkIn.triage_score === 'Medium') {
            entry.medium += 1;
          } else if (checkIn.triage_score === 'Low') {
            entry.low += 1;
          }
          
          hourBuckets.set(hourStr, entry);
        }
      } catch (err) {
        console.error('Error processing date', err);
      }
    });
    
    // Convert map to array and sort by hour
    return Array.from(hourBuckets.values())
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="hour" 
          tick={{ fontSize: 12 }} 
          tickMargin={10}
        />
        <YAxis />
        <Tooltip 
          formatter={(value, name: string) => [value, name === 'total' ? 'Total' : `${name.charAt(0).toUpperCase()}${name.slice(1)}`]}
          labelFormatter={(label) => `Hour: ${label}`}
        />
        <Legend />
        <Line type="monotone" dataKey="total" stroke="#64748b" name="Total Check-ins" strokeWidth={2} />
        <Line type="monotone" dataKey="high" stroke="#ef4444" name="High Priority" />
        <Line type="monotone" dataKey="medium" stroke="#f97316" name="Medium Priority" />
        <Line type="monotone" dataKey="low" stroke="#3b82f6" name="Low Priority" />
      </LineChart>
    </ResponsiveContainer>
  );
} 