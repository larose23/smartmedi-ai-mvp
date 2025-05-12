import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Plus, DollarSign, Calendar, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { PatientJourneyCost } from '../../lib/services/financialAnalyticsService';

interface PatientJourneyCostsProps {
  costs: PatientJourneyCost[];
  onCostUpdate: (costId: string, cost: Omit<PatientJourneyCost, 'id'>) => Promise<void>;
}

export const PatientJourneyCosts: React.FC<PatientJourneyCostsProps> = ({
  costs,
  onCostUpdate,
}) => {
  const [isAddingCost, setIsAddingCost] = useState(false);
  const [newCost, setNewCost] = useState<Partial<PatientJourneyCost>>({
    department: '',
    serviceType: '',
    cost: 0,
    category: 'direct',
  });

  const handleAddCost = async () => {
    if (!newCost.department || !newCost.serviceType || !newCost.cost) {
      return;
    }

    await onCostUpdate('', {
      ...newCost as Omit<PatientJourneyCost, 'id'>,
      date: new Date().toISOString(),
      patientId: 'temp',
      journeyId: 'temp',
    });

    setIsAddingCost(false);
    setNewCost({
      department: '',
      serviceType: '',
      cost: 0,
      category: 'direct',
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'direct':
        return 'bg-blue-100 text-blue-800';
      case 'indirect':
        return 'bg-yellow-100 text-yellow-800';
      case 'overhead':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalCost = costs.reduce((sum, cost) => sum + cost.cost, 0);

  // Calculate cost trends
  const calculateCostTrends = () => {
    const monthlyCosts = costs.reduce((acc, cost) => {
      const month = new Date(cost.date).toISOString().slice(0, 7);
      if (!acc[month]) {
        acc[month] = {
          total: 0,
          byCategory: {
            direct: 0,
            indirect: 0,
            overhead: 0,
          },
        };
      }
      acc[month].total += cost.cost;
      acc[month].byCategory[cost.category] += cost.cost;
      return acc;
    }, {} as Record<string, { total: number; byCategory: Record<string, number> }>);

    const sortedMonths = Object.keys(monthlyCosts).sort();
    const latestMonth = sortedMonths[sortedMonths.length - 1];
    const previousMonth = sortedMonths[sortedMonths.length - 2];

    const trend = previousMonth
      ? ((monthlyCosts[latestMonth].total - monthlyCosts[previousMonth].total) / monthlyCosts[previousMonth].total) * 100
      : 0;

    return {
      monthlyCosts,
      trend,
      latestMonth,
      previousMonth,
    };
  };

  const { monthlyCosts, trend, latestMonth } = calculateCostTrends();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Patient Journey Costs</CardTitle>
            <Button
              variant="outline"
              onClick={() => setIsAddingCost(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Cost</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-2xl font-bold text-green-600">
                ${totalCost.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Cost</div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <div className={`text-2xl font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
                </div>
                {trend >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
              <div className="text-sm text-gray-500">Cost Trend (vs Previous Month)</div>
            </div>
          </div>

          {isAddingCost && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Select
                      value={newCost.department}
                      onValueChange={(value) => setNewCost(prev => ({ ...prev, department: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="outpatient">Outpatient</SelectItem>
                        <SelectItem value="inpatient">Inpatient</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Service Type</label>
                    <Input
                      value={newCost.serviceType}
                      onChange={(e) => setNewCost(prev => ({ ...prev, serviceType: e.target.value }))}
                      placeholder="Enter service type"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cost</label>
                    <Input
                      type="number"
                      value={newCost.cost}
                      onChange={(e) => setNewCost(prev => ({ ...prev, cost: parseFloat(e.target.value) }))}
                      placeholder="Enter cost"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={newCost.category}
                      onValueChange={(value) => setNewCost(prev => ({ ...prev, category: value as 'direct' | 'indirect' | 'overhead' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="indirect">Indirect</SelectItem>
                        <SelectItem value="overhead">Overhead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingCost(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddCost}>
                    Add Cost
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Cost Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(monthlyCosts[latestMonth]?.byCategory || {}).map(([category, amount]) => (
                <Card key={category}>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium capitalize">{category}</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {((amount / monthlyCosts[latestMonth].total) * 100).toFixed(1)}% of total
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {costs.map((cost) => (
                <Card key={cost.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{cost.department}</span>
                        </div>
                        <div className="text-sm text-gray-500">{cost.serviceType}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          ${cost.cost.toLocaleString()}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-500">
                            {new Date(cost.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Badge className={getCategoryColor(cost.category)}>
                        {cost.category}
                      </Badge>
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