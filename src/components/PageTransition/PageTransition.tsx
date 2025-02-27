// src/components/PageTransition/PageTransition.tsx
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './PageTransition.css';

interface PageTransitionProps {
  children: React.ReactNode;
}

function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionState, setTransitionState] = useState('fadeIn');
  
  // When location changes, update the displayed content
  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      // Update the location immediately and trigger a new fade-in
      setDisplayLocation(location);
      // Set to 'hidden' momentarily, then back to 'fadeIn' to restart animation
      setTransitionState('hidden');
      
      // Use requestAnimationFrame to ensure the DOM updates before starting fade-in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionState('fadeIn');
        });
      });
    }
  }, [location, displayLocation]);

  return (
    <div
      className={`page-transition ${transitionState}`}
    >
      {children}
    </div>
  );
}

export default PageTransition;