import React, { useState, useEffect, useCallback } from 'react';
import { symptomAnalysisService } from '../lib/services/symptomAnalysis';
import { useAuth } from '../hooks/useAuth';
import debounce from 'lodash/debounce';

interface SymptomCollectionProps {
  onComplete: (data: any) => void;
  initialData?: any;
}

export const SmartSymptomCollection: React.FC<SymptomCollectionProps> = ({
  onComplete,
  initialData
}) => {
  const { user } = useAuth();
  const [symptomText, setSymptomText] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationSuggestions, setValidationSuggestions] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (initialData) {
      setSymptomText(initialData.symptomText || '');
      setAnswers(initialData.answers || {});
    }
  }, [initialData]);

  // Debounced symptom analysis
  const debouncedAnalysis = useCallback(
    debounce(async (text: string) => {
      setIsAnalyzing(true);
      setIsValidating(true);
      setError(null);

      try {
        const result = await symptomAnalysisService.analyzeSymptoms(
          text,
          user?.id || 'anonymous',
          user?.role || 'patient'
        );
        setAnalysis(result);

        // Validate symptoms
        const validationPromises = result.primarySymptoms.map(symptom =>
          symptomAnalysisService.validateSymptom(
            symptom,
            user?.id || 'anonymous',
            user?.role || 'patient'
          )
        );

        const validationResults = await Promise.all(validationPromises);
        const suggestions = validationResults
          .filter(result => !result.isValid && result.suggestedTerm)
          .map(result => result.suggestedTerm!);

        setValidationSuggestions(suggestions);

        // Set first question if available
        if (result.suggestedQuestions.length > 0) {
          setCurrentQuestion(result.suggestedQuestions[0]);
        }
      } catch (err) {
        setError('Failed to analyze symptoms. Please try again.');
        console.error('Symptom analysis error:', err);
      } finally {
        setIsAnalyzing(false);
        setIsValidating(false);
      }
    }, 500),
    [user?.id, user?.role]
  );

  const handleSymptomInput = (text: string) => {
    setSymptomText(text);
    debouncedAnalysis(text);
  };

  // Cleanup debounced function
  useEffect(() => {
    return () => {
      debouncedAnalysis.cancel();
    };
  }, [debouncedAnalysis]);

  const handleAnswer = (answer: string) => {
    if (currentQuestion) {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion]: answer
      }));

      // Move to next question
      const currentIndex = analysis.suggestedQuestions.indexOf(currentQuestion);
      if (currentIndex < analysis.suggestedQuestions.length - 1) {
        setCurrentQuestion(analysis.suggestedQuestions[currentIndex + 1]);
      } else {
        // All questions answered
        onComplete({
          symptomText,
          analysis,
          answers
        });
      }
    }
  };

  const handleSuggestionAccept = (suggestion: string) => {
    setSymptomText(prev => {
      const newText = prev + (prev ? ', ' : '') + suggestion;
      handleSymptomInput(newText);
      return newText;
    });
    setValidationSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      handleSymptomInput(symptomText);
    } else {
      setError('Maximum retry attempts reached. Please try again later.');
    }
  };

  return (
    <div className="smart-symptom-collection">
      <div className="symptom-input">
        <label htmlFor="symptom-text">Describe your symptoms:</label>
        <textarea
          id="symptom-text"
          value={symptomText}
          onChange={e => handleSymptomInput(e.target.value)}
          placeholder="Example: I've been experiencing a severe headache for the past 3 days, especially in the morning. It's accompanied by nausea and sensitivity to light."
          rows={4}
        />
        {isAnalyzing && (
          <div className="analyzing">
            Analyzing symptoms...
          </div>
        )}
        {error && (
          <div className="error">
            {error}
            {retryCount < MAX_RETRIES && (
              <button onClick={handleRetry} className="retry-button">
                Retry Analysis
              </button>
            )}
          </div>
        )}
      </div>

      {validationSuggestions.length > 0 && (
        <div className="suggestions">
          <h4>Did you mean:</h4>
          <div className="suggestion-list">
            {isValidating ? (
              <div className="validating">Validating symptoms...</div>
            ) : (
              validationSuggestions.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionAccept(suggestion)}
                  className="suggestion-button"
                >
                  {suggestion}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {analysis && (
        <div className="analysis-results">
          <div className="primary-symptoms">
            <h4>Primary Symptoms:</h4>
            <ul>
              {analysis.primarySymptoms.map((symptom: string) => (
                <li key={symptom}>{symptom}</li>
              ))}
            </ul>
          </div>

          {analysis.relatedSymptoms.length > 0 && (
            <div className="related-symptoms">
              <h4>Related Symptoms:</h4>
              <ul>
                {analysis.relatedSymptoms.map((symptom: string) => (
                  <li key={symptom}>{symptom}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="symptom-details">
            <div className="detail-item">
              <span className="label">Severity:</span>
              <span className="value">{analysis.severity}</span>
            </div>
            <div className="detail-item">
              <span className="label">Duration:</span>
              <span className="value">{analysis.duration}</span>
            </div>
            <div className="detail-item">
              <span className="label">Frequency:</span>
              <span className="value">{analysis.frequency}</span>
            </div>
          </div>
        </div>
      )}

      {currentQuestion && (
        <div className="follow-up-question">
          <h4>Follow-up Question:</h4>
          <p>{currentQuestion}</p>
          <div className="answer-input">
            <input
              type="text"
              value={answers[currentQuestion] || ''}
              onChange={e => handleAnswer(e.target.value)}
              placeholder="Type your answer..."
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .smart-symptom-collection {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .symptom-input {
          margin-bottom: 20px;
        }
        .symptom-input label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .symptom-input textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
          resize: vertical;
        }
        .analyzing {
          margin-top: 8px;
          color: #666;
          font-style: italic;
        }
        .error {
          margin-top: 8px;
          color: #f44336;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .retry-button {
          padding: 4px 12px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        .retry-button:hover {
          background: #d32f2f;
        }
        .suggestions {
          margin: 20px 0;
          padding: 15px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        .suggestion-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        .suggestion-button {
          padding: 6px 12px;
          background: #e3f2fd;
          border: 1px solid #2196f3;
          border-radius: 16px;
          color: #1976d2;
          cursor: pointer;
          transition: all 0.2s;
        }
        .suggestion-button:hover {
          background: #bbdefb;
        }
        .analysis-results {
          margin: 20px 0;
          padding: 20px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .primary-symptoms,
        .related-symptoms {
          margin-bottom: 15px;
        }
        h4 {
          margin: 0 0 10px 0;
          color: #333;
        }
        ul {
          margin: 0;
          padding-left: 20px;
        }
        li {
          margin-bottom: 4px;
        }
        .symptom-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }
        .detail-item {
          display: flex;
          flex-direction: column;
        }
        .label {
          font-size: 0.9em;
          color: #666;
        }
        .value {
          font-weight: 500;
          color: #333;
        }
        .follow-up-question {
          margin-top: 20px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 4px;
        }
        .answer-input {
          margin-top: 10px;
        }
        .answer-input input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        .validating {
          color: #666;
          font-style: italic;
          padding: 8px;
        }
      `}</style>
    </div>
  );
}; 