import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { DollarSign, Clock, AlertCircle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { RevenueCycleMetric } from '../../lib/services/financialAnalyticsService';

interface RevenueCycleMonitoringProps {
  metrics: RevenueCycleMetric[];
  onMetricsUpdate: (metricId: string, metrics: Partial<RevenueCycleMetric>) => Promise<void>;
}

export const RevenueCycleMonitoring: React.FC<RevenueCycleMonitoringProps> = ({
  metrics,
  onMetricsUpdate,
}) => {
  const getMetricColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMetricIcon = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value >= thresholds.warning) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const calculateDepartmentMetrics = (department: string) => {
    const departmentMetrics = metrics.filter(m => m.department === department);
    if (departmentMetrics.length === 0) return null;

    // Sort metrics by period to get current and previous periods
    const sortedMetrics = [...departmentMetrics].sort((a, b) => b.period.localeCompare(a.period));
    const currentMetric = sortedMetrics[0];
    const previousMetric = sortedMetrics[1];

    const totalBilled = currentMetric.totalBilled;
    const totalCollected = currentMetric.totalCollected;
    const collectionRate = (totalCollected / totalBilled) * 100;

    // Calculate period-over-period changes
    const calculateChange = (current: number, previous: number) => {
      if (!previous) return 0;
      return ((current - previous) / previous) * 100;
    };

    const changes = previousMetric ? {
      billed: calculateChange(currentMetric.totalBilled, previousMetric.totalBilled),
      collected: calculateChange(currentMetric.totalCollected, previousMetric.totalCollected),
      daysInAR: calculateChange(currentMetric.daysInAR, previousMetric.daysInAR),
      denialRate: calculateChange(currentMetric.denialRate, previousMetric.denialRate),
      cleanClaimRate: calculateChange(currentMetric.cleanClaimRate, previousMetric.cleanClaimRate),
      collectionRate: calculateChange(collectionRate, (previousMetric.totalCollected / previousMetric.totalBilled) * 100),
    } : null;

    return {
      ...currentMetric,
      collectionRate,
      changes,
      previousPeriod: previousMetric?.period,
    };
  };

  const departments = ['emergency', 'outpatient', 'inpatient'];

  const renderMetricChange = (change: number | undefined) => {
    if (change === undefined) return null;
    const isPositive = change > 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const icon = isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;

    return (
      <div className={`flex items-center space-x-1 ${color}`}>
        {icon}
        <span>{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {departments.map((department) => {
        const departmentMetrics = calculateDepartmentMetrics(department);
        if (!departmentMetrics) return null;

        return (
          <Card key={department}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{department} Department</CardTitle>
                {departmentMetrics.previousPeriod && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{departmentMetrics.previousPeriod}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>{departmentMetrics.period}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Total Billed</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        ${departmentMetrics.totalBilled.toLocaleString()}
                      </div>
                      {renderMetricChange(departmentMetrics.changes?.billed)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Total Collected</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        ${departmentMetrics.totalCollected.toLocaleString()}
                      </div>
                      {renderMetricChange(departmentMetrics.changes?.collected)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Days in AR</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <div className={`text-lg font-semibold ${getMetricColor(departmentMetrics.daysInAR, { good: 30, warning: 45 })}`}>
                          {departmentMetrics.daysInAR}
                        </div>
                        {getMetricIcon(departmentMetrics.daysInAR, { good: 30, warning: 45 })}
                      </div>
                      {renderMetricChange(departmentMetrics.changes?.daysInAR)}
                    </div>
                  </div>
                  <Progress
                    value={(departmentMetrics.daysInAR / 90) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Denial Rate</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <div className={`text-lg font-semibold ${getMetricColor(departmentMetrics.denialRate, { good: 5, warning: 10 })}`}>
                          {departmentMetrics.denialRate}%
                        </div>
                        {getMetricIcon(departmentMetrics.denialRate, { good: 5, warning: 10 })}
                      </div>
                      {renderMetricChange(departmentMetrics.changes?.denialRate)}
                    </div>
                  </div>
                  <Progress
                    value={departmentMetrics.denialRate}
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Collection Rate</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <div className={`text-lg font-semibold ${getMetricColor(departmentMetrics.collectionRate, { good: 95, warning: 85 })}`}>
                          {departmentMetrics.collectionRate.toFixed(1)}%
                        </div>
                        {getMetricIcon(departmentMetrics.collectionRate, { good: 95, warning: 85 })}
                      </div>
                      {renderMetricChange(departmentMetrics.changes?.collectionRate)}
                    </div>
                  </div>
                  <Progress
                    value={departmentMetrics.collectionRate}
                    className="h-2"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center space-x-4">
                <Badge className="bg-blue-100 text-blue-800">
                  Clean Claim Rate: {departmentMetrics.cleanClaimRate}%
                  {renderMetricChange(departmentMetrics.changes?.cleanClaimRate)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}; 