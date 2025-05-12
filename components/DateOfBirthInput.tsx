import { useState, useEffect } from 'react';
import { z } from 'zod';

const dobSchema = z.object({
  day: z.number().min(1).max(31),
  month: z.number().min(1).max(12),
  year: z.number().min(1900).max(new Date().getFullYear()),
});

interface DateOfBirthInputProps {
  value?: string;
  onChange: (date: string) => void;
  error?: string;
}

export const DateOfBirthInput = ({ value, onChange, error }: DateOfBirthInputProps) => {
  const [day, setDay] = useState<number>(1);
  const [month, setMonth] = useState<number>(1);
  const [year, setYear] = useState<number>(new Date().getFullYear() - 18);

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      setYear(y);
      setMonth(m);
      setDay(d);
    }
  }, [value]);

  const handleChange = (type: 'day' | 'month' | 'year', val: number) => {
    let newDay = day;
    let newMonth = month;
    let newYear = year;

    switch (type) {
      case 'day':
        newDay = val;
        break;
      case 'month':
        newMonth = val;
        break;
      case 'year':
        newYear = val;
        break;
    }

    try {
      dobSchema.parse({ day: newDay, month: newMonth, year: newYear });
      const date = new Date(newYear, newMonth - 1, newDay);
      onChange(date.toISOString().split('T')[0]);
    } catch (err) {
      // Invalid date, don't update
    }
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from(
    { length: new Date().getFullYear() - 1900 + 1 },
    (_, i) => new Date().getFullYear() - i
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
      <div className="flex space-x-2">
        <select
          value={month}
          onChange={(e) => handleChange('month', Number(e.target.value))}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          aria-label="Month"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>

        <select
          value={day}
          onChange={(e) => handleChange('day', Number(e.target.value))}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          aria-label="Day"
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => handleChange('year', Number(e.target.value))}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          aria-label="Year"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}; 