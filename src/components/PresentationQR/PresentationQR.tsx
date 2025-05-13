import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { FaQrcode, FaTimes, FaMobile, FaExpand } from 'react-icons/fa';
import './PresentationQR.css';

const GlobalPresentationQR = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const url = window.location.origin + location.pathname;
  
  // Close expanded view on escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExpanded(false);
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);
  
  // Reset expanded state when route changes
  useEffect(() => {
    setIsExpanded(false);
  }, [location]);
  
  return (
    <>
      {/* Always visible QR code */}
      <div className="fixed-qr-container">
        <div className="fixed-qr-content">
          <QRCodeSVG 
            value={url} 
            size={120}
            bgColor="#180024"
            fgColor="#ffffff"
            level="H"
            includeMargin={false}
          />
          <button 
            className="expand-qr-btn" 
            onClick={() => setIsExpanded(true)}
            aria-label="Expand QR Code"
          >
            <FaExpand />
          </button>
        </div>
      </div>
      
      {/* Expanded QR code modal when clicked */}
      {isExpanded && (
        <div className="qr-overlay" onClick={() => setIsExpanded(false)}>
          <div className="qr-modal" onClick={e => e.stopPropagation()}>
            <button className="qr-close-btn" onClick={() => setIsExpanded(false)}>
              <FaTimes />
            </button>
            
            <div className="qr-content">
              <div className="qr-title-row">
                <FaMobile className="qr-icon" />
                <h3>Scan to follow along</h3>
              </div>
              
              <div className="qr-code-container">
                <QRCodeSVG 
                  value={url} 
                  size={250}
                  bgColor="#180024"
                  fgColor="#ffffff"
                  level="H"
                  includeMargin={false}
                />
              </div>
              
              <div className="qr-project-title">Current Page</div>
              <div className="qr-url">{url}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalPresentationQR;