import React from 'react';
import CriticalEventHub from './CriticalEventHub';
import AggregatedAlertsHub from './AggregatedAlertsHub';
import { NotificationHub } from './NotificationHub';

interface CriticalEventsDashboardProps {
  userId: string;
  userRole: string;
}

const CriticalEventsDashboard: React.FC<CriticalEventsDashboardProps> = ({
  userId,
  userRole
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <CriticalEventHub userId={userId} userRole={userRole} />
        </div>
        <div>
          <AggregatedAlertsHub userId={userId} userRole={userRole} />
        </div>
      </div>
      <div>
        <NotificationHub userId={userId} />
      </div>
    </div>
  );
};

export default CriticalEventsDashboard; 