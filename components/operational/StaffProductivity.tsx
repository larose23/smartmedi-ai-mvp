import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { StaffProductivityMetrics } from '../../lib/services/operationalAnalyticsService';
import { TrendingUp, TrendingDown, Clock, Users, FileText, Star } from 'lucide-react';

interface StaffProductivityProps {
  metrics: StaffProductivityMetrics[];
  onMetricsUpdate: (staffId: string, metrics: Partial<StaffProductivityMetrics['metrics']>) => void;
}

const getMetricColor = (value: number, max: number): string => {
  const percentage = (value / max) * 100;
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const getMetricIcon = (metric: keyof StaffProductivityMetrics['metrics']) => {
  switch (metric) {
    case 'patientsSeen':
      return <Users className="h-4 w-4" />;
    case 'averageConsultationTime':
      return <Clock className="h-4 w-4" />;
    case 'followUpRate':
      return <TrendingUp className="h-4 w-4" />;
    case 'patientSatisfaction':
      return <Star className="h-4 w-4" />;
    case 'documentationCompleteness':
      return <FileText className="h-4 w-4" />;
    default:
      return null;
  }
};

export const StaffProductivity: React.FC<StaffProductivityProps> = ({
  metrics,
  onMetricsUpdate,
}) => {
  const [editingStaff, setEditingStaff] = React.useState<string | null>(null);
  const [editValues, setEditValues] = React.useState<Partial<StaffProductivityMetrics['metrics']>>({});

  const handleEdit = (staff: StaffProductivityMetrics) => {
    setEditingStaff(staff.staffId);
    setEditValues(staff.metrics);
  };

  const handleSave = (staffId: string) => {
    onMetricsUpdate(staffId, editValues);
    setEditingStaff(null);
  };

  const handleCancel = () => {
    setEditingStaff(null);
    setEditValues({});
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Staff Productivity Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {metrics.map((staff) => (
                <Card key={staff.staffId}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{staff.name}</h3>
                        <p className="text-sm text-gray-500">{staff.role}</p>
                      </div>
                      {editingStaff !== staff.staffId ? (
                        <Button
                          variant="outline"
                          onClick={() => handleEdit(staff)}
                        >
                          Edit Metrics
                        </Button>
                      ) : (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => handleSave(staff.staffId)}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={handleCancel}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {Object.entries(staff.metrics).map(([key, value]) => {
                        const metricKey = key as keyof StaffProductivityMetrics['metrics'];
                        const maxValue = metricKey === 'averageConsultationTime' ? 60 : 100;
                        const color = getMetricColor(value, maxValue);
                        const icon = getMetricIcon(metricKey);

                        return (
                          <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {icon}
                                <Label className="text-sm font-medium">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </Label>
                              </div>
                              {editingStaff === staff.staffId ? (
                                <Input
                                  type="number"
                                  value={editValues[metricKey] || value}
                                  onChange={(e) =>
                                    setEditValues(prev => ({
                                      ...prev,
                                      [metricKey]: parseFloat(e.target.value),
                                    }))
                                  }
                                  className="w-24"
                                />
                              ) : (
                                <Badge variant="outline" className={color}>
                                  {value}
                                  {metricKey === 'averageConsultationTime' ? ' min' : '%'}
                                </Badge>
                              )}
                            </div>
                            <Progress
                              value={(value / maxValue) * 100}
                              className="h-2"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}; 