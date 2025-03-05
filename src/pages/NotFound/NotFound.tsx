import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';
import './NotFound.css';

function NotFound() {
  const navigate = useNavigate();
  const [counter, setCounter] = useState(10);
  
  // Auto-redirect countdown
  useEffect(() => {
    if (counter > 0) {
      const timer = setTimeout(() => setCounter(counter - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      navigate('/dashboard');
    }
  }, [counter, navigate]);

  return (
    <motion.div
      className="notfound-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="notfound-content">
        <div className="notfound-header">
          <div className="notfound-back">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <FaArrowLeft /> Back
            </button>
          </div>
          
          <div className="notfound-title-container">
            <FaExclamationTriangle className="notfound-icon" />
            <h2 className="notfound-title">404 Not Found</h2>
          </div>
        </div>

        <div className="notfound-message">
          The page you're looking for doesn't exist or has been moved.
        </div>

        <div className="notfound-redirect">
          Redirecting to dashboard in {counter} seconds...
        </div>

        <div className="notfound-actions">
          <button 
            className="notfound-btn dashboard-btn"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </button>
        </div>
      </div>

      <div className="notfound-circles">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
      </div>
    </motion.div>
  );
}

export default NotFound;