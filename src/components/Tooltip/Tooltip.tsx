import { useState, ReactNode, useRef, useEffect } from 'react';
import './Tooltip.css';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

const Tooltip = ({ 
  content, 
  children, 
  position = 'top', 
  delay = 100, 
  className = '',
  style = {}
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
      setIsMounted(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setIsVisible(false);
    timeoutRef.current = window.setTimeout(() => {
      setIsMounted(false);
    }, 200);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  // Adjust position if tooltip goes outside viewport
  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      
      if (rect.left < 0) {
        tooltip.style.transform = `translateX(${Math.abs(rect.left) + 10}px)`;
      }
      
      if (rect.right > window.innerWidth) {
        tooltip.style.transform = `translateX(${window.innerWidth - rect.right - 10}px)`;
      }
    }
  }, [isVisible]);

  return (
    <div className="tooltip-container" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={style}>
      {children}
      {isMounted && (
        <div 
          ref={tooltipRef}
          className={`tooltip-content ${position} ${isVisible ? 'visible' : ''} ${className}`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;