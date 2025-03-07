import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  FaHistory, FaCalendarAlt, FaUser, FaMusic, FaSave, 
  FaArrowLeft, FaDownload, FaFileAlt, FaFileAudio, 
  FaFileCode, FaPlus, FaMinus, FaEdit, FaUserFriends } from 'react-icons/fa';
import './History.css';
import JSZip from 'jszip';


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
  const [projectOwner, setProjectOwner] = useState<string>("");
  const [restoring, setRestoring] = useState<boolean>(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);



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

          if (response.data.history.all.length > 0) {
            const commits = response.data.history.all;
            const oldestCommit = commits[commits.length - 1]; // Get the last item (oldest commit)
            setProjectOwner(oldestCommit.author_name);
          }
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

  const handleRevert = async (versionHash: string, versionNumber: string) => {
    // Show confirmation dialog
    const confirmRestore = window.confirm(
      `Are you sure you want to restore to version ${versionNumber}? This will create a new version with these files as the current state.`
    );
    
    if (!confirmRestore) return;
    
    // Set loading state
    setRestoring(true);
    setRestoringVersion(versionHash);
    setRestoreError(null);
    
    try {
      // Call the API endpoint to restore this version
      const response = await axios.post(
        `http://localhost:3333/api/history/restore/${user?.username}/${id}/${versionHash}`,
        {
          message: `Restored to ${versionNumber}`
        },
        { 
          withCredentials: true,
          timeout: 60000 // 60 seconds timeout for potentially large operations
        }
      );
      
      // Handle success
      setRestoreSuccess(`Successfully restored to ${versionNumber}. A new version has been created.`);
      
      // Refresh history data after a short delay
      setTimeout(() => {
        // Refetch history to show the new restoration commit
        axios.get(`http://localhost:3333/api/history/all/${user?.username}/${id}`, {
          withCredentials: true
        })
          .then(response => {
            setHistory(response.data);
            
            if (response.data.history.all.length > 0) {
              const commits = response.data.history.all;
              const oldestCommit = commits[commits.length - 1];
              setProjectOwner(oldestCommit.author_name);
            }
          })
          .catch(error => {
            console.error('Error refreshing history:', error);
          })
          .finally(() => {
            // Clear success message after refresh
            setTimeout(() => setRestoreSuccess(null), 3000);
          });
      }, 1500);
      
    } catch (error) {
      console.error("Error restoring version:", error);
      setRestoreError("Failed to restore version. Please try again.");
      setTimeout(() => setRestoreError(null), 5000);
    } finally {
      setRestoring(false);
      setRestoringVersion(null);
    }
  };

  const handleDownload = async (version: Version) => {
    try {
      // Show loading indicator or disable button during download
      const downloadButton = document.getElementById(`download-${version.hash}`) as HTMLButtonElement;
      if (downloadButton) {
        downloadButton.disabled = true;
        downloadButton.innerHTML = '<span class="spinner-small"></span>';
      }
  
      // Make request to download files - the API will return a zip file
      const response = await axios.get(
        `http://localhost:3333/api/history/${user?.username}/${id}/${version.hash}`, 
        {
          withCredentials: true,
          responseType: 'blob', // Important: we need the response as a blob
        }
      );
      
      // Create a download link and trigger it
      const downloadUrl = URL.createObjectURL(response.data);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      
      // Set the filename to something meaningful
      const filename = `project-${id}-v${version.hash.substring(0, 7)}.zip`;
      downloadLink.setAttribute('download', filename);
      
      // Append to body, trigger click and remove
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Clean up
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadUrl);
      
      // Reset button state
      if (downloadButton) {
        downloadButton.disabled = false;
        downloadButton.innerHTML = '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M216 0h80c13.3 0 24 10.7 24 24v168h87.7c17.8 0 26.7 21.5 14.1 34.1L269.7 378.3c-7.5 7.5-19.8 7.5-27.3 0L90.1 226.1c-12.6-12.6-3.7-34.1 14.1-34.1H192V24c0-13.3 10.7-24 24-24zm296 376v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h146.7l49 49c20.1 20.1 52.5 20.1 72.6 0l49-49H488c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z"></path></svg> Download Files';
      }
    } catch (error) {
      console.error('Error downloading version:', error);
      
      // Show error notification
      alert('Failed to download the files. Please try again.');
      
      // Reset button state
      const downloadButton = document.getElementById(`download-${version.hash}`) as HTMLButtonElement;
      if (downloadButton) {
        downloadButton.disabled = false;
        downloadButton.innerHTML = '<svg class="svg-inline--fa fa-download" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="download" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zM432 456c-13.3 0-24-10.7-24-24s10.7-24 24-24s24 10.7 24 24s-10.7 24-24 24z"></path></svg> Download Files';
      }
    }
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

      {restoreSuccess && (
        <div className="restore-success-message">
          <span className="success-icon">✓</span> {restoreSuccess}
        </div>
      )}

      {restoreError && (
        <div className="restore-error-message">
          <span className="error-icon">!</span> {restoreError}
        </div>
      )}

      <div className="history-timeline">
        {history?.history.all.map((version, index) => {
          // const fileChanges = getPlaceholderFileChanges(version.hash, index);
          const isCollaborator = version.author_name !== projectOwner;

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
              <div className="version-message">
                {version.message}
                {version.message.toLowerCase().includes('restored to') && (
                  <span className="version-restored-badge">
                    <FaHistory className="restore-icon" />
                    Restoration
                  </span>
                )}
              </div>
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
                
                <div className={`version-type ${isCollaborator ? 'collaborator' : ''}`}>
                  {isCollaborator ? 
                    <FaUserFriends className="version-icon" /> : 
                    <FaMusic className="version-icon" />
                  }
                  <span>
                    {isCollaborator ? 'Collaborator Update' : 'Project Update'}
                  </span>
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
                className={`version-btn revert-btn ${restoring && restoringVersion === version.hash ? 'restoring' : ''}`}
                onClick={() => handleRevert(version.hash, getVersionNumber(index, history.history.total))}
                title="Restore this version"
                disabled={restoring}
              >
                {restoring && restoringVersion === version.hash ? (
                  <>
                    <span className="spinner-small"></span> Restoring...
                  </>
                ) : (
                  <>
                    <FaSave /> Restore Version
                  </>
                )}
              </button>
                
                <button 
                  id={`download-${version.hash}`}
                  className="version-btn download-btn" 
                  onClick={() => handleDownload(version)}
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