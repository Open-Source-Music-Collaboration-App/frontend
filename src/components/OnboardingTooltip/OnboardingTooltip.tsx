import { ReactNode } from 'react';
import Tooltip from '../Tooltip/Tooltip';
import { useOnboarding } from '../../context/OnboardingProvider';
import './OnboardingTooltip.css';

interface OnboardingTooltipProps {
  stepId: string;
  title: string;
  content: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
  showAlways?: boolean;
  style?: React.CSSProperties;
}

const OnboardingTooltip = ({
  stepId,
  title,
  content,
  position = 'top',
  children,
  showAlways = false,
  style
}: OnboardingTooltipProps) => {
  const { hasCompletedStep, completeStep, showTooltips } = useOnboarding();
  
  const shouldShow = showAlways || (showTooltips && !hasCompletedStep(stepId));
  
  const handleMouseLeave = () => {
    if (!hasCompletedStep(stepId) && !showAlways) {
      completeStep(stepId);
    }
  };

  if (!shouldShow) {
    return <>{children}</>;
  }

  const tooltipContent = (
    <div className="onboarding-tooltip-content">
      <h4>{title}</h4>
      <div>{content}</div>
      <div className="tooltip-hint">
        <span className="tooltip-icon">💡</span>
        <span>Tooltip will not show again once viewed</span>
      </div>
    </div>
  );

  return (
    <div className="onboarding-tooltip-wrapper" onMouseLeave={handleMouseLeave} style={style}>
      <Tooltip 
        content={tooltipContent} 
        position={position} 
        delay={300}
        className="onboarding-tooltip"
        style={style}
      >
        <div className="onboarding-highlight">
          {children}
          <div className="onboarding-pulse"></div>
        </div>
      </Tooltip>
    </div>
  );
};

export default OnboardingTooltip;