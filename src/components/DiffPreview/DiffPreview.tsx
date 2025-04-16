import React from 'react';
import {
  FaPlus, FaMinus, FaPen, FaVolumeUp, FaStickyNote, FaWaveSquare,
  FaExclamationTriangle, FaInfoCircle, FaClock
} from 'react-icons/fa';
import { ProjectDiff } from '../../types/ProjectDiff';
import Tooltip from '../Tooltip/Tooltip'; // Assuming Tooltip component exists
import './DiffPreview.css';
import { motion, AnimatePresence } from 'framer-motion';

interface DiffPreviewProps {
  diffData: ProjectDiff | null;
  isVisible: boolean;
  error: string | null;
  isFirstCommitPreview?: boolean;
}

// Define categories for the preview icons
const changeCategories = [
  { key: 'addedTracks', label: 'Tracks Added', icon: FaPlus, className: 'added' },
  { key: 'removedTracks', label: 'Tracks Removed', icon: FaMinus, className: 'removed' },
  // Combine modified tracks, params, notes, clips into a general 'modified' icon
  { key: 'modified', label: 'Modifications', icon: FaPen, className: 'modified' },
  { key: 'tempoChange', label: 'Tempo Changed', icon: FaClock, className: 'tempo' },
];

const DiffPreview: React.FC<DiffPreviewProps> = ({ diffData, isVisible, error, isFirstCommitPreview }) => {

  const renderContent = () => {
    // --- Error State ---
    if (error) {
      return (
        <div className="diff-summary-bar error">
          <FaExclamationTriangle className="summary-icon error" />
          <span className="summary-text error">Preview Error</span>
          {/* Optional: Tooltip with error details */}
          <Tooltip content={error} position="top">
             <span className="error-details-indicator">?</span>
          </Tooltip>
        </div>
      );
    }

    // --- First Commit / No Data State ---
    if (!diffData) {
      const message = isFirstCommitPreview ? "First Upload" : "No Changes Detected";
      return (
        <div className={`diff-summary-bar ${isFirstCommitPreview ? 'info' : 'no-changes'}`}>
          <FaInfoCircle className="summary-icon info" />
          <span className="summary-text">{message}</span>
        </div>
      );
    }

    // --- Calculate Counts ---
    const counts: { [key: string]: number } = {};
    let totalChanges = 0;

    const addedCount = diffData.summary?.addedTracks?.length || 0;
    const removedCount = diffData.summary?.removedTracks?.length || 0;
    // Aggregate modifications
    const modifiedCount = (diffData.summary?.modifiedTracks?.length || 0) +
                          (diffData.trackParameterChanges?.length || 0) +
                          (diffData.noteChanges?.length || 0) +
                          (diffData.audioFileChanges?.length || 0);
    const tempoChanged = diffData.tempoChange ? 1 : 0;

    if (addedCount > 0) counts['addedTracks'] = addedCount;
    if (removedCount > 0) counts['removedTracks'] = removedCount;
    if (modifiedCount > 0) counts['modified'] = modifiedCount;
    if (tempoChanged > 0) counts['tempoChange'] = tempoChanged;

    totalChanges = addedCount + removedCount + modifiedCount + tempoChanged;

    // --- No Changes Detected (After Calculation) ---
    if (totalChanges === 0) {
      return (
        <div className="diff-summary-bar no-changes">
          <FaInfoCircle className="summary-icon info" />
          <span className="summary-text">No Changes Detected</span>
        </div>
      );
    }

    // --- Render Summary Bar ---
    return (
      <div className="diff-summary-bar">
        <span className="summary-text main">Changes:</span>
        {changeCategories.map((cat) => {
          const count = counts[cat.key];
          if (!count || count === 0) return null;

          const IconComponent = cat.icon;
          const tooltipContent = `${cat.label}: ${count}`;

          return (
            <Tooltip key={cat.key} content={tooltipContent} position="top">
              <motion.div
                className={`summary-item ${cat.className}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * changeCategories.findIndex(c => c.key === cat.key), duration: 0.2 }}
              >
                <IconComponent className="summary-icon" />
                <span className="summary-count">{count}</span>
              </motion.div>
            </Tooltip>
          );
        })}
      </div>
    );
  };

  // Main component render with visibility animation
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} // Slide down slightly
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {renderContent()}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DiffPreview;