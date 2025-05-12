'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DepartmentWorkloadChartProps {
  data: any[];
}

const COLORS = ['#3b82f6', '#f97316', '#ef4444', '#10b981', '#a855f7', '#64748b', '#6366f1'];

export default function DepartmentWorkloadChart({ data }: DepartmentWorkloadChartProps) {
  const chartData = useMemo(() => {
    const departmentCounts = new Map();
    
    // Count check-ins by department
    data.forEach(checkIn => {
      if (!checkIn.department) return;
      
      const dept = checkIn.department;
      departmentCounts.set(dept, (departmentCounts.get(dept) || 0) + 1);
    });
    
    // Convert to array format for chart
    return Array.from(departmentCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => (b.value as number) - (a.value as number));
  }, [data]);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      percent > 0.05 ? (
        <text
          x={x}
          y={y}
          fill="white"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={12}
          fontWeight="bold"
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      ) : null
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value} patients`, 'Count']} />
        <Legend layout="vertical" verticalAlign="middle" align="right" />
      </PieChart>
    </ResponsiveContainer>
  );
} 