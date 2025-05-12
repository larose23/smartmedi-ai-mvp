import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2 } from 'lucide-react';
import { DecisionSupportService } from '../lib/services/decisionSupportService';
import { ClinicalPathway } from './ClinicalPathway';
import { RiskCalculator } from './RiskCalculator';
import { RecommendationEngine } from './RecommendationEngine';

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

interface ClinicalPathwayData {
  id: string;
  name: string;
  steps: {
    id: string;
    name: string;
    description: string;
    duration: number;
    outcomes: string[];
    nextSteps: string[];
  }[];
}

interface RiskAssessment {
  riskScore: number;
  factors: {
    name: string;
    contribution: number;
    description: string;
  }[];
  recommendations: string[];
}

export const DecisionSupport: React.FC = () => {
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [clinicalPathways, setClinicalPathways] = useState<ClinicalPathwayData[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const decisionSupportService = new DecisionSupportService();

  useEffect(() => {
    fetchPatientData();
    fetchRecommendations();
    fetchClinicalPathways();
    calculateRisk();
  }, [retryCount]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const data = await decisionSupportService.getPatientData();
      setPatientData(data);
    } catch (err) {
      handleError(err, 'fetch patient data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const data = await decisionSupportService.getRecommendations(patientData?.id);
      setRecommendations(data);
    } catch (err) {
      handleError(err, 'fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  const fetchClinicalPathways = async () => {
    try {
      setLoading(true);
      const data = await decisionSupportService.getClinicalPathways(patientData?.conditions);
      setClinicalPathways(data);
    } catch (err) {
      handleError(err, 'fetch clinical pathways');
    } finally {
      setLoading(false);
    }
  };

  const calculateRisk = async () => {
    try {
      setLoading(true);
      const data = await decisionSupportService.calculateRisk(patientData);
      setRiskAssessment(data);
    } catch (err) {
      handleError(err, 'calculate risk assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error: any, context: string) => {
    let errorMessage = `Failed to ${context}`;
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    setError(errorMessage);
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading decision support data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleRetry} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Decision Support</h1>
      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList>
          <TabsTrigger value="recommendations">Evidence-Based Recommendations</TabsTrigger>
          <TabsTrigger value="pathways">Clinical Pathways</TabsTrigger>
          <TabsTrigger value="risk">Risk Calculator</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recommendations">
          <RecommendationEngine
            recommendations={recommendations}
            patientData={patientData}
            onRecommendationSelect={(recommendation) => {
              // Handle recommendation selection
              console.log('Selected recommendation:', recommendation);
            }}
          />
        </TabsContent>

        <TabsContent value="pathways">
          <ClinicalPathway
            pathways={clinicalPathways}
            patientData={patientData}
            onPathwaySelect={(pathway) => {
              // Handle pathway selection
              console.log('Selected pathway:', pathway);
            }}
          />
        </TabsContent>

        <TabsContent value="risk">
          <RiskCalculator
            riskAssessment={riskAssessment}
            patientData={patientData}
            onRiskFactorUpdate={(factor) => {
              // Handle risk factor update
              console.log('Updated risk factor:', factor);
              calculateRisk();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 