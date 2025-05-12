import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TimeRange {
  start: string;
  end: string;
}

interface AnalyticsQuery {
  type: 'trends' | 'department' | 'staff' | 'performance';
  timeRange: TimeRange;
  department?: string;
  staffId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const query: AnalyticsQuery = req.body;

    switch (query.type) {
      case 'trends':
        return getTrendAnalytics(query.timeRange, res);
      case 'department':
        return getDepartmentAnalytics(query.timeRange, query.department, res);
      case 'staff':
        return getStaffAnalytics(query.timeRange, query.staffId, res);
      case 'performance':
        return getPerformanceMetrics(query.timeRange, res);
      default:
        return res.status(400).json({ error: 'Invalid analytics type' });
    }
  } catch (error) {
    console.error('Error in analytics query:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getTrendAnalytics(timeRange: TimeRange, res: NextApiResponse) {
  try {
    // Get analytics data for the time range
    const { data: analytics, error } = await supabase
      .from('triage_analytics')
      .select('*')
      .gte('timestamp', timeRange.start)
      .lte('timestamp', timeRange.end)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching trend analytics:', error);
      return res.status(500).json({ error: 'Failed to fetch trend analytics' });
    }

    // Calculate trends
    const trends = {
      totalCases: calculateTrend(analytics.map(a => a.total_cases)),
      avgTriageTime: calculateTrend(analytics.map(a => a.avg_triage_time)),
      accuracyRate: calculateTrend(analytics.map(a => a.accuracy_rate)),
      throughput: calculateTrend(analytics.map(a => a.throughput)),
      severityDistribution: calculateSeverityTrends(analytics),
    };

    return res.status(200).json(trends);
  } catch (error) {
    console.error('Error in getTrendAnalytics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getDepartmentAnalytics(timeRange: TimeRange, department?: string, res: NextApiResponse) {
  try {
    let query = supabase
      .from('triage_cases')
      .select('*')
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);

    if (department) {
      query = query.eq('department', department);
    }

    const { data: cases, error } = await query;

    if (error) {
      console.error('Error fetching department analytics:', error);
      return res.status(500).json({ error: 'Failed to fetch department analytics' });
    }

    // Calculate department metrics
    const metrics = {
      totalCases: cases.length,
      avgWaitTime: calculateAverageWaitTime(cases),
      severityDistribution: calculateSeverityDistribution(cases),
      escalationRate: calculateEscalationRate(cases),
      departmentBreakdown: calculateDepartmentBreakdown(cases),
    };

    return res.status(200).json(metrics);
  } catch (error) {
    console.error('Error in getDepartmentAnalytics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getStaffAnalytics(timeRange: TimeRange, staffId?: string, res: NextApiResponse) {
  try {
    let query = supabase
      .from('triage_audit_logs')
      .select('*')
      .gte('timestamp', timeRange.start)
      .lte('timestamp', timeRange.end);

    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching staff analytics:', error);
      return res.status(500).json({ error: 'Failed to fetch staff analytics' });
    }

    // Calculate staff metrics
    const metrics = {
      totalActions: logs.length,
      actionBreakdown: calculateActionBreakdown(logs),
      averageResponseTime: calculateAverageResponseTime(logs),
      overrideRate: calculateOverrideRate(logs),
      accuracyRate: calculateStaffAccuracy(logs),
    };

    return res.status(200).json(metrics);
  } catch (error) {
    console.error('Error in getStaffAnalytics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPerformanceMetrics(timeRange: TimeRange, res: NextApiResponse) {
  try {
    // Get all relevant data
    const [analytics, cases, logs] = await Promise.all([
      supabase
        .from('triage_analytics')
        .select('*')
        .gte('timestamp', timeRange.start)
        .lte('timestamp', timeRange.end),
      supabase
        .from('triage_cases')
        .select('*')
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end),
      supabase
        .from('triage_audit_logs')
        .select('*')
        .gte('timestamp', timeRange.start)
        .lte('timestamp', timeRange.end),
    ]);

    // Calculate performance metrics
    const metrics = {
      systemMetrics: {
        throughput: calculateThroughput(cases.data),
        accuracy: calculateSystemAccuracy(cases.data),
        responseTime: calculateSystemResponseTime(logs.data),
      },
      qualityMetrics: {
        escalationRate: calculateEscalationRate(cases.data),
        overrideRate: calculateOverrideRate(logs.data),
        satisfactionRate: calculateSatisfactionRate(cases.data),
      },
      efficiencyMetrics: {
        resourceUtilization: calculateResourceUtilization(cases.data),
        waitTimeDistribution: calculateWaitTimeDistribution(cases.data),
        processingTime: calculateProcessingTime(logs.data),
      },
    };

    return res.status(200).json(metrics);
  } catch (error) {
    console.error('Error in getPerformanceMetrics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper functions for calculations
function calculateTrend(values: number[]): { current: number; change: number } {
  if (values.length < 2) return { current: values[0] || 0, change: 0 };
  const current = values[values.length - 1];
  const previous = values[values.length - 2];
  const change = ((current - previous) / previous) * 100;
  return { current, change };
}

function calculateSeverityTrends(analytics: any[]) {
  return {
    critical: calculateTrend(analytics.map(a => a.critical_cases)),
    urgent: calculateTrend(analytics.map(a => a.urgent_cases)),
    moderate: calculateTrend(analytics.map(a => a.moderate_cases)),
    stable: calculateTrend(analytics.map(a => a.stable_cases)),
  };
}

function calculateAverageWaitTime(cases: any[]): number {
  if (!cases.length) return 0;
  return cases.reduce((sum, case_) => sum + case_.wait_time, 0) / cases.length;
}

function calculateSeverityDistribution(cases: any[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  cases.forEach(case_ => {
    distribution[case_.severity] = (distribution[case_.severity] || 0) + 1;
  });
  return distribution;
}

function calculateEscalationRate(cases: any[]): number {
  if (!cases.length) return 0;
  const escalated = cases.filter(case_ => case_.is_escalated).length;
  return (escalated / cases.length) * 100;
}

function calculateDepartmentBreakdown(cases: any[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  cases.forEach(case_ => {
    breakdown[case_.department] = (breakdown[case_.department] || 0) + 1;
  });
  return breakdown;
}

function calculateActionBreakdown(logs: any[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  logs.forEach(log => {
    breakdown[log.action] = (breakdown[log.action] || 0) + 1;
  });
  return breakdown;
}

function calculateAverageResponseTime(logs: any[]): number {
  if (!logs.length) return 0;
  // Implementation depends on your logging structure
  return 0;
}

function calculateOverrideRate(logs: any[]): number {
  if (!logs.length) return 0;
  const overrides = logs.filter(log => log.action === 'Triage Override').length;
  return (overrides / logs.length) * 100;
}

function calculateStaffAccuracy(logs: any[]): number {
  if (!logs.length) return 0;
  // Implementation depends on your accuracy tracking
  return 0;
}

function calculateThroughput(cases: any[]): number {
  if (!cases.length) return 0;
  const timeSpan = new Date(cases[cases.length - 1].created_at).getTime() -
    new Date(cases[0].created_at).getTime();
  return (cases.length / (timeSpan / (1000 * 60 * 60))); // Cases per hour
}

function calculateSystemAccuracy(cases: any[]): number {
  if (!cases.length) return 0;
  // Implementation depends on your accuracy tracking
  return 0;
}

function calculateSystemResponseTime(logs: any[]): number {
  if (!logs.length) return 0;
  // Implementation depends on your logging structure
  return 0;
}

function calculateSatisfactionRate(cases: any[]): number {
  if (!cases.length) return 0;
  // Implementation depends on your satisfaction tracking
  return 0;
}

function calculateResourceUtilization(cases: any[]): number {
  if (!cases.length) return 0;
  // Implementation depends on your resource tracking
  return 0;
}

function calculateWaitTimeDistribution(cases: any[]): Record<string, number> {
  const distribution: Record<string, number> = {
    '0-15': 0,
    '16-30': 0,
    '31-60': 0,
    '61+': 0,
  };

  cases.forEach(case_ => {
    const waitTime = case_.wait_time;
    if (waitTime <= 15) distribution['0-15']++;
    else if (waitTime <= 30) distribution['16-30']++;
    else if (waitTime <= 60) distribution['31-60']++;
    else distribution['61+']++;
  });

  return distribution;
}

function calculateProcessingTime(logs: any[]): number {
  if (!logs.length) return 0;
  // Implementation depends on your logging structure
  return 0;
} 