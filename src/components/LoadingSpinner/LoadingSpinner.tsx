import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "Loading...", 
  fullScreen = false,
  size = 'large'
}) => {
  return (
    <div className={`loading-container ${fullScreen ? 'fullscreen' : ''} ${size}`}>
      <div className="loading-spinner">
        {/* Track 1 */}
        <div className="midi-track">
          <div className="midi-note"></div>
          <div className="midi-note"></div>
          <div className="midi-note"></div>
          <div className="midi-note"></div>
        </div>

        <div className="midi-track audio-track">
          <div className="midi-note"></div>
          <div className="midi-note"></div>
          <div className="midi-note"></div>
          <div className="midi-note"></div>
        </div>
        
        
        {/* Track 2 */}
        <div className="midi-track">
          <div className="midi-note"></div>
          <div className="midi-note"></div>
          <div className="midi-note"></div>
          <div className="midi-note"></div>
        </div>
        
        {/* Track 3 */}
        <div className="midi-track">
          <div className="midi-note"></div>
          <div className="midi-note"></div>
          <div className="midi-note"></div>
          <div className="midi-note"></div>
        </div>

        <div className="midi-track audio-track">
          <div className="midi-note"></div>
          <div className="midi-note"></div>
          <div className="midi-note"></div>
          <div className="midi-note"></div>
        </div>
        
        {/* Animated playhead */}
        <div className="playhead"></div>
      </div>
      {message && <div className="loading-text">{message}</div>}
    </div>
  );
};

export default LoadingSpinner;