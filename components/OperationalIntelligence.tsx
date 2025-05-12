import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Download } from 'lucide-react';
import { OperationalAnalyticsService, StaffProductivityMetrics, ResourceUtilization, OperationalEfficiency } from '../lib/services/operationalAnalyticsService';
import { StaffProductivity } from './operational/StaffProductivity';
import { ResourceUtilization } from './operational/ResourceUtilization';
import { OperationalEfficiency } from './operational/OperationalEfficiency';
import { DashboardSummary } from './operational/DashboardSummary';

export const OperationalIntelligence: React.FC = () => {
  const [staffMetrics, setStaffMetrics] = useState<StaffProductivityMetrics[]>([]);
  const [resourceUtilization, setResourceUtilization] = useState<ResourceUtilization[]>([]);
  const [operationalEfficiency, setOperationalEfficiency] = useState<OperationalEfficiency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const operationalAnalyticsService = new OperationalAnalyticsService();

  useEffect(() => {
    fetchData();
  }, [retryCount, dateRange, selectedDepartment]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffData, resourceData, efficiencyData] = await Promise.all([
        operationalAnalyticsService.getStaffProductivityMetrics(
          dateRange.start,
          dateRange.end,
          selectedDepartment !== 'all' ? selectedDepartment : undefined
        ),
        operationalAnalyticsService.getResourceUtilization(
          dateRange.start,
          dateRange.end
        ),
        operationalAnalyticsService.getOperationalEfficiency(
          dateRange.start,
          dateRange.end,
          selectedDepartment !== 'all' ? selectedDepartment : undefined
        ),
      ]);

      setStaffMetrics(staffData);
      setResourceUtilization(resourceData);
      setOperationalEfficiency(efficiencyData);
    } catch (err) {
      handleError(err, 'fetch operational data');
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error: any, context: string) => {
    let errorMessage = `Failed to ${context}`;
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    setError(errorMessage);
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  const handleExport = async (type: 'staff' | 'resources' | 'efficiency') => {
    try {
      let data;
      let filename;
      
      switch (type) {
        case 'staff':
          data = staffMetrics;
          filename = 'staff-productivity-metrics';
          break;
        case 'resources':
          data = resourceUtilization;
          filename = 'resource-utilization-metrics';
          break;
        case 'efficiency':
          data = operationalEfficiency;
          filename = 'operational-efficiency-metrics';
          break;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${dateRange.start}-to-${dateRange.end}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      handleError(err, 'export data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading operational data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleRetry} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardSummary
        staffMetrics={staffMetrics}
        resourceUtilization={resourceUtilization}
        operationalEfficiency={operationalEfficiency}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Operational Intelligence</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-40"
            />
            <span>to</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-40"
            />
          </div>
          <Select
            value={selectedDepartment}
            onValueChange={setSelectedDepartment}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
              <SelectItem value="outpatient">Outpatient</SelectItem>
              <SelectItem value="inpatient">Inpatient</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="staff" className="w-full">
        <TabsList>
          <TabsTrigger value="staff">Staff Productivity</TabsTrigger>
          <TabsTrigger value="resources">Resource Utilization</TabsTrigger>
          <TabsTrigger value="efficiency">Operational Efficiency</TabsTrigger>
        </TabsList>
        
        <TabsContent value="staff">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={() => handleExport('staff')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </Button>
          </div>
          <StaffProductivity
            metrics={staffMetrics}
            onMetricsUpdate={async (staffId, metrics) => {
              await operationalAnalyticsService.updateStaffMetrics(staffId, metrics);
              fetchData();
            }}
          />
        </TabsContent>

        <TabsContent value="resources">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={() => handleExport('resources')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </Button>
          </div>
          <ResourceUtilization
            utilization={resourceUtilization}
            onUtilizationUpdate={async (resourceId, metrics) => {
              await operationalAnalyticsService.updateResourceUtilization(resourceId, metrics);
              fetchData();
            }}
          />
        </TabsContent>

        <TabsContent value="efficiency">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={() => handleExport('efficiency')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </Button>
          </div>
          <OperationalEfficiency
            efficiency={operationalEfficiency}
            onEfficiencyUpdate={async (departmentId, metrics) => {
              await operationalAnalyticsService.updateOperationalEfficiency(departmentId, metrics);
              fetchData();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 