import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthProvider";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Project.css";
import { motion } from "framer-motion";
import ALSView from "../../components/ALSView/ALSView";
// Add this near the top of your file in the imports section:
import { FaShareAlt, FaFolderOpen, FaMusic, FaFileUpload, FaTag, FaStar, FaCodeBranch, FaHistory } from 'react-icons/fa';

import projectData from "../../assets/sample_ableton_project.json";

function Project() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<{ name: string, type: string }[]>([]);
  const [commitMessage, setCommitMessage] = useState<string>("");

  useEffect(() => {
    axios.get(`http://localhost:3333/api/projects/${id}`, { withCredentials: true })
      .then(response => {
        console.log("Project data:", response.data);
        setProject(response.data);
      })
      .catch(error => {
        console.error("Error fetching project:", error);
        setError("Project not found or you don't have permission to access it.");
        setTimeout(() => navigate("/dashboard"), 3000);
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (!user) {
    navigate("/login");
    return <div>Redirecting to login...</div>;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileList = [];
      for (let i = 0; i < files.length; i++) {
        if (!files[i].webkitRelativePath.includes("Backup") && 
            (files[i].name.endsWith(".json") || 
             files[i].name.endsWith(".wav") || 
             files[i].name.endsWith(".als"))) {
          fileList.push({
            name: files[i].webkitRelativePath,
            type: files[i].name.split('.').pop() || "",
            size: files[i].size
          });
        }
      }
      setSelectedFiles(fileList);
    }
  };

  const handleUpload = async () => {
    const formData = new FormData();
    const fileInput = fileInputRef.current;
    const files = fileInput?.files;

    if (!files || files.length === 0) {
      setError("Please select files to upload");
      return;
    }

    if (!commitMessage) {
      setError("Please enter a commit message");
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      // Add files to FormData
      for (let i = 0; i < files.length; i++) {
        if (!files[i].webkitRelativePath.includes("Backup") && 
            (files[i].name.endsWith(".wav") || 
             files[i].name.endsWith(".als"))) {
          formData.append("files", files[i]);
        }
      }

      // Add JSON metadata as a Blob
      const jsonBlob = new Blob([JSON.stringify({
        projectId: id,
        userId: user.username,
        commitMessage: commitMessage,
      })], { type: "application/json" });
      
      formData.append("jsonData", jsonBlob);

      // Upload with progress tracking
      const response = await axios.post("http://localhost:3333/api/upload", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          );
          setUploadProgress(percentCompleted);
        }
      });

      console.log("Upload successful:", response.data);
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setCommitMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error uploading files:", error);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="project-loading">
        <div className="spinner"></div>
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="project-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="project-header-section">
  <div className="project-abstract">
    <img 
      src={project && `https://avatars.githubusercontent.com/u/${project[0].user_id}?v=4`}
      alt="GitHub Avatar" 
      className="profile-picture" 
    />
    <div className="project-title-container">
      <div className="project-title-row">
        <h2 className="project-title">{project ? project[0].title : ""}</h2>
        <div style={{ position: 'relative', display: 'flex', flexWrap: "nowrap" }}>
            <button 
              className="project-action-btn history-btn" 
              onClick={() => navigate(`/project/${id}/history`)}
            >
              <FaHistory className="btn-icon" />
              <span>View Version History</span>
            </button>
          <button className="project-share-btn" aria-label="Share project">
            <FaShareAlt />
          </button>
          <div className="share-tooltip">
            <div className="copy-link">
              <input 
                type="text" 
                value={window.location.href} 
                readOnly 
                className="share-link" 
              />
              <button className="btn-outline copy-btn" onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard!");
              }}>
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="project-metadata">
        <span className="project-visibility public">Public</span>
        <div className="project-stats">
          <div className="stat-item">
            <FaStar />
            <span>0</span>
          </div>
          <div className="stat-item">
            <FaCodeBranch />
            <span>0</span>
          </div>
          <div className="stat-item">
            <FaHistory />
            <span>1 commit</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

      <div className="project-content">
        {/* Project Preview - Now first */}
        <div className="project-preview">
          
          <div className="preview-container">
            <ALSView projectData={projectData} />
          </div>
        </div>
        
        {/* Project Upload and Collaboration - Now in the same row */}
        <div className="project-actions">
  <div className="upload-card">
    <h3 className="section-title">
      <FaFolderOpen className="section-icon" />
      Update Project
    </h3>
    
    {error && <div className="error-message">{error}</div>}
    {uploadSuccess && <div className="success-message">{uploadSuccess}</div>}
    
    <div className="file-input-wrapper">
      <label htmlFor="file-upload" className="file-input-label">
        <FaMusic className="file-input-icon" />
        <div className="file-input-text">Drag project folder here or click to browse</div>
        <div className="file-input-subtext">Upload project folder which includes .als and .wav files</div>
      </label>
      <input
        id="file-upload"
        type="file"
        className="upload-input"
        ref={fileInputRef}
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={handleFileChange}
        disabled={uploading}
      />
    </div>
    
    {selectedFiles.length > 0 && (
      <div className="selected-files">
        <h4><FaMusic className="selected-files-icon" /> Selected Files</h4>
        <div className="files-list">
          {selectedFiles.map((file, index) => (
            <div key={index} className="file-item">
              <span className={`file-type ${file.type}`}>{file.type}</span>
              <span className="file-name">{file.name}</span>
              <span className="file-size">{Math.round(file.size / 1024)} KB</span>
            </div>
          ))}
          {/* {selectedFiles.length > 5 && (
            <div className="file-item more-files">
              +{selectedFiles.length - 5} more files
            </div>
          )} */
          }
        </div>
      </div>
    )}
    
    <div className="commit-message-container">
      <label htmlFor="commit-message">
        <FaTag className="commit-label-icon" />
        Version Description
      </label>
      <input
        id="commit-message"
        type="text"
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        placeholder="Describe this version (e.g. 'Added drum track')"
        disabled={uploading}
      />
    </div>
    
    <button 
      className={`upload-btn ${uploading ? 'uploading' : ''} ${!selectedFiles.length ? 'disabled' : ''}`}
      onClick={handleUpload}
      disabled={uploading || !selectedFiles.length || !commitMessage}
    >
      {uploading ? 'Uploading...' : (
        <>
          <FaFileUpload className="upload-icon" />
          Upload Project
        </>
      )}
    </button>
    
    {uploading && (
      <div className="upload-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
        </div>
        <span className="progress-percentage">{uploadProgress}%</span>
      </div>
    )}
  </div>
</div>
      </div>
    </motion.div>
  );
}

export default Project;