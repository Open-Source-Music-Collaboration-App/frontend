import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface OnboardingContextType {
  onboardingComplete: boolean;
  completeOnboarding: () => void;
  restartOnboarding: () => void;
  completedSteps: string[];
  completeStep: (stepId: string) => void;
  hasCompletedStep: (stepId: string) => boolean;
  showTooltips: boolean;
  toggleShowTooltips: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(() => {
    const saved = localStorage.getItem('onboardingComplete');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    const saved = localStorage.getItem('completedOnboardingSteps');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showTooltips, setShowTooltips] = useState<boolean>(() => {
    const saved = localStorage.getItem('showOnboardingTooltips');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('onboardingComplete', JSON.stringify(onboardingComplete));
  }, [onboardingComplete]);

  useEffect(() => {
    localStorage.setItem('completedOnboardingSteps', JSON.stringify(completedSteps));
  }, [completedSteps]);

  useEffect(() => {
    localStorage.setItem('showOnboardingTooltips', JSON.stringify(showTooltips));
  }, [showTooltips]);

  const completeOnboarding = () => {
    setOnboardingComplete(true);
  };

  const restartOnboarding = () => {
    setOnboardingComplete(false);
    localStorage.removeItem('hasVisitedProject');
    localStorage.removeItem('hasSeenTracksIntro');
    localStorage.removeItem('hasSeenHistoryIntro');
    localStorage.removeItem('hasSeenFeaturesIntro');
    localStorage.removeItem('viewedFeatures');
    localStorage.removeItem('dismissedFeatures');
    localStorage.removeItem('completedGuides');
    alert('All guides have been reset. You will see introduction guides on your next visit to each section.');
    setCompletedSteps([]);
  };

  const completeStep = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId]);
    }
  };

  const hasCompletedStep = (stepId: string) => {
    return completedSteps.includes(stepId);
  };

  const toggleShowTooltips = () => {
    setShowTooltips(prev => !prev);
  };

  const value = {
    onboardingComplete,
    completeOnboarding,
    restartOnboarding,
    completedSteps,
    completeStep,
    hasCompletedStep,
    showTooltips,
    toggleShowTooltips
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};