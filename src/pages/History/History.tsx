/**
 * @file History.tsx
 * @description Project version history component that displays a timeline of project versions.
 * This component allows users to view commit history, compare versions, restore previous versions,
 * and download files from specific versions of their music projects.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  FaHistory, FaCalendarAlt, FaUser, FaMusic, FaSave, 
  FaArrowLeft, FaDownload, FaFileAlt, FaFileAudio, 
  FaFileCode, FaPlus, FaMinus, FaEdit, FaUserFriends, FaSearchPlus, 
  FaAngleUp,
  FaAngleDown,
  FaChevronDown,
  FaChevronUp} from 'react-icons/fa';
import './History.css';
import Tooltip from '../../components/Tooltip/Tooltip';

/**
 * @interface Version
 * @description Defines the structure of a single commit/version in the project history.
 *
 * @property {string} hash - Unique identifier/hash for the commit
 * @property {string} date - Timestamp when the commit was created
 * @property {string} message - Commit message describing the changes
 * @property {string} refs - Reference information (branches, tags)
 * @property {string} body - Additional commit information including track changes
 * @property {string} author_name - Name of the user who created the commit
 * @property {string} author_email - Email of the user who created the commit
 */
interface Version {
  hash: string;
  date: string;
  message: string;
  refs: string;
  body: string;
  author_name: string;
  author_email: string;
}

/**
 * @interface FileChange
 * @description Defines the structure of a file change in a version.
 *
 * @property {string} name - Name of the file that was changed
 * @property {string} type - Type of change: "added", "modified", or "deleted"
 * @property {string} fileType - File extension/type: "als", "wav", "json", etc.
 */
interface FileChange {
  name: string;
  type: string; // "added", "modified", "deleted"
  fileType: string; // "als", "wav", "json", etc.
}

/**
 * @interface HistoryResponse
 * @description Defines the structure of the API response for project history.
 *
 * @property {string} projectId - ID of the project
 * @property {string} userId - ID of the project owner
 * @property {object} history - Object containing version history data
 * @property {Version[]} history.all - Array of all versions
 * @property {Version} history.latest - Latest version of the project
 * @property {number} history.total - Total number of versions
 */
interface HistoryResponse {
  projectId: string;
  userId: string;
  history: {
    all: Version[];
    latest: Version;
    total: number;
  };
}

/**
 * @interface TrackChange
 * @description Defines the structure of a track change in a version.
 *
 * @property {string} id - Unique identifier for the track
 * @property {string} name - Name of the track
 * @property {string} type - Type of the track (audio, MIDI, etc.)
 */
interface TrackChange {
  id: string;
  name: string;
  type: string;
}

/**
 * @interface TrackChanges
 * @description Defines the structure of track changes in a version.
 *
 * @property {TrackChange[]} added - Array of tracks that were added
 * @property {TrackChange[]} modified - Array of tracks that were modified
 * @property {TrackChange[]} removed - Array of tracks that were removed
 */
interface TrackChanges {
  added: TrackChange[];
  modified: TrackChange[];
  removed: TrackChange[];
}

/**
 * Adapter function that transforms the diff engine output into a NoteDiff object.
 *
 * We assume the diff engine returns an object like:
 * { diff: { noteChanges: [ { type: "noteAdded", trackName: "My Track", note: "60", beat: 1.0, description: "..." }, ... ] } }
 *
 * If diffData or diffData.noteChanges is missing, we return empty arrays.
 */
function transformDiffEngineOutput(diffData: any, trackName: string): NoteDiff {
  console.log("transformDiffEngineOutput input:", diffData);

  if (!diffData || !diffData.noteChanges) {
    return { added: [], removed: [], modified: [] };
  }

  const changes = diffData.noteChanges.filter(
    (change: any) => change.trackName === trackName,
  );

  const added = changes
    .filter((change: any) => change.type === "noteAdded")
    .map((change: any) => ({
      time: change.beat,
      pitch: Number(change.note),
      duration: 1,
      velocity: 100,
    }));

  const removed = changes
    .filter((change: any) => change.type === "noteRemoved")
    .map((change: any) => ({
      time: change.beat,
      pitch: Number(change.note),
      duration: 1,
      velocity: 100,
    }));

  const modified = []; // placeholder if needed later

  return { added, removed, modified };
}

/**
 * @function History
 * @description Component that displays the version history of a project with the ability
 * to restore to previous versions and download version files.
 *
 * @returns {JSX.Element} The rendered history component
 */
function History() {
  /**
   * @hook useParams
   * @description Hook to access URL parameters, used to get the project ID
   */
  const { id } = useParams();

  /**
   * @hook useAuth
   * @description Hook to access authentication context and user information
   */
  const { user } = useAuth();

  /**
   * @state history
   * @description State that stores the project history data from the API
   */
  const [history, setHistory] = useState<HistoryResponse | null>(null);

  /**
   * @state loading
   * @description State that tracks whether history data is currently being loaded
   */
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * @state error
   * @description State that stores any error message that occurs during data fetching
   */
  const [error, setError] = useState<string | null>(null);

  /**
   * @state projectOwner
   * @description State that stores the username of the project owner
   */
  const [projectOwner, setProjectOwner] = useState<string>("");

  /**
   * @state restoring
   * @description State that tracks whether a version restore operation is in progress
   */
  const [restoring, setRestoring] = useState<boolean>(false);

  /**
   * @state restoringVersion
   * @description State that stores the hash of the version being restored
   */
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

  /**
   * @state restoreError
   * @description State that stores any error message during version restoration
   */
  const [restoreError, setRestoreError] = useState<string | null>(null);

  /**
   * @state restoreSuccess
   * @description State that stores success message after a successful restore
   */
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  const [diffLoading, setDiffLoading] = useState(true);
  const [noteDiff, setNoteDiff] = useState<NoteDiff | null>(null);

  /**
   * @function parseTrackChanges
   * @description Parses track changes from the commit body string
   *
   * @param {string} body - The commit body text containing track changes JSON
   * @returns {TrackChanges | null} Parsed track changes or null if not available
   */
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

  /**
   * @function renderTrackChanges
   * @description Renders UI elements showing track changes for a version
   *
   * @param {Version} version - The version object containing track changes
   * @returns {JSX.Element | null} Track changes UI or null if no changes
   */
  const renderTrackChanges = (version: Version) => {
    const trackChanges = parseTrackChanges(version.body);

    if (!trackChanges) return null;

    const hasChanges =
      trackChanges.added.length > 0 ||
      trackChanges.modified.length > 0 ||
      trackChanges.removed.length > 0;

    if (!hasChanges) return null;

    return (
      <div className="version-tracks">
        {trackChanges.added.length > 0 && (
          <div className="track-changes-section">
            <h4>
              <FaPlus className="change-icon added" /> Added (
              {trackChanges.added.length})
            </h4>
            <div className="tracks-timeline">
              {trackChanges.added.map((track) => (
                <div key={track.id} className="track-change">
                  <div className="track-info">
                    <div className="track-name">{track.name}</div>
                  </div>
                  <div
                    className={`track-type ${track.type.toLowerCase().includes("midi") ? "midi" : "audio"}`}
                  >
                    {track.type.toLowerCase().includes("midi")
                      ? "MIDI"
                      : "AUDIO"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {trackChanges.modified.length > 0 && (
          <div className="track-changes-section">
            <h4>
              <FaEdit className="change-icon modified" /> Modified (
              {trackChanges.modified.length})
            </h4>
            <div className="tracks-timeline">
              {trackChanges.modified.map((track) => (
                <div key={track.id} className="track-change">
                  <div className="track-info">
                    <div className="track-name">{track.name}</div>
                  </div>
                  <div
                    className={`track-type ${track.type.toLowerCase().includes("midi") ? "midi" : "audio"}`}
                  >
                    {track.type.toLowerCase().includes("midi")
                      ? "MIDI"
                      : "AUDIO"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {trackChanges.removed.length > 0 && (
          <div className="track-changes-section">
            <h4>
              <FaMinus className="change-icon deleted" /> Removed (
              {trackChanges.removed.length})
            </h4>
            <div className="tracks-timeline">
              {trackChanges.removed.map((track) => (
                <div key={track.id} className="track-change">
                  <div className="track-info">
                    <div className="track-name">{track.name}</div>
                  </div>
                  <div
                    className={`track-type ${track.type.toLowerCase().includes("midi") ? "midi" : "audio"}`}
                  >
                    {track.type.toLowerCase().includes("midi")
                      ? "MIDI"
                      : "AUDIO"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * @function getPlaceholderFileChanges
   * @description Generates placeholder file changes for display purposes
   *
   * @param {string} hash - Version hash used for deterministic generation
   * @param {number} index - Version index in the history
   * @returns {FileChange[]} Array of file changes
   */
  const getPlaceholderFileChanges = (
    hash: string,
    index: number,
  ): FileChange[] => {
    // Generate some placeholder file changes based on hash and index for variety
    const changes: FileChange[] = [];
    const fileTypes = ["als", "wav", "json"];
    const changeTypes = ["added", "modified", "deleted"];

    // Add 1-3 file changes per version
    const numChanges = 1 + (hash.charCodeAt(0) % 3);

    for (let i = 0; i < numChanges; i++) {
      const fileType = fileTypes[hash.charCodeAt(i) % fileTypes.length];
      const changeType =
        i === 0 && index === 0
          ? "added" // First version always adds files
          : changeTypes[hash.charCodeAt(i + 2) % changeTypes.length];

      changes.push({
        name: `project_${index + 1}${i > 0 ? `_${i}` : ""}.${fileType}`,
        type: changeType,
        fileType,
      });
    }

    return changes;
  };

  
  const [expandedVersions, setExpandedVersions] = useState<string[]>([]);
  const [allExpanded, setAllExpanded] = useState<boolean>(true);

  // Toggle function for individual version expansion
  const toggleVersionExpand = (hash: string) => {
    if (expandedVersions.includes(hash)) {
      setExpandedVersions(expandedVersions.filter(v => v !== hash));
    } else {
      setExpandedVersions([...expandedVersions, hash]);
    }
  };

  // Toggle all versions expanded/collapsed
  const toggleAllExpand = () => {
    if (allExpanded) {
      setExpandedVersions([]);
    } else {
      setExpandedVersions(history?.history.all.map(v => v.hash) || []);
    }
    setAllExpanded(!allExpanded);
  };

  // Initialize expanded versions on data load
  useEffect(() => {
    if (history?.history.all) {
      // Default to showing all expanded
      setExpandedVersions(history.history.all.map(v => v.hash));
      setAllExpanded(true);
    }
  }, [history]);



  /**
   * @hook useEffect
   * @description Effect hook that fetches project history data when the component mounts
   *
   * @dependency id - Project ID from URL parameters
   * @dependency user - Current authenticated user
   */
  useEffect(() => {
    if (user && id) {
      setLoading(true);
      axios
        .get(`http://localhost:3333/api/history/all/${user.username}/${id}`, {
          withCredentials: true,
        })
        .then((response) => {
          console.log("RESPONSE: ", response);
          setHistory(response.data);

          if (response.data.history.all.length > 0) {
            const commits = response.data.history.all;
            const oldestCommit = commits[commits.length - 1]; // Get the last item (oldest commit)
            setProjectOwner(oldestCommit.author_name);
          }

          const userId = response.data.userId;
          const projectId = response.data.projectId;
          const commitHash = response.data.history.latest.hash;

          console.log("Calling diff API with:", {
            userId,
            projectId,
            commitHash,
          });

          axios
            .get(
              `http://localhost:3333/api/history/diff/${userId}/${projectId}/${commitHash}`,
              {
                withCredentials: true,
              },
            )
            .then((diffRes) => {
              const diffData = diffRes.data.diff;
              console.log("diffdata: ", diffData);
              const transformed = transformDiffEngineOutput(
                diffData,
                "My Track",
              );
              setNoteDiff(transformed);
              setDiffLoading(false);
            })
            .catch((err) => {
              console.error("Error fetching diff data:", err);
              setDiffLoading(false);
            });

          setError(null);
        })
        .catch((error) => {
          console.error("Error fetching version history:", error);
          setError("Failed to load version history.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, user]);

  /**
   * @function formatDate
   * @description Formats a date string into a user-friendly format
   *
   * @param {string} dateString - ISO date string to format
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  /**
   * @function getVersionNumber
   * @description Generates a user-friendly version number based on index and total count
   *
   * @param {number} index - Index of the version in the array
   * @param {number} total - Total number of versions
   * @returns {string} Version number in format "vX"
   */
  const getVersionNumber = (index: number, total: number) => {
    // Show versions in reverse order (newest first)
    return `v${total - index}`;
  };

  /**
   * @function handleRevert
   * @description Handles the restoration of a project to a previous version
   *
   * @param {string} versionHash - Hash of the version to restore
   * @param {string} versionNumber - User-friendly version number for display
   * @returns {Promise<void>}
   */
  const handleRevert = async (versionHash: string, versionNumber: string) => {
    // Show confirmation dialog
    const confirmRestore = window.confirm(
      `Are you sure you want to restore to version ${versionNumber}? This will create a new version with these files as the current state.`,
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
          message: `Restored to ${versionNumber}`,
        },
        {
          withCredentials: true,
          timeout: 60000, // 60 seconds timeout for potentially large operations
        },
      );

      // Handle success
      setRestoreSuccess(
        `Successfully restored to ${versionNumber}. A new version has been created.`,
      );

      // Refresh history data after a short delay
      setTimeout(() => {
        // Refetch history to show the new restoration commit
        axios
          .get(
            `http://localhost:3333/api/history/all/${user?.username}/${id}`,
            {
              withCredentials: true,
            },
          )
          .then((response) => {
            setHistory(response.data);

            if (response.data.history.all.length > 0) {
              const commits = response.data.history.all;
              const oldestCommit = commits[commits.length - 1];
              setProjectOwner(oldestCommit.author_name);
            }
          })
          .catch((error) => {
            console.error("Error refreshing history:", error);
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

  /**
   * @function handleDownload
   * @description Initiates download of files from a specific version
   *
   * @param {Version} version - Version object containing file information
   * @returns {Promise<void>}
   */
  const handleDownload = async (version: Version) => {
    try {
      // Show loading indicator or disable button during download
      const downloadButton = document.getElementById(
        `download-${version.hash}`,
      ) as HTMLButtonElement;
      if (downloadButton) {
        downloadButton.disabled = true;
        downloadButton.innerHTML = '<span class="spinner-small"></span>';
      }

      // Make request to download files - the API will return a zip file
      const response = await axios.get(
        `http://localhost:3333/api/history/${user?.username}/${id}/${version.hash}`,
        {
          withCredentials: true,
          responseType: "blob", // Important: we need the response as a blob
        },
      );

      // Create a download link and trigger it
      const downloadUrl = URL.createObjectURL(response.data);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;

      // Set the filename to something meaningful
      const filename = `project-${id}-v${version.hash.substring(0, 7)}.zip`;
      downloadLink.setAttribute("download", filename);

      // Append to body, trigger click and remove
      document.body.appendChild(downloadLink);
      downloadLink.click();

      // Clean up
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadUrl);

      // Reset button state
      if (downloadButton) {
        downloadButton.disabled = false;
        downloadButton.innerHTML =
          '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M216 0h80c13.3 0 24 10.7 24 24v168h87.7c17.8 0 26.7 21.5 14.1 34.1L269.7 378.3c-7.5 7.5-19.8 7.5-27.3 0L90.1 226.1c-12.6-12.6-3.7-34.1 14.1-34.1H192V24c0-13.3 10.7-24 24-24zm296 376v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h146.7l49 49c20.1 20.1 52.5 20.1 72.6 0l49-49H488c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z"></path></svg> Download Files';
      }
    } catch (error) {
      console.error("Error downloading version:", error);

      // Show error notification
      alert("Failed to download the files. Please try again.");

      // Reset button state
      const downloadButton = document.getElementById(
        `download-${version.hash}`,
      ) as HTMLButtonElement;
      if (downloadButton) {
        downloadButton.disabled = false;
        downloadButton.innerHTML =
          '<svg class="svg-inline--fa fa-download" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="download" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zM432 456c-13.3 0-24-10.7-24-24s10.7-24 24-24s24 10.7 24 24s-10.7 24-24 24z"></path></svg> Download Files';
      }
    }
  };

  /**
   * @function getFileIcon
   * @description Returns the appropriate icon component based on file type
   *
   * @param {string} fileType - Type/extension of the file
   * @returns {JSX.Element} Icon component for the file type
   */
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "als":
        return <FaFileCode />;
      case "wav":
        return <FaFileAudio />;
      default:
        return <FaFileAlt />;
    }
  };

  /**
   * @function getChangeIcon
   * @description Returns the appropriate icon component based on change type
   *
   * @param {string} changeType - Type of change (added, deleted, modified)
   * @returns {JSX.Element} Icon component for the change type
   */
  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case "added":
        return <FaPlus className="change-icon added" />;
      case "deleted":
        return <FaMinus className="change-icon deleted" />;
      default: // modified
        return <FaEdit className="change-icon modified" />;
    }
  };

  // Conditional rendering based on loading and error states
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

  // Main component render
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
        <div className="history-header-controls">
          <button 
            className="toggle-expand-btn"
            onClick={toggleAllExpand}
          >
            {allExpanded ? 
              <><FaAngleUp className="btn-icon" /> Collapse All</> : 
              <><FaAngleDown className="btn-icon" /> Expand All</>
            }
          </button>
        </div>
      </div>

      <div className="history-description">
        <p>
          Each time you save your project, a new version is created. You can
          revert to any previous version or download files from past versions.
        </p>
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
          const prevVersion = index === history.history.all.length - 1 ?
            null
            : history.history.all[index + 1];
          const isExpanded = expandedVersions.includes(version.hash);

          const userId = version.body.match(/User-ID: (.+)$/s)?.[1].substring(0, version.body.match(/User-ID: (.+)$/s)?.[1].indexOf("\n") || 0).trim();
        




          return (
            <motion.div
              key={version.hash}
              
              className={`version-card ${isExpanded ? 'expanded' : 'collapsed'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.01 }}
            >
              <div className="version-card-header">
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
                <button 
                  className="version-expand-toggle"
                  onClick={() => toggleVersionExpand(version.hash)}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>

              <motion.div 
                className="version-card-content"
                initial={false}
                animate={{ 
                  height: isExpanded ? 'auto' : 0,
                  opacity: isExpanded ? 1 : 0,
                  marginTop: isExpanded ? '15px' : '0px'
                }}
                transition={{ duration: 0, ease: "easeInOut" }}
                style={{ overflow: 'hidden' }}>

              <div className="version-details">
                <div className="version-author">
                  {userId ? (
                    <img
                      src={`https://avatars.githubusercontent.com/u/${userId}?v=4`}
                      alt="User Avatar"
                      className="version-avatar"
                    />
                  ) : (
                    <FaUser className="version-icon" />
                  )}
                  <span>{version.author_name}</span>
                </div>

                <div
                  className={`version-type ${isCollaborator ? "collaborator" : version.message.toLowerCase().includes("restored to") || version.message.toLowerCase().includes("reverted to") ? "restored" : "update"}`}
                >
                  {isCollaborator ? (
                    <FaUserFriends className="version-icon" />
                  ) : version.message.toLowerCase().includes("restored to") ||
                    version.message.toLowerCase().includes("reverted to") ? (
                    <FaHistory className="version-icon" />
                  ) : (
                    <FaMusic className="version-icon" />
                  )}
                  <span>
                    {isCollaborator
                      ? "Collaborator Update"
                      : version.message.toLowerCase().includes("restored to") ||
                          version.message.toLowerCase().includes("reverted to")
                        ? "Restoration"
                        : "Project Update"}
                  </span>
                  
                </div>

                <Tooltip
                  content="View detailed changes between this version and the previous one"
                  className="view-diff-tooltip"
                  position="left"
                  delay={200}
                  style={{ marginLeft: 'auto' }} // Align to the right
                  >
                <button 
  className="version-btn view-diff-btn"
  onClick={() => window.location.href = `/project/${id}/diff/${version.hash}/${prevVersion?.hash}`}
  style={{ marginLeft: 'auto' }} // Align to the right
>
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: "0px" }}>
    {/* Central connector with glow effect */}
    <path d="M12 4v16" stroke="url(#purpleGlow)" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1 1.5" />

    {/* Added elements (green) */}
    <circle cx="8" cy="8" r="3" fill="url(#greenGradient)" />
    <circle cx="8" cy="16" r="3" fill="url(#greenGradient)" />
    
    {/* Removed element (red) */}
    <circle cx="16" cy="8" r="3" fill="url(#redGradient)" />
    
    {/* Modified element (purple-orange) */}
    <circle cx="16" cy="16" r="3" fill="url(#diffGradient)" />
    
    {/* Define gradients with better color transitions */}
    <defs>
      <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#43A047" />
        <stop offset="100%" stopColor="#66BB6A" />
      </linearGradient>
      
      <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E53935" />
        <stop offset="100%" stopColor="#EF5350" />
      </linearGradient>
      
      <linearGradient id="diffGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9C27B0" />
        <stop offset="100%" stopColor="#FF9800" />
      </linearGradient>
      
      <linearGradient id="purpleGlow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#9C27B0" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#9300D7" />
        <stop offset="100%" stopColor="#9C27B0" stopOpacity="0.8" />
      </linearGradient>
    </defs>
  </svg>
  View Detailed Changes
                </button>
                </Tooltip>
              </div>

              {/* File changes section */}
              {/* Track changes section */}

              {renderTrackChanges(version) || (
                <div className="version-tracks">
                  <h4>Track Changes</h4>
                  <div className="track-changes-empty">
                    <FaMusic className="empty-tracks-icon" />
                    <p>
                      No track changes information available for this version.
                    </p>
                  </div>
                </div>
              )}
              {/* {version.body && (
                <div className="version-body">
                  {version.body}
                </div>
              )} */}

              <div className="version-actions">
                {
                  // Only show restore button if the user is the project owner
                  user?.username === projectOwner &&
                    index !== 0 && // Don't allow restoring the latest version
                    !version.message.toLowerCase().includes("restored to") &&
                    !version.message.toLowerCase().includes("reverted to") && (
                      <button
                        className={`version-btn revert-btn ${restoring && restoringVersion === version.hash ? "restoring" : ""}`}
                        onClick={() =>
                          handleRevert(
                            version.hash,
                            getVersionNumber(index, history.history.total),
                          )
                        }
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
                    )
                }
                <button
                  id={`download-${version.hash}`}
                  className="version-btn download-btn"
                  onClick={() => handleDownload(version)}
                  title="Download this version's files"
                >
                  <FaDownload /> Download Files
                </button>
                

              </div>
              {/* <div>
                <VisualDiffTimeline
                  projectId={id}
                  commitHash={version.hash}
                  width={800}
                  height={300}
                />
              </div> */}
            </motion.div>
            </motion.div>
          );
        })}

        {(!history?.history.all || history.history.all.length === 0) && (
          <div className="no-versions">
            <FaMusic className="empty-icon" />
            <p>No versions found for this project.</p>
            <p className="empty-subtitle">
              When you upload updates to your project, they'll appear here.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default History;
