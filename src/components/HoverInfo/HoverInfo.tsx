// Add this component to src/components/HoverInfo/HoverInfo.tsx
import { useState } from 'react';
import Tooltip from '../Tooltip/Tooltip';
import { FaInfoCircle } from 'react-icons/fa';
import './HoverInfo.css';

interface HoverInfoProps {
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
}

const HoverInfo = ({ title, description, position = 'top', children }: HoverInfoProps) => {
  const content = (
    <div className="hover-info-content">
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  );

  if (children) {
    return (
      <div className="hover-info-wrapper">
        <Tooltip content={content} position={position}>
          {children}
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="hover-info-icon">
      <Tooltip content={content} position={position}>
        <FaInfoCircle className="info-icon" />
      </Tooltip>
    </div>
  );
};

export default HoverInfo;