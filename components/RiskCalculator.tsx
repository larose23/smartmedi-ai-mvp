import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface PatientData {
  id: string;
  age: number;
  gender: string;
  conditions: string[];
  medications: string[];
  labResults: Record<string, number>;
  vitals: Record<string, number>;
}

interface RiskFactor {
  name: string;
  contribution: number;
  description: string;
}

interface RiskAssessment {
  riskScore: number;
  factors: RiskFactor[];
  recommendations: string[];
}

interface RiskCalculatorProps {
  riskAssessment: RiskAssessment | null;
  patientData: PatientData | null;
  onRiskFactorUpdate: (factor: RiskFactor) => void;
}

const getRiskLevel = (score: number): {
  level: 'low' | 'medium' | 'high';
  color: string;
  description: string;
} => {
  if (score < 0.3) {
    return {
      level: 'low',
      color: 'text-green-600',
      description: 'Low Risk',
    };
  } else if (score < 0.7) {
    return {
      level: 'medium',
      color: 'text-yellow-600',
      description: 'Medium Risk',
    };
  } else {
    return {
      level: 'high',
      color: 'text-red-600',
      description: 'High Risk',
    };
  }
};

export const RiskCalculator: React.FC<RiskCalculatorProps> = ({
  riskAssessment,
  patientData,
  onRiskFactorUpdate,
}) => {
  const [selectedFactor, setSelectedFactor] = useState<RiskFactor | null>(null);

  if (!riskAssessment) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <p className="text-gray-500">No risk assessment data available</p>
        </CardContent>
      </Card>
    );
  }

  const riskLevel = getRiskLevel(riskAssessment.riskScore);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Personalized Risk Assessment</CardTitle>
          <CardDescription>
            Calculate and monitor patient-specific risk factors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Overall Risk Score</h3>
                <Badge
                  variant="outline"
                  className={`text-base ${riskLevel.color}`}
                >
                  {riskLevel.description}
                </Badge>
              </div>
              <Progress
                value={riskAssessment.riskScore * 100}
                className="h-2"
              />
              <p className="text-sm text-gray-500">
                Risk Score: {Math.round(riskAssessment.riskScore * 100)}%
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Risk Factors</h3>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {riskAssessment.factors.map((factor) => (
                    <Card
                      key={factor.name}
                      className={`cursor-pointer transition-colors ${
                        selectedFactor?.name === factor.name
                          ? 'border-primary'
                          : ''
                      }`}
                      onClick={() => setSelectedFactor(factor)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium">{factor.name}</h4>
                            <p className="text-sm text-gray-600">
                              {factor.description}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="outline"
                              className={
                                factor.contribution > 0
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }
                            >
                              {factor.contribution > 0 ? (
                                <TrendingUp className="h-4 w-4 mr-1" />
                              ) : (
                                <TrendingDown className="h-4 w-4 mr-1" />
                              )}
                              {Math.abs(Math.round(factor.contribution * 100))}%
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recommendations</h3>
              <div className="space-y-2">
                {riskAssessment.recommendations.map((recommendation, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg"
                  >
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedFactor && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="text-lg font-semibold">
                  Update {selectedFactor.name}
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contribution">Contribution to Risk</Label>
                    <Input
                      id="contribution"
                      type="number"
                      min="-1"
                      max="1"
                      step="0.1"
                      value={selectedFactor.contribution}
                      onChange={(e) => {
                        const newFactor = {
                          ...selectedFactor,
                          contribution: parseFloat(e.target.value),
                        };
                        onRiskFactorUpdate(newFactor);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={selectedFactor.description}
                      onChange={(e) => {
                        const newFactor = {
                          ...selectedFactor,
                          description: e.target.value,
                        };
                        onRiskFactorUpdate(newFactor);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 