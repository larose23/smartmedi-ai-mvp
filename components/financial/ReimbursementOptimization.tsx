import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2, XCircle, SlidersHorizontal } from 'lucide-react';
import { ReimbursementSuggestion } from '../../lib/services/financialAnalyticsService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';

interface ReimbursementOptimizationProps {
  suggestions: ReimbursementSuggestion[];
  onSuggestionUpdate: (suggestionId: string, status: 'approved' | 'rejected') => Promise<void>;
}

type SortOption = 'confidence' | 'potentialIncrease' | 'date';
type SortDirection = 'asc' | 'desc';

export const ReimbursementOptimization: React.FC<ReimbursementOptimizationProps> = ({
  suggestions,
  onSuggestionUpdate,
}) => {
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(60);
  const [sortBy, setSortBy] = useState<SortOption>('confidence');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredAndSortedSuggestions = useMemo(() => {
    return suggestions
      .filter(suggestion => suggestion.confidence >= confidenceThreshold)
      .sort((a, b) => {
        const multiplier = sortDirection === 'asc' ? 1 : -1;
        switch (sortBy) {
          case 'confidence':
            return (a.confidence - b.confidence) * multiplier;
          case 'potentialIncrease':
            return (a.potentialIncrease - b.potentialIncrease) * multiplier;
          case 'date':
            return (new Date(a.date).getTime() - new Date(b.date).getTime()) * multiplier;
          default:
            return 0;
        }
      });
  }, [suggestions, confidenceThreshold, sortBy, sortDirection]);

  const totalPotentialIncrease = filteredAndSortedSuggestions.reduce(
    (sum, suggestion) => sum + (suggestion.status === 'pending' ? suggestion.potentialIncrease : 0),
    0
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Reimbursement Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="text-2xl font-bold text-green-600">
              ${totalPotentialIncrease.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Potential Revenue Increase</div>
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Confidence Threshold:</span>
              <Input
                type="number"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="w-20"
                min={0}
                max={100}
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Sort by:</span>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as SortOption)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confidence">Confidence</SelectItem>
                  <SelectItem value="potentialIncrease">Potential Increase</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {filteredAndSortedSuggestions.map((suggestion) => (
                <Card key={suggestion.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            Current Code: {suggestion.currentCode}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            Suggested Code: {suggestion.suggestedCode}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {suggestion.reasoning}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          +${suggestion.potentialIncrease.toLocaleString()}
                        </div>
                        <div className={`text-sm font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                          {suggestion.confidence}% Confidence
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <Badge className={getStatusColor(suggestion.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(suggestion.status)}
                          <span>{suggestion.status}</span>
                        </div>
                      </Badge>
                      {suggestion.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSuggestionUpdate(suggestion.id, 'rejected')}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onSuggestionUpdate(suggestion.id, 'approved')}
                          >
                            Approve
                          </Button>
                        </div>
                      )}
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