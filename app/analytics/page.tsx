'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import PatientFlowChart from '../../components/analytics/PatientFlowChart';
import SymptomDistributionChart from '../../components/analytics/SymptomDistributionChart';
import DepartmentWorkloadChart from '../../components/analytics/DepartmentWorkloadChart';
import WaitTimeMetrics from '../../components/analytics/WaitTimeMetrics';
import DailyCheckInsChart from '../../components/analytics/DailyCheckInsChart';
import { Button } from '../../components/ui/button';
import { DateRangePicker } from '../../components/ui/date-range-picker';
import { format } from 'date-fns';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date()
  });

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd') + 'T23:59:59';
        const { data, error } = await supabase
          .from('check_ins')
          .select('*')
          .gte('created_at', fromDate)
          .lte('created_at', toDate)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setCheckIns(data || []);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalyticsData();
  }, [dateRange]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">SmartMedi Analytics Dashboard</h1>
        <Link href="/dashboard">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
      </div>
      <div className="mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Data Range Selection</CardTitle>
            <CardDescription>Select a date range to filter analytics data</CardDescription>
          </CardHeader>
          <CardContent>
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
            />
          </CardContent>
        </Card>
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-500 rounded-md">
          {error}
        </div>
      ) : (
        <>
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="patientFlow">Patient Flow</TabsTrigger>
              <TabsTrigger value="departments">Departments</TabsTrigger>
              <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Total Check-ins</CardTitle>
                    <CardDescription>Current period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{checkIns.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>High Priority</CardTitle>
                    <CardDescription>Urgent cases</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-500">
                      {checkIns.filter(c => c.triage_score === 'High').length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Avg. Wait Time</CardTitle>
                    <CardDescription>In minutes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {Math.round(checkIns.reduce((acc, c) => acc + (c.estimated_wait_minutes || 0), 0) / (checkIns.length || 1))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Departments</CardTitle>
                    <CardDescription>Active departments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {new Set(checkIns.map(c => c.department)).size}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Daily Check-ins</CardTitle>
                  <CardDescription>Patient volume over time</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <DailyCheckInsChart data={checkIns} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="patientFlow" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Flow Analysis</CardTitle>
                  <CardDescription>Check-ins by priority level</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <PatientFlowChart data={checkIns} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Wait Time Metrics</CardTitle>
                  <CardDescription>Average wait times by department and priority</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <WaitTimeMetrics data={checkIns} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="departments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Department Workload</CardTitle>
                  <CardDescription>Patient distribution across departments</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <DepartmentWorkloadChart data={checkIns} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="symptoms" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Symptom Distribution</CardTitle>
                  <CardDescription>Common symptoms and their frequency</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <SymptomDistributionChart data={checkIns} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
} 