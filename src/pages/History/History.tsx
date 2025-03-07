import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  FaHistory, FaCalendarAlt, FaUser, FaMusic, FaSave, 
  FaArrowLeft, FaDownload, FaFileAlt, FaFileAudio, 
  FaFileCode, FaPlus, FaMinus, FaEdit, FaKeyboard } from 'react-icons/fa';
import './History.css';

interface Version {
  hash: string;
  date: string;
  message: string;
  refs: string;
  body: string;
  author_name: string;
  author_email: string;
}

interface FileChange {
  name: string;
  type: string; // "added", "modified", "deleted"
  fileType: string; // "als", "wav", "json", etc.
}

interface HistoryResponse {
  projectId: string;
  userId: string;
  history: {
    all: Version[];
    latest: Version;
    total: number;
  };
}

interface TrackChange {
  id: string;
  name: string;
  type: string;
}

interface TrackChanges {
  added: TrackChange[];
  modified: TrackChange[];
  removed: TrackChange[];
}

function History() {
  const { id } = useParams();
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const parseTrackChanges = (body: string): TrackChanges | null => {
    if (!body) return null;
    
    const trackChangesMatch = body.match(/Track-Changes: (\{.*\})/);
    if (!trackChangesMatch || !trackChangesMatch[1]) return null;
    
    try {
      return JSON.parse(trackChangesMatch[1]);
    } catch (e) {
      console.error("Failed to parse track changes:", e);
      return null;
    }
  };

  const renderTrackChanges = (version: Version) => {
    const trackChanges = parseTrackChanges(version.body);
    
    if (!trackChanges) return null;
    
    const hasChanges = trackChanges.added.length > 0 || 
                      trackChanges.modified.length > 0 || 
                      trackChanges.removed.length > 0;
    
    if (!hasChanges) return null;
    
    return (
      <div className="version-tracks">
        {trackChanges.added.length > 0 && (
          <div className="track-changes-section">
            <h4>
              <FaPlus className="change-icon added" /> Added ({trackChanges.added.length})
            </h4>
            <div className="tracks-timeline">
              {trackChanges.added.map((track) => (
                <div key={track.id} className="track-change">
                  <div className="track-info">
                    <div className="track-name">{track.name}</div>
                  </div>
                  <div className={`track-type ${track.type.toLowerCase().includes('midi') ? 'midi' : 'audio'}`}>
                    {track.type.toLowerCase().includes('midi') ? 'MIDI' : 'AUDIO'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {trackChanges.modified.length > 0 && (
          <div className="track-changes-section">
            <h4>
              <FaEdit className="change-icon modified" /> Modified ({trackChanges.modified.length})
            </h4>
            <div className="tracks-timeline">
              {trackChanges.modified.map((track) => (
                <div key={track.id} className="track-change">
                  <div className="track-info">
                    <div className="track-name">{track.name}</div>
                  </div>
                  <div className={`track-type ${track.type.toLowerCase().includes('midi') ? 'midi' : 'audio'}`}>
                    {track.type.toLowerCase().includes('midi') ? 'MIDI' : 'AUDIO'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {trackChanges.removed.length > 0 && (
          <div className="track-changes-section">
            <h4>
              <FaMinus className="change-icon deleted" /> Removed ({trackChanges.removed.length})
            </h4>
            <div className="tracks-timeline">
              {trackChanges.removed.map((track) => (
                <div key={track.id} className="track-change">
                  <div className="track-info">
                    <div className="track-name">{track.name}</div>
                  </div>
                  <div className={`track-type ${track.type.toLowerCase().includes('midi') ? 'midi' : 'audio'}`}>
                    {track.type.toLowerCase().includes('midi') ? 'MIDI' : 'AUDIO'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Placeholder file changes for each version - to be replaced with actual API data later
  const getPlaceholderFileChanges = (hash: string, index: number): FileChange[] => {
    // Generate some placeholder file changes based on hash and index for variety
    const changes: FileChange[] = [];
    const fileTypes = ['als', 'wav', 'json'];
    const changeTypes = ['added', 'modified', 'deleted'];

    // Add 1-3 file changes per version
    const numChanges = 1 + (hash.charCodeAt(0) % 3);
    
    for (let i = 0; i < numChanges; i++) {
      const fileType = fileTypes[hash.charCodeAt(i) % fileTypes.length];
      const changeType = i === 0 && index === 0 
        ? 'added' // First version always adds files
        : changeTypes[hash.charCodeAt(i + 2) % changeTypes.length];
      
      changes.push({
        name: `project_${index + 1}${i > 0 ? `_${i}` : ''}.${fileType}`,
        type: changeType,
        fileType
      });
    }
    
    return changes;
  };

  useEffect(() => {
    if (user && id) {
      setLoading(true);
      axios.get(`http://localhost:3333/api/history/all/${user.username}/${id}`, {
        withCredentials: true
      })
        .then(response => {
          setHistory(response.data);
          setError(null);
        })
        .catch(error => {
          console.error('Error fetching version history:', error);
          setError('Failed to load version history.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getVersionNumber = (index: number, total: number) => {
    // Show versions in reverse order (newest first)
    return `v${total - index}`;
  };

  const handleRevert = (versionHash: string) => {
    // Implementation for reverting to a specific version would go here
    alert(`Revert to version with ID: ${versionHash} - Feature coming soon!`);
  };

  const handleDownload = (versionHash: string) => {
    // Implementation for downloading a specific version would go here
    alert(`Download version with ID: ${versionHash} - Feature coming soon!`);
  };

  const getFileIcon = (fileType: string) => {
    switch(fileType) {
      case 'als':
        return <FaFileCode />;
      case 'wav':
        return <FaFileAudio />;
      default:
        return <FaFileAlt />;
    }
  };

  const getChangeIcon = (changeType: string) => {
    switch(changeType) {
      case 'added':
        return <FaPlus className="change-icon added" />;
      case 'deleted':
        return <FaMinus className="change-icon deleted" />;
      default: // modified
        return <FaEdit className="change-icon modified" />;
    }
  };

  if (loading) {
    return (
      <div className="history-loading">
        <div className="history-spinner"></div>
        {/* <p>Loading your project's version history...</p> */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-error">
        <p>{error}</p>
        <button className="back-btn" onClick={() => window.history.back()}>
          <FaArrowLeft /> Back to Project
        </button>
      </div>
    );
  }

  return (
    <motion.div
      className="history-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="history-header">
        <div className="history-back">
          <button className="back-btn" onClick={() => window.history.back()}>
            <FaArrowLeft /> Back to Project
          </button>
        </div>
        
        <div className="history-title-container">
          <FaHistory className="history-icon" />
          <h2 className="history-title">Version History</h2>
        </div>
        
        <div className="history-stats">
          <span className="history-version-count">
            {history?.history.total || 0} saved versions
          </span>
        </div>
      </div>

      <div className="history-description">
        <p>Each time you save your project, a new version is created. You can revert to any previous version or download files from past versions.</p>
      </div>

      <div className="history-timeline">
        {history?.history.all.map((version, index) => {
          const fileChanges = getPlaceholderFileChanges(version.hash, index);
          
          return (
            <motion.div 
              key={version.hash}
              className="version-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="version-badge">
                {getVersionNumber(index, history.history.total)}
              </div>
              
              <div className="version-header">
                <div className="version-message">{version.message}</div>
                <div className="version-date">
                  <FaCalendarAlt className="version-icon" />
                  {formatDate(version.date)}
                </div>
              </div>
              
              <div className="version-details">
                <div className="version-author">
                  <FaUser className="version-icon" />
                  <span>{version.author_name}</span>
                </div>
                
                <div className="version-type">
                  <FaMusic className="version-icon" />
                  <span>Project Update</span>
                </div>
              </div>

              {/* File changes section */}
              {/* Track changes section */}

              {renderTrackChanges(version) || (
                <div className="version-tracks">
                  <h4>Track Changes</h4>
                  <div className="track-changes-empty">
                    <FaMusic className="empty-tracks-icon" />
                    <p>No track changes information available for this version.</p>
                  </div>
                </div>
              )}
              {/* {version.body && (
                <div className="version-body">
                  {version.body}
                </div>
              )} */}

              <div className="version-actions">
                <button 
                  className="version-btn revert-btn" 
                  onClick={() => handleRevert(version.hash)}
                  title="Restore this version"
                >
                  <FaSave /> Restore Version
                </button>
                
                <button 
                  className="version-btn download-btn" 
                  onClick={() => handleDownload(version.hash)}
                  title="Download this version's files"
                >
                  <FaDownload /> Download Files
                </button>
              </div>
            </motion.div>
          );
        })}

        {(!history?.history.all || history.history.all.length === 0) && (
          <div className="no-versions">
            <FaMusic className="empty-icon" />
            <p>No versions found for this project.</p>
            <p className="empty-subtitle">When you upload updates to your project, they'll appear here.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default History;