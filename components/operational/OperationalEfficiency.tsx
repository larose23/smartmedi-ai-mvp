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
import { OperationalEfficiency as OperationalEfficiencyType } from '../../lib/services/operationalAnalyticsService';
import { Clock, TrendingUp, DollarSign, Gauge } from 'lucide-react';

interface OperationalEfficiencyProps {
  efficiency: OperationalEfficiencyType[];
  onEfficiencyUpdate: (departmentId: string, metrics: Partial<OperationalEfficiencyType['metrics']>) => void;
}

const getMetricColor = (value: number, max: number): string => {
  const percentage = (value / max) * 100;
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const getMetricIcon = (metric: keyof OperationalEfficiencyType['metrics']) => {
  switch (metric) {
    case 'waitTime':
      return <Clock className="h-4 w-4" />;
    case 'throughput':
      return <TrendingUp className="h-4 w-4" />;
    case 'costPerPatient':
      return <DollarSign className="h-4 w-4" />;
    case 'resourceEfficiency':
      return <Gauge className="h-4 w-4" />;
    default:
      return null;
  }
};

export const OperationalEfficiency: React.FC<OperationalEfficiencyProps> = ({
  efficiency,
  onEfficiencyUpdate,
}) => {
  const [editingDepartment, setEditingDepartment] = React.useState<string | null>(null);
  const [editValues, setEditValues] = React.useState<Partial<OperationalEfficiencyType['metrics']>>({});

  const handleEdit = (department: OperationalEfficiencyType) => {
    setEditingDepartment(department.departmentId);
    setEditValues(department.metrics);
  };

  const handleSave = (departmentId: string) => {
    onEfficiencyUpdate(departmentId, editValues);
    setEditingDepartment(null);
  };

  const handleCancel = () => {
    setEditingDepartment(null);
    setEditValues({});
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Operational Efficiency Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {efficiency.map((department) => (
                <Card key={department.departmentId}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{department.name}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(department.period.start).toLocaleDateString()} - {new Date(department.period.end).toLocaleDateString()}
                        </p>
                      </div>
                      {editingDepartment !== department.departmentId ? (
                        <Button
                          variant="outline"
                          onClick={() => handleEdit(department)}
                        >
                          Edit Metrics
                        </Button>
                      ) : (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => handleSave(department.departmentId)}
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
                      {Object.entries(department.metrics).map(([key, value]) => {
                        const metricKey = key as keyof OperationalEfficiencyType['metrics'];
                        const maxValue = metricKey === 'costPerPatient' ? 1000 : 100;
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
                              {editingDepartment === department.departmentId ? (
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
                                  {metricKey === 'costPerPatient' ? '$' : ''}
                                  {value}
                                  {metricKey === 'waitTime' ? ' min' : 
                                   metricKey === 'costPerPatient' ? '' : '%'}
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