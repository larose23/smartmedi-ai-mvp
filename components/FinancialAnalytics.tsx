import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Download } from 'lucide-react';
import { FinancialAnalyticsService, PatientJourneyCost, ReimbursementSuggestion, RevenueCycleMetric } from '../lib/services/financialAnalyticsService';
import { PatientJourneyCosts } from './financial/PatientJourneyCosts';
import { ReimbursementOptimization } from './financial/ReimbursementOptimization';
import { RevenueCycleMonitoring } from './financial/RevenueCycleMonitoring';

export const FinancialAnalytics: React.FC = () => {
  const [journeyCosts, setJourneyCosts] = useState<PatientJourneyCost[]>([]);
  const [reimbursementSuggestions, setReimbursementSuggestions] = useState<ReimbursementSuggestion[]>([]);
  const [revenueCycleMetrics, setRevenueCycleMetrics] = useState<RevenueCycleMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const financialAnalyticsService = new FinancialAnalyticsService();

  useEffect(() => {
    fetchData();
  }, [retryCount, dateRange, selectedDepartment]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [costsData, suggestionsData, metricsData] = await Promise.all([
        financialAnalyticsService.getPatientJourneyCosts(
          undefined,
          dateRange.start,
          dateRange.end,
          selectedDepartment !== 'all' ? selectedDepartment : undefined
        ),
        financialAnalyticsService.getReimbursementSuggestions(),
        financialAnalyticsService.getRevenueCycleMetrics(
          selectedDepartment !== 'all' ? selectedDepartment : undefined
        ),
      ]);

      setJourneyCosts(costsData);
      setReimbursementSuggestions(suggestionsData);
      setRevenueCycleMetrics(metricsData);
    } catch (err) {
      handleError(err, 'fetch financial data');
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

  const handleExport = async (type: 'costs' | 'suggestions' | 'metrics') => {
    try {
      let data;
      let filename;
      
      switch (type) {
        case 'costs':
          data = journeyCosts;
          filename = 'patient-journey-costs';
          break;
        case 'suggestions':
          data = reimbursementSuggestions;
          filename = 'reimbursement-suggestions';
          break;
        case 'metrics':
          data = revenueCycleMetrics;
          filename = 'revenue-cycle-metrics';
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
        <span className="ml-2 text-lg">Loading financial data...</span>
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Financial Analytics</h1>
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

      <Tabs defaultValue="costs" className="w-full">
        <TabsList>
          <TabsTrigger value="costs">Patient Journey Costs</TabsTrigger>
          <TabsTrigger value="suggestions">Reimbursement Optimization</TabsTrigger>
          <TabsTrigger value="metrics">Revenue Cycle Monitoring</TabsTrigger>
        </TabsList>
        
        <TabsContent value="costs">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={() => handleExport('costs')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </Button>
          </div>
          <PatientJourneyCosts
            costs={journeyCosts}
            onCostUpdate={async (costId, cost) => {
              await financialAnalyticsService.addPatientJourneyCost(cost);
              fetchData();
            }}
          />
        </TabsContent>

        <TabsContent value="suggestions">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={() => handleExport('suggestions')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </Button>
          </div>
          <ReimbursementOptimization
            suggestions={reimbursementSuggestions}
            onSuggestionUpdate={async (suggestionId, status) => {
              await financialAnalyticsService.updateReimbursementSuggestion(suggestionId, status);
              fetchData();
            }}
          />
        </TabsContent>

        <TabsContent value="metrics">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={() => handleExport('metrics')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </Button>
          </div>
          <RevenueCycleMonitoring
            metrics={revenueCycleMetrics}
            onMetricsUpdate={async (metricId, metrics) => {
              await financialAnalyticsService.updateRevenueCycleMetric(metricId, metrics);
              fetchData();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 