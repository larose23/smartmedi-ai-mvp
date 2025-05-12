import { CheckIn } from '@/types/triage';

interface ResourceOptimizerProps {
  checkIns: CheckIn[] | null;
}

export default function ResourceOptimizer({ checkIns }: ResourceOptimizerProps) {
  // Skip if no check-ins
  if (!checkIns) return null;

  // Calculate department load
  const departmentLoad = checkIns.reduce((acc, checkIn) => {
    const department = checkIn.suggested_department || checkIn.department || 'General';
    acc[department] = (acc[department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate priority distribution
  const priorityDistribution = checkIns.reduce((acc, checkIn) => {
    const score = checkIn.triage_score || 'Medium';
    acc[score] = (acc[score] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get recommendations
  const getRecommendations = () => {
    const recommendations = [];
    
    // Check for overloaded departments
    Object.entries(departmentLoad).forEach(([dept, count]) => {
      if (count > 5) {
        recommendations.push(`Consider adding staff to ${dept} department (${count} patients)`);
      }
    });

    // Check for high-priority patients
    if (priorityDistribution['High'] > 3) {
      recommendations.push('High number of critical patients - consider activating emergency protocol');
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">Resource Optimization Recommendations</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <ul className="list-disc pl-5 space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 