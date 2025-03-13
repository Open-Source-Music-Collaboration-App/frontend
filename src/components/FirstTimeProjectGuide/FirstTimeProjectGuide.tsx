// FirstTimeProjectGuide.tsx
import { useState, useEffect } from 'react';
import { FaTimes, FaPlay, FaHistory, FaPuzzlePiece } from 'react-icons/fa';
import { useProject } from '../../context/ProjectContext';
import { useNavigate, useParams } from 'react-router-dom';
import './FirstTimeProjectGuide.css';

const FirstTimeProjectGuide = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const { isFirstTimeUser, setFirstTimeUser } = useProject();
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Steps for the guide
  const steps = [
    {
      icon: <FaPlay />,
      title: 'Track Studio',
      description: 'This is where you can view and edit your project tracks. Play, mix, and modify your music right in the browser.',
      action: () => {
        navigate(`/project/${id}`);
        setCurrentStep(1);
      },
      buttonText: 'Next',
    },
    {
      icon: <FaHistory />,
      title: 'Version History',
      description: 'View all previous versions of your project. Compare changes and restore older versions if needed.',
      action: () => {
        // navigate(`/project/${id}/history`);
        setCurrentStep(2);
      },
      buttonText: 'Next',
    },
    {
      icon: <FaPuzzlePiece />,
      title: 'Feature Requests',
      description: 'Create and manage feature requests for your project. Collaborate with team members on implementation details.',
      action: () => {
        // navigate(`/project/${id}/features`);
        setCurrentStep(3);
      },
      buttonText: 'Next',
    },
    {
      icon: <FaPlay />,
      title: "Let's Get Started!",
      description: 'Now that you know the basics, you can start exploring your project.',
      action: () => {
        // navigate(`/project/${id}`);
        handleComplete();
      },
      buttonText: 'Start Exploring',
    }
  ];
  
  useEffect(() => {
    if (isFirstTimeUser) {
      // Slight delay before showing the guide
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFirstTimeUser]);
  
  const handleComplete = () => {
    setIsVisible(false);
    setFirstTimeUser(false);
  };
  
  if (!isVisible) return null;
  
  const currentStepData = steps[currentStep];
  
  return (
    <div className="first-time-guide-overlay">
      <div className="first-time-guide">
        <button className="guide-close-btn" onClick={handleComplete}>
          <FaTimes />
        </button>
        
        <div className="guide-step-indicator">
          {steps.map((_, index) => (
            <div 
              key={index} 
              className={`step-dot ${index === currentStep ? 'active' : index < currentStep ? 'completed' : ''}`}
            />
          ))}
        </div>
        
        <div className="guide-step-icon">
          {currentStepData.icon}
        </div>
        
        <h2 className="guide-step-title">{currentStepData.title}</h2>
        <p className="guide-step-description">{currentStepData.description}</p>
        
        <button className="guide-next-btn" onClick={currentStepData.action}>
          {currentStepData.buttonText}
        </button>
        
        <button className="guide-skip-btn" onClick={handleComplete}>
          Skip Tour
        </button>
      </div>
    </div>
  );
};

export default FirstTimeProjectGuide;