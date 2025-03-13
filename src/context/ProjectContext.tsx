// ProjectContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface ProjectContextData {
  isFirstTimeUser: boolean;
  setFirstTimeUser: (value: boolean) => void;
  hasSeenTracksIntro: boolean;
  markTracksIntroAsSeen: () => void;
  hasSeenHistoryIntro: boolean;
  markHistoryIntroAsSeen: () => void;
  hasSeenFeaturesIntro: boolean;
  markFeaturesIntroAsSeen: () => void;
}

const ProjectContext = createContext<ProjectContextData | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean>(() => {
    return !localStorage.getItem('hasVisitedProject');
  });
  
  const [hasSeenTracksIntro, setHasSeenTracksIntro] = useState<boolean>(() => {
    return localStorage.getItem('hasSeenTracksIntro') === 'true';
  });
  
  const [hasSeenHistoryIntro, setHasSeenHistoryIntro] = useState<boolean>(() => {
    return localStorage.getItem('hasSeenHistoryIntro') === 'true';
  });
  
  const [hasSeenFeaturesIntro, setHasSeenFeaturesIntro] = useState<boolean>(() => {
    return localStorage.getItem('hasSeenFeaturesIntro') === 'true';
  });
  
  const setFirstTimeUser = (value: boolean) => {
    setIsFirstTimeUser(value);
    if (!value) {
      localStorage.setItem('hasVisitedProject', 'true');
    }
  };
  
  const markTracksIntroAsSeen = () => {
    setHasSeenTracksIntro(true);
    localStorage.setItem('hasSeenTracksIntro', 'true');
  };
  
  const markHistoryIntroAsSeen = () => {
    setHasSeenHistoryIntro(true);
    localStorage.setItem('hasSeenHistoryIntro', 'true');
  };
  
  const markFeaturesIntroAsSeen = () => {
    setHasSeenFeaturesIntro(true);
    localStorage.setItem('hasSeenFeaturesIntro', 'true');
  };
  
  return (
    <ProjectContext.Provider
      value={{
        isFirstTimeUser,
        setFirstTimeUser,
        hasSeenTracksIntro,
        markTracksIntroAsSeen,
        hasSeenHistoryIntro,
        markHistoryIntroAsSeen,
        hasSeenFeaturesIntro,
        markFeaturesIntroAsSeen
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};