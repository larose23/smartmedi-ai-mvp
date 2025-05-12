import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from './ui/card';
import { StaffProductivityMetrics, ResourceUtilization, OperationalEfficiency } from '../../lib/services/operationalAnalyticsService';
import { TrendingUp, TrendingDown, Users, Clock, DollarSign } from 'lucide-react';

interface DashboardSummaryProps {
  staffMetrics: StaffProductivityMetrics[];
  resourceUtilization: ResourceUtilization[];
  operationalEfficiency: OperationalEfficiency[];
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  staffMetrics,
  resourceUtilization,
  operationalEfficiency,
}) => {
  const calculateAverages = () => {
    const staffAvg = {
      patientsSeen: staffMetrics.reduce((acc, curr) => acc + curr.metrics.patientsSeen, 0) / staffMetrics.length,
      satisfaction: staffMetrics.reduce((acc, curr) => acc + curr.metrics.patientSatisfaction, 0) / staffMetrics.length,
    };

    const resourceAvg = {
      utilization: resourceUtilization.reduce((acc, curr) => acc + curr.metrics.utilizationRate, 0) / resourceUtilization.length,
      efficiency: resourceUtilization.reduce((acc, curr) => acc + curr.metrics.efficiency, 0) / resourceUtilization.length,
    };

    const efficiencyAvg = {
      waitTime: operationalEfficiency.reduce((acc, curr) => acc + curr.metrics.waitTime, 0) / operationalEfficiency.length,
      costPerPatient: operationalEfficiency.reduce((acc, curr) => acc + curr.metrics.costPerPatient, 0) / operationalEfficiency.length,
    };

    return { staffAvg, resourceAvg, efficiencyAvg };
  };

  const { staffAvg, resourceAvg, efficiencyAvg } = calculateAverages();

  const getTrendIcon = (value: number, threshold: number) => {
    return value >= threshold ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Staff Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Average Patients Seen</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold">{Math.round(staffAvg.patientsSeen)}</span>
                {getTrendIcon(staffAvg.patientsSeen, 20)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Patient Satisfaction</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold">{Math.round(staffAvg.satisfaction)}%</span>
                {getTrendIcon(staffAvg.satisfaction, 80)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resource Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Average Utilization</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold">{Math.round(resourceAvg.utilization)}%</span>
                {getTrendIcon(resourceAvg.utilization, 75)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Resource Efficiency</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold">{Math.round(resourceAvg.efficiency)}%</span>
                {getTrendIcon(resourceAvg.efficiency, 80)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Operational Efficiency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Average Wait Time</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold">{Math.round(efficiencyAvg.waitTime)} min</span>
                {getTrendIcon(efficiencyAvg.waitTime, 30)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Cost per Patient</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold">${Math.round(efficiencyAvg.costPerPatient)}</span>
                {getTrendIcon(efficiencyAvg.costPerPatient, 500)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 