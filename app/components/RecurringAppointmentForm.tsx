import React, { useState } from 'react';
import { SCHEDULING_CONSTANTS } from '@/lib/constants/scheduling';

interface RecurringAppointmentFormProps {
  onSubmit: (pattern: RecurringPattern) => void;
  onCancel: () => void;
  initialDate: Date;
}

interface RecurringPattern {
  pattern: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate: Date;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  exceptions?: Date[];
}

const RecurringAppointmentForm: React.FC<RecurringAppointmentFormProps> = ({
  onSubmit,
  onCancel,
  initialDate
}) => {
  const [pattern, setPattern] = useState<RecurringPattern>({
    pattern: 'weekly',
    interval: 1,
    endDate: new Date(initialDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from initial date
    daysOfWeek: [initialDate.getDay()],
    exceptions: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(pattern);
  };

  const handleDayOfWeekChange = (day: number) => {
    setPattern(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek?.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...(prev.daysOfWeek || []), day]
    }));
  };

  const handleDayOfMonthChange = (day: number) => {
    setPattern(prev => ({
      ...prev,
      dayOfMonth: day
    }));
  };

  const handleExceptionAdd = (date: Date) => {
    setPattern(prev => ({
      ...prev,
      exceptions: [...(prev.exceptions || []), date]
    }));
  };

  const handleExceptionRemove = (date: Date) => {
    setPattern(prev => ({
      ...prev,
      exceptions: prev.exceptions?.filter(d => d.getTime() !== date.getTime())
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Recurrence Pattern
        </label>
        <select
          value={pattern.pattern}
          onChange={(e) => setPattern(prev => ({ ...prev, pattern: e.target.value as any }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Repeat Every
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <input
            type="number"
            min="1"
            value={pattern.interval}
            onChange={(e) => setPattern(prev => ({ ...prev, interval: parseInt(e.target.value) }))}
            className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <span className="text-gray-500">
            {pattern.pattern === 'daily' ? 'days' :
             pattern.pattern === 'weekly' ? 'weeks' : 'months'}
          </span>
        </div>
      </div>

      {pattern.pattern === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Days of Week
          </label>
          <div className="flex flex-wrap gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <button
                key={day}
                type="button"
                onClick={() => handleDayOfWeekChange(index)}
                className={`px-3 py-1 rounded-md ${
                  pattern.daysOfWeek?.includes(index)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {pattern.pattern === 'monthly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Day of Month
          </label>
          <select
            value={pattern.dayOfMonth || initialDate.getDate()}
            onChange={(e) => handleDayOfMonthChange(parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          End Date
        </label>
        <input
          type="date"
          value={pattern.endDate.toISOString().split('T')[0]}
          onChange={(e) => setPattern(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
          min={initialDate.toISOString().split('T')[0]}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Exceptions (Optional)
        </label>
        <div className="space-y-2">
          {pattern.exceptions?.map((date, index) => (
            <div key={index} className="flex items-center justify-between">
              <span>{date.toLocaleDateString()}</span>
              <button
                type="button"
                onClick={() => handleExceptionRemove(date)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          ))}
          <input
            type="date"
            onChange={(e) => handleExceptionAdd(new Date(e.target.value))}
            min={initialDate.toISOString().split('T')[0]}
            max={pattern.endDate.toISOString().split('T')[0]}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Create Recurring Appointments
        </button>
      </div>
    </form>
  );
};

export default RecurringAppointmentForm; 