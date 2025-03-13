// FeatureHighlight.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './FeatureHighlight.css';

interface FeatureHighlightProps {
  featureId: string;
  title: string;
  description: string;
  elementSelector: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  onComplete?: () => void;
}

const FeatureHighlight = ({
  featureId,
  title,
  description,
  elementSelector,
  position = 'bottom',
  onComplete
}: FeatureHighlightProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coordinates, setCoordinates] = useState({ top: 0, left: 0, width: 0, height: 0 });

  // Check if this feature has already been seen
  useEffect(() => {
    const viewedFeatures = JSON.parse(localStorage.getItem('viewedFeatures') || '[]');
    
    if (viewedFeatures.includes(featureId)) {
      return;
    }

    // Find the element to highlight
    const element = document.querySelector(elementSelector);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      
      // Calculate position
      setCoordinates({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
      
      setIsVisible(true);
    }
  }, [featureId, elementSelector]);

  const handleDismiss = () => {
    setIsVisible(false);
    
    // Save that this feature has been seen
    const viewedFeatures = JSON.parse(localStorage.getItem('viewedFeatures') || '[]');
    if (!viewedFeatures.includes(featureId)) {
      viewedFeatures.push(featureId);
      localStorage.setItem('viewedFeatures', JSON.stringify(viewedFeatures));
    }
    
    if (onComplete) {
      onComplete();
    }
  };

  if (!isVisible) return null;

  let tooltipStyle = {};
  
  switch (position) {
    case 'top':
      tooltipStyle = {
        top: coordinates.top - 10 - 70, // height of tooltip
        left: coordinates.left + coordinates.width / 2 - 150 // half tooltip width
      };
      break;
    case 'bottom':
      tooltipStyle = {
        top: coordinates.top + coordinates.height + 10,
        left: coordinates.left + coordinates.width / 2 - 150
      };
      break;
    case 'left':
      tooltipStyle = {
        top: coordinates.top + coordinates.height / 2 - 35,
        left: coordinates.left - 10 - 300
      };
      break;
    case 'right':
      tooltipStyle = {
        top: coordinates.top + coordinates.height / 2 - 35,
        left: coordinates.left + coordinates.width + 10
      };
      break;
  }

  // Create highlight overlay for the element
  const highlightStyle = {
    top: `${coordinates.top - 5}px`,
    left: `${coordinates.left - 5}px`,
    width: `${coordinates.width + 10}px`,
    height: `${coordinates.height + 10}px`
  };

  return createPortal(
    <div className="feature-highlight-container">
      <div className="feature-highlight-overlay" onClick={handleDismiss}></div>
      <div className="feature-highlight-element" style={highlightStyle}></div>
      <div className={`feature-highlight-tooltip ${position}`} style={tooltipStyle}>
        <h3>{title}</h3>
        <p>{description}</p>
        <button className="feature-highlight-btn" onClick={handleDismiss}>Got it</button>
      </div>
    </div>,
    document.body
  );
};

export default FeatureHighlight;