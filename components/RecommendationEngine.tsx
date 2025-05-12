import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface PatientData {
  id: string;
  age: number;
  gender: string;
  conditions: string[];
  medications: string[];
  labResults: Record<string, number>;
  vitals: Record<string, number>;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  evidenceLevel: 'A' | 'B' | 'C';
  confidence: number;
  source: string;
  actionItems: string[];
}

interface RecommendationEngineProps {
  recommendations: Recommendation[];
  patientData: PatientData | null;
  onRecommendationSelect: (recommendation: Recommendation) => void;
}

const getEvidenceLevelColor = (level: 'A' | 'B' | 'C'): string => {
  switch (level) {
    case 'A':
      return 'bg-green-500';
    case 'B':
      return 'bg-yellow-500';
    case 'C':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.6) return 'text-yellow-600';
  return 'text-orange-600';
};

export const RecommendationEngine: React.FC<RecommendationEngineProps> = ({
  recommendations,
  patientData,
  onRecommendationSelect,
}) => {
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    // Sort by evidence level first (A > B > C)
    if (a.evidenceLevel !== b.evidenceLevel) {
      return a.evidenceLevel.localeCompare(b.evidenceLevel);
    }
    // Then by confidence
    return b.confidence - a.confidence;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Evidence-Based Recommendations</CardTitle>
          <CardDescription>
            Recommendations based on patient data and clinical guidelines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {sortedRecommendations.map((recommendation) => (
                <Card key={recommendation.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {recommendation.title}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge
                            className={`${getEvidenceLevelColor(
                              recommendation.evidenceLevel
                            )} text-white`}
                          >
                            Level {recommendation.evidenceLevel}
                          </Badge>
                          <span
                            className={`text-sm font-medium ${getConfidenceColor(
                              recommendation.confidence
                            )}`}
                          >
                            {Math.round(recommendation.confidence * 100)}% Confidence
                          </span>
                        </div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onRecommendationSelect(recommendation)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View detailed information</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      {recommendation.description}
                    </p>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Action Items:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {recommendation.actionItems.map((item, index) => (
                          <li key={index} className="text-sm text-gray-600">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      Source: {recommendation.source}
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