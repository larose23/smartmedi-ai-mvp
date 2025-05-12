import { TriageRequest, TriageResponse, TriageCase } from '../types/triage';

const API_BASE_URL = '/api/triage';

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

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AlertConfig {
  id: string;
  type: 'email' | 'sms' | 'slack';
  recipient: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const triageService = {
  // Create a new triage case
  async createTriageCase(request: TriageRequest): Promise<TriageResponse & { caseId: string }> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create triage case');
    }

    return response.json();
  },

  // Get a specific triage case
  async getTriageCase(id: string): Promise<TriageCase> {
    const response = await fetch(`${API_BASE_URL}/${id}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch triage case');
    }

    return response.json();
  },

  // Update a triage case
  async updateTriageCase(id: string, updates: Partial<TriageCase>): Promise<TriageCase> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update triage case');
    }

    return response.json();
  },

  // Delete a triage case
  async deleteTriageCase(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete triage case');
    }
  },

  // Override triage severity
  async overrideTriageSeverity(id: string, newSeverity: string, reason: string): Promise<TriageCase> {
    return this.updateTriageCase(id, {
      severity: newSeverity,
      override_reason: reason,
    });
  },

  // Escalate a case
  async escalateCase(id: string, reason: string): Promise<TriageCase> {
    return this.updateTriageCase(id, {
      is_escalated: true,
      staff_notes: reason,
    });
  },

  // Add staff notes
  async addStaffNotes(id: string, notes: string): Promise<TriageCase> {
    return this.updateTriageCase(id, {
      staff_notes: notes,
    });
  },

  // Mark case as seen
  async markCaseAsSeen(id: string): Promise<TriageCase> {
    return this.updateTriageCase(id, {
      seen_by_staff: true,
    });
  },

  // Bulk update cases
  async bulkUpdateCases(caseIds: string[], updates: Partial<TriageCase>, reason?: string): Promise<{ message: string; updatedCases: TriageCase[] }> {
    const response = await fetch(`${API_BASE_URL}/bulk?operation=update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caseIds, updates, reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to perform bulk update');
    }

    return response.json();
  },

  // Bulk reassign cases
  async bulkReassignCases(caseIds: string[], newDepartment: string, reason: string): Promise<{ message: string; updatedCases: TriageCase[] }> {
    const response = await fetch(`${API_BASE_URL}/bulk?operation=reassign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caseIds, newDepartment, reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to perform bulk reassignment');
    }

    return response.json();
  },

  // Bulk delete cases
  async bulkDeleteCases(caseIds: string[]): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/bulk?operation=delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caseIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to perform bulk delete');
    }

    return response.json();
  },

  // Get trend analytics
  async getTrendAnalytics(timeRange: TimeRange) {
    try {
      const response = await fetch('/api/triage/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'trends',
          timeRange,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trend analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching trend analytics:', error);
      throw error;
    }
  },

  // Get department analytics
  async getDepartmentAnalytics(timeRange: TimeRange, department?: string) {
    try {
      const response = await fetch('/api/triage/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'department',
          timeRange,
          department,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch department analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching department analytics:', error);
      throw error;
    }
  },

  // Get staff analytics
  async getStaffAnalytics(timeRange: TimeRange, staffId?: string) {
    try {
      const response = await fetch('/api/triage/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'staff',
          timeRange,
          staffId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch staff analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching staff analytics:', error);
      throw error;
    }
  },

  // Get performance metrics
  async getPerformanceMetrics(timeRange: TimeRange) {
    try {
      const response = await fetch('/api/triage/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'performance',
          timeRange,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch performance metrics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      throw error;
    }
  },

  // Register a new webhook
  async registerWebhook(config: Omit<WebhookConfig, 'id' | 'created_at' | 'updated_at'>): Promise<WebhookConfig> {
    const response = await fetch(`${API_BASE_URL}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to register webhook');
    }

    return response.json();
  },

  // List all webhooks
  async listWebhooks(): Promise<WebhookConfig[]> {
    const response = await fetch(`${API_BASE_URL}/webhooks`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to list webhooks');
    }

    return response.json();
  },

  // Delete a webhook
  async deleteWebhook(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/webhooks?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete webhook');
    }
  },

  // Register a new alert configuration
  async registerAlert(config: Omit<AlertConfig, 'id' | 'created_at' | 'updated_at'>): Promise<AlertConfig> {
    const response = await fetch(`${API_BASE_URL}/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to register alert');
    }

    return response.json();
  },

  // List all alert configurations
  async listAlerts(): Promise<AlertConfig[]> {
    const response = await fetch(`${API_BASE_URL}/alerts`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to list alerts');
    }

    return response.json();
  },

  // Update alert configuration
  async updateAlert(id: string, isActive: boolean): Promise<AlertConfig> {
    const response = await fetch(`${API_BASE_URL}/alerts?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active: isActive }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update alert');
    }

    return response.json();
  },

  // Delete alert configuration
  async deleteAlert(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/alerts?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete alert');
    }
  },
}; 