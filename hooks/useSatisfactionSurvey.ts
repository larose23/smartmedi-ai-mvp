import { useState, useEffect } from 'react';

interface UseSatisfactionSurveyProps {
  triggerInterval?: number; // in milliseconds
  actionTriggers?: string[];
}

export const useSatisfactionSurvey = ({
  triggerInterval = 7 * 24 * 60 * 60 * 1000, // 7 days
  actionTriggers = ['appointment_completed', 'consultation_completed'],
}: UseSatisfactionSurveyProps = {}) => {
  const [shouldShowSurvey, setShouldShowSurvey] = useState(false);
  const [triggerType, setTriggerType] = useState<'periodic' | 'action' | 'manual'>('manual');

  useEffect(() => {
    // Check if it's time to show the periodic survey
    const lastSurveyTime = localStorage.getItem('lastSatisfactionSurvey');
    if (lastSurveyTime) {
      const timeSinceLastSurvey = Date.now() - parseInt(lastSurveyTime);
      if (timeSinceLastSurvey >= triggerInterval) {
        setShouldShowSurvey(true);
        setTriggerType('periodic');
      }
    } else {
      setShouldShowSurvey(true);
      setTriggerType('periodic');
    }
  }, [triggerInterval]);

  const handleAction = (action: string) => {
    if (actionTriggers.includes(action)) {
      setShouldShowSurvey(true);
      setTriggerType('action');
    }
  };

  const handleSurveyComplete = () => {
    localStorage.setItem('lastSatisfactionSurvey', Date.now().toString());
    setShouldShowSurvey(false);
  };

  const showManualSurvey = () => {
    setShouldShowSurvey(true);
    setTriggerType('manual');
  };

  return {
    shouldShowSurvey,
    triggerType,
    handleAction,
    handleSurveyComplete,
    showManualSurvey,
  };
}; 