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
import { ResourceUtilization as ResourceUtilizationType } from '../../lib/services/operationalAnalyticsService';
import { TrendingUp, TrendingDown, Clock, DollarSign, Gauge } from 'lucide-react';

interface ResourceUtilizationProps {
  utilization: ResourceUtilizationType[];
  onUtilizationUpdate: (resourceId: string, metrics: Partial<ResourceUtilizationType['metrics']>) => void;
}

const getMetricColor = (value: number, max: number): string => {
  const percentage = (value / max) * 100;
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const getMetricIcon = (metric: keyof ResourceUtilizationType['metrics']) => {
  switch (metric) {
    case 'utilizationRate':
      return <Gauge className="h-4 w-4" />;
    case 'downtime':
      return <Clock className="h-4 w-4" />;
    case 'maintenanceCosts':
      return <DollarSign className="h-4 w-4" />;
    case 'efficiency':
      return <TrendingUp className="h-4 w-4" />;
    default:
      return null;
  }
};

const getResourceTypeIcon = (type: ResourceUtilizationType['type']) => {
  switch (type) {
    case 'equipment':
      return '🔧';
    case 'room':
      return '🚪';
    case 'facility':
      return '🏥';
    default:
      return '📊';
  }
};

export const ResourceUtilization: React.FC<ResourceUtilizationProps> = ({
  utilization,
  onUtilizationUpdate,
}) => {
  const [editingResource, setEditingResource] = React.useState<string | null>(null);
  const [editValues, setEditValues] = React.useState<Partial<ResourceUtilizationType['metrics']>>({});

  const handleEdit = (resource: ResourceUtilizationType) => {
    setEditingResource(resource.resourceId);
    setEditValues(resource.metrics);
  };

  const handleSave = (resourceId: string) => {
    onUtilizationUpdate(resourceId, editValues);
    setEditingResource(null);
  };

  const handleCancel = () => {
    setEditingResource(null);
    setEditValues({});
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Resource Utilization Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {utilization.map((resource) => (
                <Card key={resource.resourceId}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">
                          {getResourceTypeIcon(resource.type)}
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold">{resource.name}</h3>
                          <p className="text-sm text-gray-500 capitalize">{resource.type}</p>
                        </div>
                      </div>
                      {editingResource !== resource.resourceId ? (
                        <Button
                          variant="outline"
                          onClick={() => handleEdit(resource)}
                        >
                          Edit Metrics
                        </Button>
                      ) : (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => handleSave(resource.resourceId)}
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
                      {Object.entries(resource.metrics).map(([key, value]) => {
                        const metricKey = key as keyof ResourceUtilizationType['metrics'];
                        const maxValue = metricKey === 'maintenanceCosts' ? 10000 : 100;
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
                              {editingResource === resource.resourceId ? (
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
                                  {metricKey === 'maintenanceCosts' ? '$' : ''}
                                  {value}
                                  {metricKey === 'maintenanceCosts' ? '' : '%'}
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