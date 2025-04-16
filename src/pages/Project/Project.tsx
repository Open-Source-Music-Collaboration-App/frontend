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
import { FaShareAlt, FaFolderOpen, FaMusic, FaFileUpload, FaTag, FaStar, FaCodeBranch, FaHistory, FaMagic } from 'react-icons/fa';
// Add JSZip for handling ZIP files
import JSZip from 'jszip';
import { ProjectProvider } from "../../context/ProjectContext";
import FirstTimeProjectGuide from "../../components/FirstTimeProjectGuide/FirstTimeProjectGuide";
import DiffPreview from "../../components/DiffPreview/DiffPreview";

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
  const [showDiffPreview, setShowDiffPreview] = useState<boolean>(false); // State to control visibility of the preview
  const [diffPreview, setDiffPreview] = useState<any>(null); // State for storing the diff preview data
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false); // Loading state for preview generation
  const [previewError, setPreviewError] = useState<string | null>(null); // Error state for preview generation
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setDiffPreview(null); // Reset previous preview data
    setShowDiffPreview(false); // Hide preview area
    setPreviewError(null); // Clear previous errors
    setSelectedFiles([]); // Clear displayed file list initially

    if (files && files.length > 0 && id) { // Ensure projectId (id) is available
      const fileListForDisplay = [];
      let alsFile: File | null = null;

      // Iterate through selected files to prepare display list and find the ALS file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Use webkitRelativePath for folder structure display, fallback to name
        const displayName = (file as any).webkitRelativePath || file.name;

        // Basic filtering for display (adjust as needed)
         if (!displayName.includes("Backup")) { // Example filter
             fileListForDisplay.push({
                name: displayName,
                type: file.name.split('.').pop()?.toLowerCase() || "unknown",
                size: file.size
             });

             // Identify the ALS file for the preview request
             if (file.name.toLowerCase().endsWith(".als")) {
                if (!alsFile) { // Take the first ALS file found
                   alsFile = file;
                   console.log("Found ALS file for preview:", file.name);
                } else {
                   console.warn("Multiple ALS files found, using the first one for preview:", alsFile.name);
                }
             }
         }
      }
      setSelectedFiles(fileListForDisplay); // Update the UI list of selected files

      // --- Trigger Preview Request if ALS file is found ---
      if (alsFile) {
        setIsPreviewLoading(true); // Show loading indicator
        setPreviewError(null); // Clear previous errors
        const formData = new FormData();
        // Key 'alsFile' must match the backend multer setup: previewUpload.single('alsFile')
        formData.append('alsFile', alsFile, alsFile.name);

        try {
          console.log(`Sending preview request for project ${id}...`);
          const response = await axios.post(`http://${window.location.hostname}:3333/api/projects/preview-diff/${id}`, formData, {
            withCredentials: true, // Send cookies if needed for auth
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000 // Set a reasonable timeout (e.g., 60 seconds) for parsing
          });

          console.log("Preview response received:", response.data);
          setDiffPreview(response.data.diff); // Store the diff data from the response
          if (response.data.isFirstCommitPreview) {
             // Handle the case where it's the first upload - show a specific message
             setPreviewError("A preview of your changes is not available for the first commit.");2
          } else if (!response.data.diff) {
             // Handle case where diff is null/empty but not explicitly the first commit
             setPreviewError("No changes detected or preview data is empty.");
          }
          setShowDiffPreview(true); // Make the preview component visible
        } catch (error: any) {
          console.error("Error fetching preview diff:", error);
          // Display a user-friendly error message
          const errorMsg = error.response?.data?.message || error.message || "An unknown error occurred";
          setPreviewError(`Failed to generate preview: ${errorMsg}`);
          setShowDiffPreview(true); // Show the preview area to display the error
        } finally {
          setIsPreviewLoading(false); // Hide loading indicator
        }
      } else {
         // No ALS file was found in the selection
         console.log("No .als file found in the selection. Cannot generate preview.");
         setPreviewError("No .als file found in the selected items. Upload an Ableton project file to see a preview.");
         setShowDiffPreview(true); // Show the area to display this message
      }
      // --- End Trigger Preview Request ---

    } else {
       // Handle case where file selection is cleared or projectId is missing
       if (!id) console.error("Project ID is missing, cannot trigger preview.");
       setShowDiffPreview(false); // Hide preview if selection is cleared
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
    setUploadSuccess(false);
    setUploadProgress(0);
    
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

      formData.append("projectId", id);
      formData.append("userId", user.username);
      formData.append("commitMessage", commitMessage);

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

      setShowDiffPreview(false); // Hide preview area
      setDiffPreview(null);
      setSelectedFiles([]); // Clear displayed file list
      setCommitMessage(""); // Clear commit message input
      if(fileInputRef.current) fileInputRef.current.value = ""; // Clear the actual file input
      
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

  const handleGenerateCommitMessage = async () => {
    if (!diffPreview || isGeneratingMessage) {
      // Optionally show an error if no diff data is available
      console.warn("Cannot generate message: No diff data available or generation already in progress.");
      return;
    }

    setIsGeneratingMessage(true);
    try {
      // *** Replace with your actual API endpoint and expected payload structure ***
      // Assuming the backend expects the diff summary object
      const response = await axios.post('http://localhost:3333/api/ai/generate-commit-message', {
         diffSummary: diffPreview // Or potentially diffPreview.summary or a specific text field if available
         // Add any generation options if your backend supports them
      });

      if (response.data && response.data.commitMessage) {
        setCommitMessage(response.data.commitMessage);
      } else {
         // Handle cases where the response might be unexpected
         console.error("Failed to get commit message from response:", response.data);
         // Optionally set an error state or show a notification
      }
    } catch (error) {
      console.error("Error generating commit message:", error);
      // Optionally set an error state or show a notification to the user
      // e.g., setGenerationError("Failed to generate message.");
    } finally {
      setIsGeneratingMessage(false);
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
    <ProjectProvider>
      
    <motion.div 
      className="project-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <FirstTimeProjectGuide />

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
            <h4><FaMusic className="selected-files-icon" /> Selected Items ({selectedFiles.length})</h4>
            <div className="files-list">
              {/* ... map selectedFiles for display ... */}
               {selectedFiles.map((file, index) => (
                 <div key={index} className="file-item">
                   <span className={`file-type ${file.type}`}>{file.type}</span>
                   <span className="file-name">{file.name}</span>
                   <span className="file-size">{Math.round(file.size / 1024)} KB</span>
                 </div>
               ))}
            </div>

            {/* --- Diff Preview Section --- */}
            {isPreviewLoading && (
              <div className="preview-loading">
                <div className="spinner small"></div> Generating preview... (this may take a moment)
              </div>
            )}
            {/* Use the DiffPreview component (ensure it handles error prop) */}
            <DiffPreview
               diffData={diffPreview}
               isVisible={showDiffPreview && !isPreviewLoading}
               isFirstCommitPreview={previewError === "A preview of your changes is not available for the first commit."}
               error={previewError} // Pass the error state
            />
             {/* --- End Diff Preview Section --- */}

          </div>
        )}
        {selectedFiles.length > 0 && ( // Show only if files are selected
        <div className="commit-section">

            <div className="commit-message-container">
              <div className="commit-label-container"> {/* Added a wrapper for label and button */}
                <label htmlFor="commit-message">
                  <FaTag className="commit-label-icon" />
                  Version Description
                </label>
                <Tooltip content="Generate message using AI" position="top">
                  <button
                    type="button"
                    className="generate-commit-btn"
                    onClick={handleGenerateCommitMessage}
                    disabled={!diffPreview || isGeneratingMessage || isPreviewLoading} // Disable if no diff, generating, or preview is loading
                    title="Generate commit message based on changes"
                  >
                    {isGeneratingMessage ? (
                      <span className="spinner-small"></span>
                    ) : (
                      <FaMagic />
                    )}
                  </button>
                </Tooltip>
              </div>
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
          )}
          </div>
        </div>
      </div>
    </motion.div>
    </ProjectProvider>
  );
}

export default Project;