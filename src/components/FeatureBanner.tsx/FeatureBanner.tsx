// FeatureBanner.tsx
import { useState, useEffect } from 'react';
import { FaTimes, FaLightbulb } from 'react-icons/fa';
import './FeatureBanner.css';

interface FeatureBannerProps {
  featureId: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaLink?: string;
  dismissible?: boolean;
}

const FeatureBanner = ({
  featureId,
  title,
  description,
  ctaText = 'Learn More',
  ctaLink = '',
  dismissible = true
}: FeatureBannerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Check if this feature banner has been dismissed before
    const dismissedFeatures = JSON.parse(localStorage.getItem('dismissedFeatures') || '[]');
    if (!dismissedFeatures.includes(featureId)) {
      setIsVisible(true);
    }
  }, [featureId]);
  
  const handleDismiss = () => {
    setIsVisible(false);
    
    // Save that this feature banner has been dismissed
    const dismissedFeatures = JSON.parse(localStorage.getItem('dismissedFeatures') || '[]');
    if (!dismissedFeatures.includes(featureId)) {
      dismissedFeatures.push(featureId);
      localStorage.setItem('dismissedFeatures', JSON.stringify(dismissedFeatures));
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="feature-banner">
      <div className="feature-banner-icon">
        <FaLightbulb />
      </div>
      <div className="feature-banner-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {ctaLink && (
        <a href={ctaLink} className="feature-banner-cta">
          {ctaText}
        </a>
      )}
      {dismissible && (
        <button className="feature-banner-dismiss" onClick={handleDismiss}>
          <FaTimes />
        </button>
      )}
    </div>
  );
};

export default FeatureBanner;