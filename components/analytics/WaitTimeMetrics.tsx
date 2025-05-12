'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface WaitTimeMetricsProps {
  data: any[];
}

export default function WaitTimeMetrics({ data }: WaitTimeMetricsProps) {
  const chartData = useMemo(() => {
    const departmentWaitTimes = new Map();
    
    // Calculate average wait times by department and priority
    data.forEach(checkIn => {
      if (!checkIn.department || !checkIn.estimated_wait_minutes) return;
      
      const dept = checkIn.department;
      const priority = checkIn.triage_score || 'Medium';
      const waitTime = parseInt(checkIn.estimated_wait_minutes) || 0;
      
      if (!departmentWaitTimes.has(dept)) {
        departmentWaitTimes.set(dept, {
          department: dept,
          highCount: 0,
          highTotal: 0,
          mediumCount: 0,
          mediumTotal: 0,
          lowCount: 0,
          lowTotal: 0
        });
      }
      
      const deptData = departmentWaitTimes.get(dept);
      
      if (priority === 'High') {
        deptData.highCount += 1;
        deptData.highTotal += waitTime;
      } else if (priority === 'Medium') {
        deptData.mediumCount += 1;
        deptData.mediumTotal += waitTime;
      } else if (priority === 'Low') {
        deptData.lowCount += 1;
        deptData.lowTotal += waitTime;
      }
      
      departmentWaitTimes.set(dept, deptData);
    });
    
    // Calculate averages and format for chart
    return Array.from(departmentWaitTimes.values())
      .map(data => ({
        department: data.department,
        high: data.highCount > 0 ? Math.round(data.highTotal / data.highCount) : 0,
        medium: data.mediumCount > 0 ? Math.round(data.mediumTotal / data.mediumCount) : 0,
        low: data.lowCount > 0 ? Math.round(data.lowTotal / data.lowCount) : 0,
        average: Math.round(
          (data.highTotal + data.mediumTotal + data.lowTotal) / 
          (data.highCount + data.mediumCount + data.lowCount || 1)
        )
      }))
      .sort((a, b) => b.average - a.average);
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="department" 
          tick={{ fontSize: 12 }} 
          interval={0}
          angle={-45}
          textAnchor="end"
          height={70}
        />
        <YAxis 
          label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip formatter={(value) => [`${value} minutes`, '']} />
        <Legend />
        <Bar dataKey="high" fill="#ef4444" name="High Priority Wait" />
        <Bar dataKey="medium" fill="#f97316" name="Medium Priority Wait" />
        <Bar dataKey="low" fill="#3b82f6" name="Low Priority Wait" />
      </BarChart>
    </ResponsiveContainer>
  );
} 