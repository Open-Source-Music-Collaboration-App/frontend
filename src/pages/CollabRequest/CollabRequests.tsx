import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import { motion } from 'framer-motion';
import { 
  FaArrowLeft, FaUser, FaCalendarAlt, FaMusic, 
  FaPlus, FaCheck, FaTimes, FaPaperPlane, FaFileAudio,
  FaUserFriends, FaTag, FaDownload, FaChevronDown, FaChevronUp,
  FaAngleDown, FaAngleUp
} from 'react-icons/fa';
import './CollabRequests.css';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';

/**
 * @interface CollabRequest
 * @description Defines the structure of a collaboration request.
 */
interface CollabRequest {
  id: number;
  user: string;
  message: string;
  date: string;
  tracks_modified: string[];
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * @function CollabRequests
 * @description Main component for displaying and managing collaboration requests.
 */
function CollabRequests() {
  const { id } = useParams(); // Project ID from URL
  const { user } = useAuth(); // Current authenticated user

  const dummyRequests: CollabRequest[] = [
    {
      id: 1,
      user: "dj_alice",
      message: "Added a new synth lead to the chorus section.",
      date: "2025-03-05T14:30:00Z",
      tracks_modified: ["synth_lead"],
      status: "pending",
    },
    {
      id: 2,
      user: "beatmaster_bob",
      message: "Tweaked the drum loop and added a new kick pattern.",
      date: "2025-03-04T09:15:00Z",
      tracks_modified: ["drums"],
      status: "approved",
    },
    {
      id: 3,
      user: "vocalist_eve",
      message: "Recorded a vocal track for the bridge.",
      date: "2025-03-03T18:45:00Z",
      tracks_modified: ["vocals bridge", "harmony layer"],
      status: "rejected",
    },
  ];

  const [requests, setRequests] = useState<CollabRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [projectOwner, setProjectOwner] = useState<string>('project_owner');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newRequestMessage, setNewRequestMessage] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedRequests, setExpandedRequests] = useState<number[]>([]);
  const [areAllExpanded, setAreAllExpanded] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const isOwner = user?.username === projectOwner;

  // Effect to fetch requests
  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    
    //fetch /api/projects/:id to get owner
    fetch(`/api/projects/${id}`, { withCredentials: true })
      .then(response => response.json())
      .then(data => {
        // console.log("Project datafrom collab:", data);
        setProjectOwner(data[0].User.name);
        if (data.owner !== user.username) {
          setRequests(dummyRequests);
        }
      }
      )
      .catch(err => {
        console.error(err);
        setError('Failed to load project data.');
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  const toggleRequestExpansion = (requestId: number) => {
    setExpandedRequests(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const toggleAllExpansions = () => {
    if (areAllExpanded) {
      setExpandedRequests([]);
    } else {
      setExpandedRequests(requests.map(req => req.id));
    }
    setAreAllExpanded(!areAllExpanded);
  };

  const handleDrag = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmitRequest = () => {
    if (!newRequestMessage || selectedFiles.length === 0) {
      setSubmitError('Please provide a message and select at least one file.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    setTimeout(() => {
      const newRequest: CollabRequest = {
        id: requests.length + 1,
        user: user?.username || 'unknown_user',
        message: newRequestMessage,
        date: new Date().toISOString(),
        tracks_modified: selectedFiles.map(file => file.name),
        status: 'pending',
      };

      setRequests([newRequest, ...requests]);
      setSubmitSuccess('Collaboration request submitted successfully!');
      setNewRequestMessage('');
      setSelectedFiles([]);
      setIsModalOpen(false);
      setSubmitting(false);
      setTimeout(() => setSubmitSuccess(null), 3000);
    }, 1000);
  };

  const handleApproveReject = (requestId: number, action: 'approve' | 'reject') => {
    setActionLoading(`${requestId}-${action}`);
    setTimeout(() => {
      setRequests(requests.map(request => 
        request.id === requestId ? { ...request, status: action === 'approve' ? 'approved' : 'rejected' } : request
      ));
      setActionLoading(null);
    }, 1000);
  };

  const handleDownloadFiles = (requestId: number) => {
    // Mock download functionality
    console.log(`Downloading files for request ${requestId}`);
    // In a real app, this would trigger a file download
  };

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

  if (loading) {
    return (<LoadingSpinner fullScreen={false} message="Loading..." size="large" />);;
  }

  if (error) {
    return (
      <div className="collab-requests-error">
        <p>{error}</p>
        <button className="back-btn" onClick={() => window.history.back()}>
          <FaArrowLeft /> Back to Project
        </button>
      </div>
    );
  }

  return (
    <motion.div
      className="collab-requests-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="collab-requests-header">
        <div className="collab-back">
          <button className="back-btn" onClick={() => window.history.back()}>
            <FaArrowLeft /> Back to Project
          </button>
        </div>
        <div className="collab-title-container">
          <FaUserFriends className="collab-icon" />
          <h2 className="collab-title">Collaboration Requests</h2>
        </div>
        <div className="collab-stats">
          <span className="collab-request-count">
            {requests.length} {requests.length === 1 ? 'request' : 'requests'}
          </span>
        </div>
      </div>

      <div className="collab-description">
        {isOwner ? (
        <p>Review collaboration requests from other users. Approve to add them as collaborators and merge their changes, or reject to decline.</p>
        ) : (
        <p>View collaboration requests from users. You can submit your own request to collaborate on this project.</p>
        )}
      </div>

      {submitSuccess && (
        <div className="submit-success-message">
          <span className="success-icon">✓</span> {submitSuccess}
        </div>
      )}
      {submitError && (
        <div className="submit-error-message">
          <span className="error-icon">!</span> {submitError}
        </div>
      )}

      {/* Only show New Collab Request button to non-owners */}
      <div className="collab-actions">
      {!isOwner && (
          <button
            className="request-collab-btn"
            onClick={() => setIsModalOpen(true)}
          >
            <FaPlus /> New Collaboration Request
          </button>
      )}

      {/* Expand All toggle when there are requests */}
      {requests.length > 0 && (
        <div className="expand-all-container">
          <button className="expand-all-btn" onClick={toggleAllExpansions}>
            {areAllExpanded ? (
              <>
                <FaAngleUp /> Collapse All
              </>
            ) : (
              <>
                <FaAngleDown /> Expand All
              </>
            )}
          </button>
        </div>
      )}
      </div>

      <div className="collab-requests-list">
        {requests.length > 0 ? (
          requests.map((request, index) => {
            const isExpanded = expandedRequests.includes(request.id);
            return (
              <motion.div
                key={request.id}
                className={`collab-request-card ${request.status}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div 
                  className="request-header"
                  onClick={() => toggleRequestExpansion(request.id)}
                >
                  <div className="header-main">
                    <div className={`request-status-indicator ${request.status}`}></div>
                    <div className="request-message">{request.message}</div>
                  </div>
                  <div className="header-details">
                    <div className="request-user-compact">
                      <FaUser className="request-icon" />
                      <span>{request.user}</span>
                    </div>
                    <div className="request-date">
                      <FaCalendarAlt className="request-icon" />
                      {formatDate(request.date)}
                    </div>
                    <button className="expand-btn">
                      {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="request-expanded-content">
                    <div className="request-details">
                      <div className="request-user">
                        <FaUser className="request-icon" />
                        <span>{request.user}</span>
                      </div>
                      <div className={`request-status ${request.status}`}>
                        {request.status === 'pending' ? (
                          'Pending'
                        ) : request.status === 'approved' ? (
                          <>
                            <FaCheck className="status-icon approved" /> Approved
                          </>
                        ) : (
                          <>
                            <FaTimes className="status-icon rejected" /> Rejected
                          </>
                        )}
                      </div>
                    </div>

                    <div className="request-tracks">
                      <h4>
                        <FaMusic className="tracks-icon" /> Modified Tracks ({request.tracks_modified.length})
                      </h4>
                      <div className="tracks-list">
                        {request.tracks_modified.map((track, idx) => (
                          <div key={idx} className="track-item">
                            <FaFileAudio className="track-icon" />
                            <span className="track-name">{track}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="request-actions">
                      {isOwner && request.status === 'pending' && (
                        <>
                          <button
                            className="action-btn approve-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveReject(request.id, 'approve');
                            }}
                            disabled={actionLoading === `${request.id}-approve`}
                          >
                            {actionLoading === `${request.id}-approve` ? (
                              <span className="spinner-small"></span>
                            ) : (
                              <>
                                <FaCheck /> Approve
                              </>
                            )}
                          </button>
                          <button
                            className="action-btn reject-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveReject(request.id, 'reject');
                            }}
                            disabled={actionLoading === `${request.id}-reject`}
                          >
                            {actionLoading === `${request.id}-reject` ? (
                              <span className="spinner-small"></span>
                            ) : (
                              <>
                                <FaTimes /> Reject
                              </>
                            )}
                          </button>
                        </>
                      )}
                      <button
                        className="action-btn download-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadFiles(request.id);
                        }}
                      >
                        <FaDownload /> Download Files
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="no-requests">
            <FaUserFriends className="empty-icon" />
            <p>No collaboration requests yet.</p>
            <p className="empty-subtitle">
              {isOwner 
                ? "When users submit requests, they will appear here."
                : "Submit a request to collaborate on this project."}
            </p>
          </div>
        )}
      </div>

      {/* Improved upload modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <motion.div
            className="modal-content"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <h3 className="modal-title">
              <FaPaperPlane className="modal-icon" /> New Collaboration Request
            </h3>
            <div className="modal-form">
              <div className="form-group">
                <label htmlFor="request-message">
                  <FaTag className="form-icon" /> Message
                </label>
                <textarea
                  id="request-message"
                  value={newRequestMessage}
                  onChange={(e) => setNewRequestMessage(e.target.value)}
                  placeholder="Describe your changes (e.g., 'Added a new bass track')"
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label 
                  htmlFor="file-upload" 
                  className={`file-input-label ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  <FaMusic className="file-input-icon" />
                  <div className="file-input-text">
                    {dragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
                  </div>
                  <div className="file-input-subtext">Supports .wav, .flac, .als files</div>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".wav,.flac,.als"
                  onChange={handleFileChange}
                  disabled={submitting}
                  className="file-input"
                />
              </div>
              {selectedFiles.length > 0 && (
                <div className="selected-files">
                  <h4>Selected Files ({selectedFiles.length})</h4>
                  <div className="file-items-container">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        <FaFileAudio className="file-icon" />
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{Math.round(file.size / 1024)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button
                  className="modal-btn submit-btn"
                  onClick={handleSubmitRequest}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="spinner-small"></span>
                  ) : (
                    <>
                      <FaPaperPlane /> Submit Request
                    </>
                  )}
                </button>
                <button
                  className="modal-btn cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export default CollabRequests;