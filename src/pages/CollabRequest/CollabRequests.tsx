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
import axios from 'axios';
import { UploadAction } from "../../constants/constants";
import { CollabReqStatus } from "../../constants/constants";


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
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const isOwner = user?.username === projectOwner;

  // Effect to fetch requests
  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);

    fetch(`http://${window.location.hostname}:3333/api/projects/${id}`, { withCredentials: true })
      .then(response => response.json())
      .then(async data => {
        const owner = data[0].User.name;
        setProjectOwner(owner);

        if (user.username === owner) {
          // Fetch real collaboration requests for the owner
          try {
            const response = await axios.get(
              `http://${window.location.hostname}:3333/api/projects/${id}/collabs`,
              { withCredentials: true }
            );

            const transformed = response.data.map((r: any) => ({
              id: r.id,
              user: r.User?.name || "unknown",
              message: r.description,
              date: r.created_at,
              tracks_modified: r.trackChanges?.modified?.map((t: any) => t.name) || [],
              status: r.status
            }));

            setRequests(transformed);
          } catch (err) {
            console.error("Failed to fetch collaboration requests:", err);
            setError("Failed to load collaboration requests.");
          }
        }
      })
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

  const handleSubmitRequest = async () => {
    const fileInput = document.getElementById('file-upload') as HTMLInputElement | null;
    const files = selectedFiles;

    if (!files || files.length === 0) {
      setSubmitError("Please select files to upload");
      return;
    }

    if (!newRequestMessage.trim()) {
      setSubmitError("Please enter a message");
      return;
    }

    if (!id) {
      setSubmitError("Project ID is missing.");
      return;
    }

    if (!user?.id) {
      setSubmitError("User authentication failed.");
      return;
    }

    const hasAlsFile = files.some(file => file.name.toLowerCase().endsWith(".als"));
    if (!hasAlsFile) {
      setSubmitError("At least one .als file is required for collaboration requests.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("projectId", id);
      formData.append("userId", String(user.id));
      formData.append("commitMessage", newRequestMessage);
      formData.append("actionType", UploadAction.COLLAB_REQ);
      formData.append("title", `Collaboration request from ${user.username || user.id}`);

      files.forEach(file => {
        const name = file.name.toLowerCase();
        const isBackup = file.webkitRelativePath?.toLowerCase().includes("backup");
        if (!isBackup && (name.endsWith(".als") || name.endsWith(".wav") || name.endsWith(".flac"))) {
          formData.append("files", file);
        }
      });

      const response = await axios.post(
        `http://${window.location.hostname}:3333/api/upload`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            const percent = Math.round((e.loaded * 100) / (e.total || 1));
            setUploadProgress(percent);
          },
          timeout: 60000
        }
      );

      console.log("Upload successful:", response.data);
      setSubmitSuccess("Collaboration request submitted successfully!");
      setNewRequestMessage("");
      setSelectedFiles([]);
      if (fileInput) fileInput.value = "";
      setIsModalOpen(false);

      const collabResponse = await axios.get(
        `http://${window.location.hostname}:3333/api/projects/${id}/collabs`,
        { withCredentials: true }
      );

      const transformed = collabResponse.data.map((r: any) => ({
        id: r.id,
        user: r.User?.name || "unknown",
        message: r.description,
        date: r.created_at,
        tracks_modified: r.trackChanges?.modified?.map((t: any) => t.name) || [],
        status: r.status
      }));

      setRequests(transformed);
      console.log("Collaboration requests refreshed:", transformed);

    } catch (error: any) {
      const message = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Upload failed. Please try again.";
      console.error("Upload error:", message);
      setSubmitError(message);
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };


  const updateCollabStatus = async (collabId: string, status: 'accepted' | 'rejected') => {
    const response = await axios.post(
      `http://${window.location.hostname}:3333/api/collabs/${collabId}`,
      { action: status },
      { withCredentials: true }
    );

    if (response.status !== 200) {
      throw new Error("Failed to update collaboration status");
    }

    return response.data;
  };

  const handleApproveReject = async (requestId: number, action: 'approve' | 'reject') => {
    const backendStatus = action === 'approve' ? CollabReqStatus.ACCEPTED : CollabReqStatus.REJECTED;
    const uiStatus = action === 'approve' ? 'approved' : 'rejected';

    setActionLoading(`${requestId}-${action}`);

    try {
      await updateCollabStatus(requestId.toString(), backendStatus);

      setRequests(prev =>
        prev.map(req =>
          req.id === requestId ? { ...req, status: uiStatus } : req
        )
      );
    } catch (err) {
      console.error("Failed to update collaboration status");
    } finally {
      setActionLoading(null);
    }
  };



  const handleDownloadFiles = (requestId: number) => {
    console.log(`Downloading files for request ${requestId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="collab-requests-loading">
        <div className="collab-spinner"></div>
      </div>
    );
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

      <div className="collab-actions">
        {!isOwner && (
          <button
            className="request-collab-btn"
            onClick={() => setIsModalOpen(true)}
          >
            <FaPlus /> New Collaboration Request
          </button>
        )}

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
                        <FaMusic className="tracks-icon" /> Modified Tracks ({request.tracks_modified?.length || 0})
                      </h4>
                      <div className="tracks-list">
                        {(request.tracks_modified || []).map((track, idx) => (
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
                  <div className="file-input-subtext">Supports .wav, .flac, .als files (at least one .als file required)</div>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".wav,.flac,.als"
                  onChange={handleFileChange}
                  disabled={submitting}
                  className="file-input"
                  webkitdirectory="true"
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
              {submitting && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <span className="progress-percentage">{uploadProgress}%</span>
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