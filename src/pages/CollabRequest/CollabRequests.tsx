/**
 * @file CollabRequests.tsx
 * @description Component for managing collaboration requests on a music project.
 * Displays a list of collaboration requests, allows users to submit new requests,
 * and enables project owners to approve or reject requests.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import { motion } from 'framer-motion';
import { 
  FaArrowLeft, FaUser, FaCalendarAlt, FaMusic, 
  FaPlus, FaCheck, FaTimes, FaPaperPlane, FaFileAudio,
  FaUserFriends, FaTag
} from 'react-icons/fa';
import './CollabRequests.css';

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

  // Dummy data for collaboration requests
  const dummyRequests: CollabRequest[] = [
    {
      id: 1,
      user: "dj_alice",
      message: "Added a new synth lead to the chorus section.",
      date: "2025-03-05T14:30:00Z",
      tracks_modified: ["synth_lead.wav", "background_harmony.flac"],
      status: "pending",
    },
    {
      id: 2,
      user: "beatmaster_bob",
      message: "Tweaked the drum loop and added a new kick pattern.",
      date: "2025-03-04T09:15:00Z",
      tracks_modified: ["drum_loop.wav"],
      status: "approved",
    },
    {
      id: 3,
      user: "vocalist_eve",
      message: "Recorded a vocal track for the bridge.",
      date: "2025-03-03T18:45:00Z",
      tracks_modified: ["vocals_bridge.wav", "harmony_layer.flac"],
      status: "rejected",
    },
  ];

  const [requests, setRequests] = useState<CollabRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [projectOwner, setProjectOwner] = useState<string>('project_owner'); // Dummy project owner
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newRequestMessage, setNewRequestMessage] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Simulate fetching requests with dummy data
  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    // Simulate a delay for "fetching"
    setTimeout(() => {
      setRequests(dummyRequests);
      setProjectOwner('project_owner');
      setError(null);
      setLoading(false);
    }, 1000);
  }, [id, user]);

  /**
   * @function handleFileChange
   * @description Handles file input changes for the collaboration request form.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  /**
   * @function handleSubmitRequest
   * @description Simulates submitting a new collaboration request.
   */
  const handleSubmitRequest = () => {
    if (!newRequestMessage || selectedFiles.length === 0) {
      setSubmitError('Please provide a message and select at least one file.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Simulate a new request
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

  /**
   * @function handleApproveReject
   * @description Simulates approving or rejecting a collaboration request.
   */
  const handleApproveReject = (requestId: number, action: 'approve' | 'reject') => {
    setActionLoading(`${requestId}-${action}`);
    setTimeout(() => {
      setRequests(requests.map(request => 
        request.id === requestId ? { ...request, status: action === 'approve' ? 'approved' : 'rejected' } : request
      ));
      setActionLoading(null);
    }, 1000);
  };

  /**
   * @function formatDate
   * @description Formats a date string into a user-friendly format.
   */
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
        <p>Review collaboration requests from other users. Approve to add them as collaborators and merge their changes, or reject to decline.</p>
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
        <button
          className="request-collab-btn"
          onClick={() => setIsModalOpen(true)}
          disabled={user?.username === projectOwner}
        >
          <FaPlus /> Request Collaboration
        </button>
      </div>

      <div className="collab-requests-list">
        {requests.length > 0 ? (
          requests.map((request, index) => (
            <motion.div
              key={request.id}
              className="collab-request-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="request-header">
                <div className="request-message">{request.message}</div>
                <div className="request-date">
                  <FaCalendarAlt className="request-icon" />
                  {formatDate(request.date)}
                </div>
              </div>

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

              {user?.username === projectOwner && request.status === 'pending' && (
                <div className="request-actions">
                  <button
                    className="action-btn approve-btn"
                    onClick={() => handleApproveReject(request.id, 'approve')}
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
                    onClick={() => handleApproveReject(request.id, 'reject')}
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
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="no-requests">
            <FaUserFriends className="empty-icon" />
            <p>No collaboration requests yet.</p>
            <p className="empty-subtitle">
              Invite others to collaborate, and their requests will appear here.
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
              <FaPaperPlane className="modal-icon" /> Request Collaboration
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
                <label htmlFor="file-upload" className="file-input-label">
                  <FaMusic className="file-input-icon" />
                  <div className="file-input-text">Upload modified tracks</div>
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
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      <FaFileAudio className="file-icon" />
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{Math.round(file.size / 1024)} KB</span>
                    </div>
                  ))}
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