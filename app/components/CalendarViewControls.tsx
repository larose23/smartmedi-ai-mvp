import React from 'react';

interface CalendarViewControlsProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const CalendarViewControls: React.FC<CalendarViewControlsProps> = ({
  currentView,
  onViewChange,
  onToday,
  onPrev,
  onNext
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={onPrev}
            className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={onToday}
            className="px-3 py-1 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Today
          </button>
          <button
            onClick={onNext}
            className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewChange('resourceTimelineDay')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              currentView === 'resourceTimelineDay'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => onViewChange('resourceTimelineWeek')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              currentView === 'resourceTimelineWeek'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onViewChange('resourceTimelineMonth')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              currentView === 'resourceTimelineMonth'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Month
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarViewControls; 