import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { ChevronRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface PatientData {
  id: string;
  age: number;
  gender: string;
  conditions: string[];
  medications: string[];
  labResults: Record<string, number>;
  vitals: Record<string, number>;
}

interface PathwayStep {
  id: string;
  name: string;
  description: string;
  duration: number;
  outcomes: string[];
  nextSteps: string[];
}

interface ClinicalPathwayData {
  id: string;
  name: string;
  steps: PathwayStep[];
}

interface ClinicalPathwayProps {
  pathways: ClinicalPathwayData[];
  patientData: PatientData | null;
  onPathwaySelect: (pathway: ClinicalPathwayData) => void;
}

export const ClinicalPathway: React.FC<ClinicalPathwayProps> = ({
  pathways,
  patientData,
  onPathwaySelect,
}) => {
  const [selectedPathway, setSelectedPathway] = useState<ClinicalPathwayData | null>(
    pathways[0] || null
  );

  const handlePathwaySelect = (pathway: ClinicalPathwayData) => {
    setSelectedPathway(pathway);
    onPathwaySelect(pathway);
  };

  const getStepStatus = (step: PathwayStep): 'completed' | 'current' | 'upcoming' => {
    // This is a placeholder. In a real implementation, you would check the patient's progress
    return 'upcoming';
  };

  const getStatusIcon = (status: 'completed' | 'current' | 'upcoming') => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'current':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'upcoming':
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Clinical Pathways</CardTitle>
          <CardDescription>
            Visualize and track patient progress through clinical pathways
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            {pathways.map((pathway) => (
              <Button
                key={pathway.id}
                variant={selectedPathway?.id === pathway.id ? 'default' : 'outline'}
                onClick={() => handlePathwaySelect(pathway)}
              >
                {pathway.name}
              </Button>
            ))}
          </div>

          {selectedPathway && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{selectedPathway.name}</h3>
                <Badge variant="outline" className="text-sm">
                  {selectedPathway.steps.length} Steps
                </Badge>
              </div>

              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {selectedPathway.steps.map((step, index) => {
                    const status = getStepStatus(step);
                    return (
                      <Card
                        key={step.id}
                        className={`relative ${
                          status === 'current' ? 'border-yellow-500' : ''
                        }`}
                      >
                        <CardHeader>
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              {getStatusIcon(status)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">
                                  Step {index + 1}: {step.name}
                                </CardTitle>
                                <Badge variant="outline" className="text-sm">
                                  {step.duration} days
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-2">
                                {step.description}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                Expected Outcomes:
                              </h4>
                              <ul className="list-disc list-inside space-y-1">
                                {step.outcomes.map((outcome, idx) => (
                                  <li key={idx} className="text-sm text-gray-600">
                                    {outcome}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {step.nextSteps.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">
                                  Next Steps:
                                </h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {step.nextSteps.map((nextStep, idx) => (
                                    <li key={idx} className="text-sm text-gray-600">
                                      {nextStep}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        {index < selectedPathway.steps.length - 1 && (
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                            <ChevronRight className="h-6 w-6 text-gray-400 rotate-90" />
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 