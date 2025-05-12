import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';

export interface PatientVolumePrediction {
  department: string;
  date: Date;
  predictedVolume: number;
  confidence: number;
  factors: {
    name: string;
    impact: number;
  }[];
}

export interface StaffAllocation {
  department: string;
  date: Date;
  recommendedStaff: {
    role: string;
    count: number;
    reason: string;
  }[];
  currentStaff: {
    role: string;
    count: number;
  }[];
  adjustments: {
    role: string;
    change: number;
    reason: string;
  }[];
}

export interface DepartmentLoad {
  department: string;
  currentLoad: number;
  predictedLoad: number;
  recommendations: {
    action: string;
    impact: number;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  }[];
}

export class ResourceAllocationService {
  private static instance: ResourceAllocationService;

  private constructor() {}

  public static getInstance(): ResourceAllocationService {
    if (!ResourceAllocationService.instance) {
      ResourceAllocationService.instance = new ResourceAllocationService();
    }
    return ResourceAllocationService.instance;
  }

  async predictPatientVolume(
    department: string,
    startDate: Date,
    endDate: Date
  ): Promise<PatientVolumePrediction[]> {
    try {
      // In a real implementation, this would use historical data and ML models
      // For now, we'll use a simplified prediction model
      const predictions: PatientVolumePrediction[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        // Base volume varies by department
        const baseVolume = this.getBaseVolume(department);
        
        // Adjust for day of week
        const dayOfWeek = currentDate.getDay();
        const dayFactor = this.getDayOfWeekFactor(dayOfWeek);
        
        // Adjust for seasonality
        const month = currentDate.getMonth();
        const seasonalityFactor = this.getSeasonalityFactor(month, department);
        
        // Calculate final prediction
        const predictedVolume = Math.round(baseVolume * dayFactor * seasonalityFactor);
        
        predictions.push({
          department,
          date: new Date(currentDate),
          predictedVolume,
          confidence: 0.85, // Example confidence score
          factors: [
            { name: 'Day of Week', impact: dayFactor },
            { name: 'Seasonality', impact: seasonalityFactor }
          ]
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'patient_volume_prediction',
        { department, startDate, endDate },
        '127.0.0.1',
        'ResourceAllocationService',
        true
      );

      return predictions;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'patient_volume_prediction_error',
        { error: error.message },
        '127.0.0.1',
        'ResourceAllocationService'
      );
      throw error;
    }
  }

  async getStaffAllocationRecommendations(
    department: string,
    date: Date
  ): Promise<StaffAllocation> {
    try {
      // Get predicted volume for the date
      const predictions = await this.predictPatientVolume(
        department,
        date,
        new Date(date.getTime() + 24 * 60 * 60 * 1000)
      );
      const predictedVolume = predictions[0].predictedVolume;

      // Get current staff levels
      const currentStaff = await this.getCurrentStaffLevels(department);

      // Calculate recommended staff levels based on predicted volume
      const recommendedStaff = this.calculateRecommendedStaff(
        department,
        predictedVolume,
        currentStaff
      );

      // Calculate necessary adjustments
      const adjustments = this.calculateStaffAdjustments(
        currentStaff,
        recommendedStaff
      );

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'staff_allocation_recommendation',
        { department, date },
        '127.0.0.1',
        'ResourceAllocationService',
        true
      );

      return {
        department,
        date,
        recommendedStaff,
        currentStaff,
        adjustments
      };
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'staff_allocation_recommendation_error',
        { error: error.message },
        '127.0.0.1',
        'ResourceAllocationService'
      );
      throw error;
    }
  }

  async getDepartmentLoadBalancing(
    date: Date
  ): Promise<DepartmentLoad[]> {
    try {
      const departments = ['cardiology', 'neurology', 'orthopedics', 'pediatrics'];
      const loads: DepartmentLoad[] = [];

      for (const department of departments) {
        // Get current and predicted load
        const currentLoad = await this.getCurrentDepartmentLoad(department);
        const predictions = await this.predictPatientVolume(
          department,
          date,
          new Date(date.getTime() + 24 * 60 * 60 * 1000)
        );
        const predictedLoad = predictions[0].predictedVolume;

        // Generate recommendations
        const recommendations = this.generateLoadBalancingRecommendations(
          department,
          currentLoad,
          predictedLoad
        );

        loads.push({
          department,
          currentLoad,
          predictedLoad,
          recommendations
        });
      }

      await hipaaAuditLogger.logAccess(
        'system',
        'provider',
        PHICategory.PHI,
        'department_load_balancing',
        { date },
        '127.0.0.1',
        'ResourceAllocationService',
        true
      );

      return loads;
    } catch (error) {
      await hipaaAuditLogger.logError(
        'system',
        'provider',
        PHICategory.PHI,
        'department_load_balancing_error',
        { error: error.message },
        '127.0.0.1',
        'ResourceAllocationService'
      );
      throw error;
    }
  }

  private getBaseVolume(department: string): number {
    // Example base volumes by department
    const baseVolumes: Record<string, number> = {
      cardiology: 50,
      neurology: 40,
      orthopedics: 45,
      pediatrics: 60
    };
    return baseVolumes[department] || 30;
  }

  private getDayOfWeekFactor(day: number): number {
    // Higher volume on weekdays, lower on weekends
    const factors = [0.7, 1.2, 1.2, 1.2, 1.2, 1.2, 0.7];
    return factors[day];
  }

  private getSeasonalityFactor(month: number, department: string): number {
    // Example seasonality factors
    const seasonality: Record<string, number[]> = {
      cardiology: [1.1, 1.1, 1.0, 1.0, 0.9, 0.9, 0.9, 0.9, 1.0, 1.0, 1.1, 1.1],
      neurology: [1.0, 1.0, 1.1, 1.1, 1.0, 1.0, 0.9, 0.9, 1.0, 1.0, 1.1, 1.1],
      orthopedics: [0.9, 0.9, 1.0, 1.0, 1.1, 1.1, 1.2, 1.2, 1.1, 1.1, 1.0, 1.0],
      pediatrics: [1.2, 1.2, 1.1, 1.1, 1.0, 1.0, 0.9, 0.9, 1.0, 1.0, 1.1, 1.1]
    };
    return seasonality[department]?.[month] || 1.0;
  }

  private async getCurrentStaffLevels(department: string): Promise<{ role: string; count: number }[]> {
    // In a real implementation, this would fetch from a database
    return [
      { role: 'doctor', count: 3 },
      { role: 'nurse', count: 5 },
      { role: 'technician', count: 2 }
    ];
  }

  private calculateRecommendedStaff(
    department: string,
    predictedVolume: number,
    currentStaff: { role: string; count: number }[]
  ): { role: string; count: number; reason: string }[] {
    // Example staff-to-patient ratios
    const ratios: Record<string, { role: string; ratio: number }[]> = {
      cardiology: [
        { role: 'doctor', ratio: 15 },
        { role: 'nurse', ratio: 8 },
        { role: 'technician', ratio: 20 }
      ],
      neurology: [
        { role: 'doctor', ratio: 12 },
        { role: 'nurse', ratio: 6 },
        { role: 'technician', ratio: 15 }
      ]
    };

    const departmentRatios = ratios[department] || ratios.cardiology;
    return departmentRatios.map(({ role, ratio }) => ({
      role,
      count: Math.ceil(predictedVolume / ratio),
      reason: `Based on predicted volume of ${predictedVolume} patients and ratio of 1:${ratio}`
    }));
  }

  private calculateStaffAdjustments(
    current: { role: string; count: number }[],
    recommended: { role: string; count: number; reason: string }[]
  ): { role: string; change: number; reason: string }[] {
    return recommended.map(rec => {
      const currentCount = current.find(c => c.role === rec.role)?.count || 0;
      return {
        role: rec.role,
        change: rec.count - currentCount,
        reason: rec.reason
      };
    });
  }

  private async getCurrentDepartmentLoad(department: string): Promise<number> {
    // In a real implementation, this would calculate based on current patients
    return Math.floor(Math.random() * 50) + 20;
  }

  private generateLoadBalancingRecommendations(
    department: string,
    currentLoad: number,
    predictedLoad: number
  ): { action: string; impact: number; priority: 'high' | 'medium' | 'low'; reason: string }[] {
    const recommendations: { action: string; impact: number; priority: 'high' | 'medium' | 'low'; reason: string }[] = [];

    // Calculate load difference
    const loadDifference = predictedLoad - currentLoad;
    const loadPercentage = (loadDifference / currentLoad) * 100;

    if (loadPercentage > 20) {
      recommendations.push({
        action: 'Increase staff allocation',
        impact: Math.abs(loadPercentage),
        priority: 'high',
        reason: `Predicted load increase of ${Math.round(loadPercentage)}%`
      });
    } else if (loadPercentage < -20) {
      recommendations.push({
        action: 'Reduce staff allocation',
        impact: Math.abs(loadPercentage),
        priority: 'medium',
        reason: `Predicted load decrease of ${Math.round(Math.abs(loadPercentage))}%`
      });
    }

    // Add department-specific recommendations
    if (department === 'cardiology' && predictedLoad > 40) {
      recommendations.push({
        action: 'Prepare additional cardiac monitoring equipment',
        impact: 15,
        priority: 'high',
        reason: 'High predicted volume for cardiac patients'
      });
    }

    return recommendations;
  }
} 