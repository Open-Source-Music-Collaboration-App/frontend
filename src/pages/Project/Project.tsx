import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthProvider";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Project.css";
import { motion } from "framer-motion";
import ALSView from "../../components/ALSView/ALSView";
import HoverInfo from '../../components/HoverInfo/HoverInfo';
import Tooltip from '../../components/Tooltip/Tooltip';
import { FaShareAlt, FaFolderOpen, FaMusic, FaFileUpload, FaTag, FaStar, FaCodeBranch, FaHistory } from 'react-icons/fa';
// Add JSZip for handling ZIP files
import JSZip from 'jszip';

function Project() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [projectData, setProjectData] = useState<any>(null);
  const [trackFiles, setTrackFiles] = useState<{[key: string]: string}>({});
  const [alsFile, setAlsFile] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState<string | false>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<{ name: string, type: string, size: number }[]>([]);
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [dataReady, setDataReady] = useState<boolean>(false);
  const [isEmptyRepo, setIsEmptyRepo] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [numCommits, setNumCommits] = useState<number>(0);
  const maxRetries = 3;

  useEffect(() => {
    const fetchProject = async () => {
      try {
        // Step 1: Fetch project metadata
        console.log("Fetching project data for project ID:", id);
        const metadataResponse = await axios.get(`http://${window.location.hostname}:3333/api/projects/${id}`, { 
          withCredentials: true,
          timeout: 10000 // 10 seconds timeout
        });
        console.log("Project metadata:", metadataResponse.data);
        setProject(metadataResponse.data);
        
        if (!metadataResponse.data || !user) {
          throw new Error("Project not found or not authorized");
        }


        // fetch all commits for the project
        const commitsRes = await axios.get(`http://${window.location.hostname}:3333/api/history/all/${user.username}/${id}`, {
          withCredentials: true,
          timeout: 10000
        });

        if(commitsRes.status !== 204)
          setNumCommits(commitsRes.data.history.total);
      
        
        
      

        // Step 2: Fetch project content as ZIP
        try {
          console.log("Fetching project content for project ID:", id);
          const contentResponse = await axios.get(
            `http://${window.location.hostname}:3333/api/history/latest/${user.username}/${id}`, 
            { 
              withCredentials: true,
              responseType: 'blob', // Important: we need to get the response as a blob
              timeout: 3000000, // 30 seconds timeout for potentially large files
              validateStatus: (status) => {
                console.log("Response status:", status);
                return status === 200 || status === 204; // Accept both success and no-content
              }
            }
          );

          console.log("Project content loaded:", contentResponse);
          
          
          // Handle empty repository case (status 204)
          if (contentResponse.status === 204) {
            console.log("Repository is empty, no content to display yet");
            setIsEmptyRepo(true);
            setLoading(false);
            return;
          }

          // Step 3: Process the ZIP file
          const zip = new JSZip();
          
          const zipContent = await zip.loadAsync(contentResponse.data);
          
          // Extract ableton_project.json
          const projectJsonFile = zipContent.file("ableton_project.json");
          if (projectJsonFile) {
            const jsonContent = await projectJsonFile.async("string");
            const parsedData = JSON.parse(jsonContent);
            setProjectData(parsedData);
            console.log("Project data loaded:", parsedData);
          }
          
          // Find and extract .als file
          const alsFiles = Object.keys(zipContent.files).filter(filename => 
            filename.endsWith('.als') && !zipContent.files[filename].dir
          );
          
          if (alsFiles.length > 0) {
            const alsContent = await zipContent.file(alsFiles[0])?.async("blob");
            if (alsContent) {
              const alsUrl = URL.createObjectURL(alsContent);
              setAlsFile(alsUrl);
              console.log("ALS file loaded:", alsFiles[0]);
            }
          }
          
          // Extract all flac audio files
          const audioFiles = {};
          const audioPromises = Object.keys(zipContent.files)
            .filter(filename => filename.startsWith('tracks/') && filename.endsWith('.flac'))
            .map(async (filename) => {
              const audioContent = await zipContent.file(filename)?.async("blob");
              if (audioContent) {
                const audioUrl = URL.createObjectURL(audioContent);
                const trackName = filename.replace('tracks/', '');
                audioFiles[trackName] = audioUrl;
                console.log(`Audio file loaded: ${filename}`);
              }
            });
          
          await Promise.all(audioPromises);
          setTrackFiles(audioFiles);
          setDataReady(true);
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 204) {
            console.log("Repository is empty, no content to display yet");
            setIsEmptyRepo(true);
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error("Error loading project:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user && id) {
      fetchProject();
    }
    
    // Clean up object URLs when component unmounts
    return () => {
      if (alsFile) URL.revokeObjectURL(alsFile);
      Object.values(trackFiles).forEach(url => URL.revokeObjectURL(url));
    };
  }, [id, user, navigate, retryCount]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileList = [];
      for (let i = 0; i < files.length; i++) {
        if (!files[i].webkitRelativePath.includes("Backup") && 
            (files[i].name.endsWith(".json") || 
             files[i].name.endsWith(".wav") || 
             files[i].name.endsWith(".als") ||
             files[i].name.endsWith(".flac"))) {
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
             files[i].name.endsWith(".als") ||
             files[i].name.endsWith(".flac"))) {
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
      const response = await axios.post(`http://${window.location.hostname}:3333/api/upload`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          );
          setUploadProgress(percentCompleted);
        },
        timeout: 60000 // 60 seconds timeout for uploads
      });

      console.log("Upload successful:", response.data);
      setUploadSuccess("Project files uploaded successfully!");
      
      // Clear form and show success message briefly, then refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 2000);
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
        <p>Loading project data...</p>
        {retryCount > 0 && <p>Retry attempt {retryCount}/{maxRetries}...</p>}
      </div>
    );
  }

  return (
    <motion.div 
      className="project-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
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
                    {/* <HoverInfo
                      title="Version History"
                      description="See all previous versions of this project, compare changes, and restore older versions if needed."
                      position="bottom"
                    /> */}
                  </button>
                <button className="project-share-btn" aria-label="Share project">
                  <FaShareAlt />
                </button>
                <div className="share-tooltip">
                  <div className="copy-link" style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={window.location.href} 
                      readOnly 
                      className="share-link" 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}
                    />
                    <button className="btn-outline copy-btn" onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert("Link copied to clipboard!");
                    }}
                      style={{ marginLeft: '0.5rem', backgroundColor: '#fff2', color: '#fff', padding: '0.5rem', borderRadius: '4px' }}
                    >
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
                {/* <div className="stat-item">
                  <FaCodeBranch />
                  <span>0</span>
                </div> */}
                <div className="stat-item pointer" onClick={() => navigate(`/project/${id}/history`)}>
                  <FaHistory />
                  <span>{numCommits} Versions</span>
                  <HoverInfo
                    title="Project Versions"
                    description="This number shows how many saved versions exist for this project."
                    position="top"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="project-content">
        <div className="project-preview">
            <div className="preview-container">
              {isEmptyRepo ? (
                <div className="empty-project-notice">
                  <FaMusic className="empty-project-icon" />
                  <h3>This project is empty</h3>
                  <p>Upload your first Ableton project files to get started.</p>
                </div>
              ) : dataReady && projectData ? (
                <ALSView 
                  projectData={projectData} 
                  trackFiles={trackFiles}
                />
              ) : (
                <div className="loading-project-data">
                  <div className="spinner"></div>
                  <p>Loading project data...</p>
                </div>
              )}
            </div>
          </div>
        
        {/* Project Upload and Collaboration - Now in the same row */}
        <div className="project-actions">
          <div className="upload-card">
            <h3 className="section-title">
              <FaFolderOpen className="section-icon" />
              {isEmptyRepo ? "Create Project" : "Update Project"}
            </h3>
            
            {error && <div className="error-message">{error}</div>}
            {uploadSuccess && <div className="success-message">{uploadSuccess}</div>}
            
            <div className="file-input-wrapper">
              <label htmlFor="file-upload" className="file-input-label">
                <FaMusic className="file-input-icon" />
                <div className="file-input-text">Drag project folder here or click to browse</div>
                <div className="file-input-subtext">Upload project folder which includes .als and audio files (.wav or .flac)</div>
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
                  {isEmptyRepo ? "Create Project" : "Upload Project"}
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