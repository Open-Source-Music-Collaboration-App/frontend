import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingProvider';
import './WelcomeTour.css';

// Import images
import dashboardImage from './images/dashboard.png';
import projectImage from './images/project.png';
import collabImage from './images/collab.png';
import featuresImage from './images/features.png';
import historyImage from './images/history.png';


const WelcomeTour = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { onboardingComplete, completeOnboarding } = useOnboarding();
  const location = useLocation();

  const steps = [
    {
      title: 'Welcome to Music Collaboration Platform',
      content: 'This platform helps you collaborate on music projects with others. Let\'s take a quick tour of the key features.',
      image: null
    },
    {
      title: 'Dashboard',
      content: 'Your dashboard shows all your projects. You can create new projects, view collaborations, and manage your work.',
      image: dashboardImage
    },
    {
      title: 'Project Studio',
      content: 'Each project has a studio view where you can see tracks, make changes, and invite collaborators.',
      image: projectImage
    },
    {
      title: 'Version History',
      content: 'Easily track changes made to your projects. You can view previous versions and restore them if needed.',
      image: historyImage
    },
    {
      title: 'Collaboration',
      content: 'Easily invite others to collaborate on your projects, receive contributions, and manage permissions.',
      image: collabImage
    },
    {
      title: 'Feature Requests',
      content: 'Suggest new features, vote on ideas, and track the development roadmap.',
      image: featuresImage
    }
  ];

  useEffect(() => {
    // Only show welcome tour on dashboard and for users who haven't completed onboarding
    if (location.pathname === '/dashboard' && !onboardingComplete) {
      // Slightly delay showing the welcome tour
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, onboardingComplete]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    completeOnboarding();
  };

  if (!isVisible) return null;

  return (
    <div className="welcome-tour-overlay">
      <div className="welcome-tour-modal">
        <button className="welcome-tour-close" onClick={handleClose}>
          &times;
        </button>
        
        <div className="welcome-tour-content">
          <div className="welcome-tour-step">
            Step {currentStep + 1} of {steps.length}
          </div>
          
          <h2>{steps[currentStep].title}</h2>
          <p>{steps[currentStep].content}</p>
          
          {steps[currentStep].image && (
            <div className="welcome-tour-image">
              <img src={steps[currentStep].image} alt={steps[currentStep].title} />
            </div>
          )}
          
          <div className="welcome-tour-progress">
            {steps.map((_, index) => (
              <div 
                key={index} 
                className={`progress-dot ${index === currentStep ? 'active' : ''}`}
                onClick={() => setCurrentStep(index)}
              />
            ))}
          </div>
          
          <div className="welcome-tour-actions">
            {currentStep > 0 && (
              <button className="tour-btn prev-btn" onClick={handlePrev}>
                Previous
              </button>
            )}
            
            <button className="tour-btn next-btn" onClick={handleNext}>
              {currentStep < steps.length - 1 ? 'Next' : 'Get Started'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeTour;