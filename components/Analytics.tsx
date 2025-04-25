'use client';

interface CheckIn {
  id: string;
  full_name: string;
  date_of_birth: string;
  contact_info: string;
  primary_symptom: string;
  additional_symptoms?: string;
  triage_score: 'High' | 'Medium' | 'Low';
  created_at: string;
}

interface AnalyticsProps {
  checkIns: CheckIn[];
}

export default function Analytics({ checkIns }: AnalyticsProps) {
  const calculateAverageCheckInTime = () => {
    if (checkIns.length === 0) return 0;
    
    const totalTime = checkIns.reduce((acc, checkIn) => {
      const checkInTime = new Date(checkIn.created_at).getTime();
      const now = new Date().getTime();
      return acc + (now - checkInTime);
    }, 0);
    
    return Math.round(totalTime / checkIns.length / 1000 / 60); // Convert to minutes
  };

  const calculateTriageAccuracy = () => {
    if (checkIns.length === 0) return 0;
    
    const correctTriage = checkIns.filter(checkIn => {
      switch (checkIn.primary_symptom) {
        case 'Chest Pain':
          return checkIn.triage_score === 'High';
        case 'Fever':
          return checkIn.triage_score === 'Medium';
        default:
          return checkIn.triage_score === 'Low';
      }
    }).length;
    
    return Math.round((correctTriage / checkIns.length) * 100);
  };

  const calculateThroughput = () => {
    if (checkIns.length === 0) return 0;
    
    const firstCheckIn = new Date(Math.min(...checkIns.map(c => new Date(c.created_at).getTime())));
    const lastCheckIn = new Date(Math.max(...checkIns.map(c => new Date(c.created_at).getTime())));
    const hours = (lastCheckIn.getTime() - firstCheckIn.getTime()) / (1000 * 60 * 60);
    
    return hours > 0 ? Math.round(checkIns.length / hours) : 0;
  };

  const stats = [
    {
      name: 'Average Check-in Time',
      value: `${calculateAverageCheckInTime()} min`,
      description: 'Time from check-in to current time',
    },
    {
      name: 'Triage Accuracy',
      value: `${calculateTriageAccuracy()}%`,
      description: 'Percentage of correct triage scores',
    },
    {
      name: 'Patient Throughput',
      value: `${calculateThroughput()}/hr`,
      description: 'Patients checked in per hour',
    },
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Analytics</h3>
      <dl className="space-y-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-gray-50 px-4 py-5 rounded-lg">
            <dt className="text-sm font-medium text-gray-500">{stat.name}</dt>
            <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div className="flex items-baseline text-2xl font-semibold text-indigo-600">
                {stat.value}
              </div>
              <div className="inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 md:mt-2 lg:mt-0">
                {stat.description}
              </div>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
} 