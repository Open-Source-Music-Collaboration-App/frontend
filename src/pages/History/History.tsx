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

function History() {
  const { id } = useParams();
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

<div className="version-tracks">
  <h4>
    Modified:
  </h4>
  <div className="tracks-timeline">
    {version.tracks && version.tracks.map((track, trackIndex) => (
      <div key={trackIndex} className="track-change">
        <div className="track-number">{track.number}</div>
        <div className="track-info">
          <div className="track-name">{track.name}</div>
          {/* <div className="track-detail">
            <span className={`change-type ${track.changeType}`}>
              {track.changeType === 'modified' ? 'Modified' : track.changeType === 'added' ? 'New' : 'Removed'}
            </span>
            {track.duration && <span className="duration">{track.duration}</span>}
          </div> */}
        </div>
        <div className={`track-type ${track.type}`}>
          {track.type === 'midi' && <FaMusic size={10} />}
          {track.type === 'audio' && <FaFileAudio size={10} />}
          {track.type === 'automation' && <FaSliders size={10} />}
        </div>
      </div>
    ))}
    
    {/* For demo/placeholder purposes since the backend doesn't provide track data yet */}
    {!version.tracks && (
      <>
        <div className="track-change">
          {/* <div className="track-number">1</div> */}
          <div className="track-info">
            <div className="track-name">Orbit Ray</div>
            {/* <div className="track-detail">
              <span className="change-type modified">Modified</span>
              <span className="duration">2:45</span>
            </div> */}
          </div>
          <div className="track-type midi">
            MIDI
          </div>
        </div>
        
        <div className="track-change">
          {/* <div className="track-number">4</div> */}
          <div className="track-info">
            <div className="track-name">FM Four Pluck</div>
            {/* <div className="track-detail">
              <span className="change-type added">New</span>
              <span className="duration">3:12</span>
            </div> */}
          </div>
          <div className="track-type midi">
            MIDI
          </div>
        </div>
        
        {index === 0 && (
          <div className="track-change">
            {/* <div className="track-number">8</div> */}
            <div className="track-info">
              <div className="track-name">Dilla Snare 03</div>
              {/* <div className="track-detail">
                <span className="change-type added">New</span>
                <span className="duration">0:45</span>
              </div> */}
            </div>
            <div className="track-type audio">
              AUDIO
            </div>
          </div>
        )}
      </>
    )}
  </div>
</div>
              {version.body && (
                <div className="version-body">
                  {version.body}
                </div>
              )}

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