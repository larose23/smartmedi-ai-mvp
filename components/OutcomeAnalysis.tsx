import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2 } from 'lucide-react';
import { OutcomeAnalysisService } from '../lib/services/outcomeAnalysisService';

interface TreatmentOutcome {
  patientId: string;
  treatmentId: string;
  treatmentName: string;
  startDate: Date;
  endDate: Date;
  outcome: number;
  sideEffects: string[];
  followUpData: {
    date: Date;
    metrics: Record<string, number>;
  }[];
}

interface ComparativeStudy {
  studyId: string;
  treatmentA: string;
  treatmentB: string;
  metrics: {
    effectiveness: number;
    cost: number;
    sideEffects: number;
    patientSatisfaction: number;
  };
  patientCount: number;
  duration: number;
}

interface PredictiveModel {
  modelId: string;
  accuracy: number;
  features: string[];
  predictions: {
    patientId: string;
    predictedOutcome: number;
    confidence: number;
    actualOutcome?: number;
  }[];
}

const validateTreatmentOutcome = (outcome: TreatmentOutcome): boolean => {
  return (
    typeof outcome.patientId === 'string' &&
    typeof outcome.treatmentId === 'string' &&
    typeof outcome.treatmentName === 'string' &&
    outcome.startDate instanceof Date &&
    outcome.endDate instanceof Date &&
    typeof outcome.outcome === 'number' &&
    outcome.outcome >= 0 &&
    outcome.outcome <= 1 &&
    Array.isArray(outcome.sideEffects) &&
    Array.isArray(outcome.followUpData) &&
    outcome.followUpData.every(data => 
      data.date instanceof Date &&
      typeof data.metrics === 'object' &&
      Object.values(data.metrics).every(value => typeof value === 'number')
    )
  );
};

const validateComparativeStudy = (study: ComparativeStudy): boolean => {
  return (
    typeof study.studyId === 'string' &&
    typeof study.treatmentA === 'string' &&
    typeof study.treatmentB === 'string' &&
    typeof study.metrics === 'object' &&
    typeof study.metrics.effectiveness === 'number' &&
    typeof study.metrics.cost === 'number' &&
    typeof study.metrics.sideEffects === 'number' &&
    typeof study.metrics.patientSatisfaction === 'number' &&
    typeof study.patientCount === 'number' &&
    study.patientCount > 0 &&
    typeof study.duration === 'number' &&
    study.duration > 0
  );
};

const validatePredictiveModel = (model: PredictiveModel): boolean => {
  return (
    typeof model.modelId === 'string' &&
    typeof model.accuracy === 'number' &&
    model.accuracy >= 0 &&
    model.accuracy <= 1 &&
    Array.isArray(model.features) &&
    Array.isArray(model.predictions) &&
    model.predictions.every(pred => 
      typeof pred.patientId === 'string' &&
      typeof pred.predictedOutcome === 'number' &&
      typeof pred.confidence === 'number' &&
      (pred.actualOutcome === undefined || typeof pred.actualOutcome === 'number')
    )
  );
};

export const OutcomeAnalysis: React.FC = () => {
  const [treatmentOutcomes, setTreatmentOutcomes] = useState<TreatmentOutcome[]>([]);
  const [comparativeStudies, setComparativeStudies] = useState<ComparativeStudy[]>([]);
  const [predictiveModels, setPredictiveModels] = useState<PredictiveModel[]>([]);
  const [selectedTreatment, setSelectedTreatment] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<string>('effectiveness');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const outcomeAnalysisService = new OutcomeAnalysisService();

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

  useEffect(() => {
    fetchTreatmentOutcomes();
    fetchComparativeStudies();
    fetchPredictiveModels();
  }, [retryCount]);

  const fetchTreatmentOutcomes = async () => {
    try {
      setLoading(true);
      const data = await outcomeAnalysisService.getTreatmentOutcomes();
      const validData = data.filter(validateTreatmentOutcome);
      if (validData.length !== data.length) {
        console.warn('Some treatment outcomes were invalid and were filtered out');
      }
      setTreatmentOutcomes(validData);
    } catch (err) {
      handleError(err, 'fetch treatment outcomes');
    } finally {
      setLoading(false);
    }
  };

  const fetchComparativeStudies = async () => {
    try {
      setLoading(true);
      const data = await outcomeAnalysisService.getComparativeStudies();
      const validData = data.filter(validateComparativeStudy);
      if (validData.length !== data.length) {
        console.warn('Some comparative studies were invalid and were filtered out');
      }
      setComparativeStudies(validData);
    } catch (err) {
      handleError(err, 'fetch comparative studies');
    } finally {
      setLoading(false);
    }
  };

  const fetchPredictiveModels = async () => {
    try {
      setLoading(true);
      const data = await outcomeAnalysisService.getPredictiveModels();
      const validData = data.filter(validatePredictiveModel);
      if (validData.length !== data.length) {
        console.warn('Some predictive models were invalid and were filtered out');
      }
      setPredictiveModels(validData);
    } catch (err) {
      handleError(err, 'fetch predictive models');
    } finally {
      setLoading(false);
    }
  };

  const renderTreatmentEffectiveness = () => (
    <Card>
      <CardHeader>
        <CardTitle>Treatment Effectiveness Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Select
              value={selectedTreatment}
              onValueChange={setSelectedTreatment}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Treatment" />
              </SelectTrigger>
              <SelectContent>
                {treatmentOutcomes.map((outcome) => (
                  <SelectItem key={outcome.treatmentId} value={outcome.treatmentId}>
                    {outcome.treatmentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={treatmentOutcomes
                  .find((t) => t.treatmentId === selectedTreatment)
                  ?.followUpData.map((data) => ({
                    date: data.date.toLocaleDateString(),
                    ...data.metrics,
                  }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pain" stroke="#8884d8" />
                <Line type="monotone" dataKey="mobility" stroke="#82ca9d" />
                <Line type="monotone" dataKey="qualityOfLife" stroke="#ffc658" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderComparativeEffectiveness = () => (
    <Card>
      <CardHeader>
        <CardTitle>Comparative Effectiveness Research</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Select
              value={selectedMetric}
              onValueChange={setSelectedMetric}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="effectiveness">Effectiveness</SelectItem>
                <SelectItem value="cost">Cost</SelectItem>
                <SelectItem value="sideEffects">Side Effects</SelectItem>
                <SelectItem value="patientSatisfaction">Patient Satisfaction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparativeStudies.map((study) => ({
                  study: study.studyId,
                  treatmentA: study.metrics[selectedMetric as keyof typeof study.metrics],
                  treatmentB: study.metrics[selectedMetric as keyof typeof study.metrics],
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="study" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="treatmentA" fill="#8884d8" name="Treatment A" />
                <Bar dataKey="treatmentB" fill="#82ca9d" name="Treatment B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderPredictiveModeling = () => (
    <Card>
      <CardHeader>
        <CardTitle>Predictive Outcome Modeling</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="predictedOutcome" name="Predicted Outcome" />
                <YAxis dataKey="actualOutcome" name="Actual Outcome" />
                <Tooltip />
                <Legend />
                <Scatter
                  data={predictiveModels[0]?.predictions}
                  fill="#8884d8"
                  name="Predictions vs Actual"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Model Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p>Accuracy: {predictiveModels[0]?.accuracy * 100}%</p>
                <p>Features Used:</p>
                <ul className="list-disc list-inside">
                  {predictiveModels[0]?.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading outcome analysis data...</span>
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
      <h1 className="text-3xl font-bold">Outcome Analysis</h1>
      <Tabs defaultValue="effectiveness" className="w-full">
        <TabsList>
          <TabsTrigger value="effectiveness">Treatment Effectiveness</TabsTrigger>
          <TabsTrigger value="comparative">Comparative Research</TabsTrigger>
          <TabsTrigger value="predictive">Predictive Modeling</TabsTrigger>
        </TabsList>
        <TabsContent value="effectiveness">{renderTreatmentEffectiveness()}</TabsContent>
        <TabsContent value="comparative">{renderComparativeEffectiveness()}</TabsContent>
        <TabsContent value="predictive">{renderPredictiveModeling()}</TabsContent>
      </Tabs>
    </div>
  );
}; 