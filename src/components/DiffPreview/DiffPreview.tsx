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
  // Separate categories for different modification types
  { key: 'noteChanges', label: 'Note Changes', icon: FaStickyNote, className: 'modified' }, // Using FaStickyNote for notes
  { key: 'parameterChanges', label: 'Parameter Changes', icon: FaVolumeUp, className: 'modified' }, // Using FaVolumeUp for params
  { key: 'audioFileChanges', label: 'Audio Changes', icon: FaWaveSquare, className: 'modified' }, // Using FaWaveSquare for audio
  { key: 'tempoChange', label: 'Tempo Changed', icon: FaClock, className: 'tempo' },
];

const DiffPreview: React.FC<DiffPreviewProps> = ({ diffData, isVisible, error, isFirstCommitPreview }) => {

  const renderContent = () => {

    // --- First Commit Preview ---
    if( isFirstCommitPreview ){
      return (
        <Tooltip content={error} position="top">
          <div className="diff-summary-bar first-commit">
            <span className="summary-text">First Commit Preview</span>
            <FaInfoCircle className="summary-icon info" />
          </div>
        </Tooltip>
      );
    }


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
    // Individual counts for modification types
    const noteChangesCount = diffData.noteChanges?.length || 0;
    const parameterChangesCount = diffData.trackParameterChanges?.length || 0;
    const audioFileChangesCount = diffData.audioFileChanges?.length || 0;
    // Note: We are no longer counting diffData.summary.modifiedTracks
    const tempoChanged = diffData.tempoChange ? 1 : 0;

    if (addedCount > 0) counts['addedTracks'] = addedCount;
    if (removedCount > 0) counts['removedTracks'] = removedCount;
    if (noteChangesCount > 0) counts['noteChanges'] = noteChangesCount;
    if (parameterChangesCount > 0) counts['parameterChanges'] = parameterChangesCount;
    if (audioFileChangesCount > 0) counts['audioFileChanges'] = audioFileChangesCount;
    if (tempoChanged > 0) counts['tempoChange'] = tempoChanged;

    // Update total changes calculation
    totalChanges = addedCount + removedCount + noteChangesCount + parameterChangesCount + audioFileChangesCount + tempoChanged;

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