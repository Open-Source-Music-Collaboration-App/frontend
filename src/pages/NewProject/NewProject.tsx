import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthProvider";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; // Import framer-motion for animations
import { FaPlus, FaMusic, FaTags, FaGithub, FaLock, FaGlobe, FaFileAlt } from "react-icons/fa"; // Import icons
import "./NewProject.css";

function NewProject() {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [initWithReadme, setInitWithReadme] = useState(false);
  const [tags, setTags] = useState("");
  const [template, setTemplate] = useState("none");
  const [bpm, setBpm] = useState(120);
  const [key, setKey] = useState("C");
  const [keyDropdownOpen, setKeyDropdownOpen] = useState(false);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth() as { user: any };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    
    // Don't proceed if already submitting
    if (isSubmitting) return;
    
    if (!projectName || !user?.id) {
      console.error("Missing required fields");
      return;
    }
    
    setIsSubmitting(true);
    
    axios.post(`http://${window.location.hostname}:3333/api/projects/`, {
      title: projectName,
      hashtags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      userId: user.id,
    }, {
      withCredentials: true
    })
    .then((response) => {
      console.log("Project created successfully", response.data);
      if (response.data && response.data?.id) {
        navigate(`/project/${response.data?.id}`);
      } else {
        navigate("/dashboard");
      }
    })
    .catch((error) => {
      console.error("Error creating project", error);
      alert("Failed to create project. Please try again.");
      setIsSubmitting(false);
    });
  };

  const toggleOwnerDropdown = () => {
    setOwnerDropdownOpen(!ownerDropdownOpen);
  };

  const toggleKeyDropdown = () => {
    setKeyDropdownOpen(!keyDropdownOpen);
  };

  const selectOwner = (value) => {
    setSelectedOwner(value);
    setOwnerDropdownOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest(".owner-dropdown") && !event.target.closest(".owner-select")) {
        setOwnerDropdownOpen(false);
      }
      if (!event.target.closest(".key-dropdown") && !event.target.closest(".key-select")) {
        setKeyDropdownOpen(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <motion.div 
      className="new-project-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="new-project-content">
        <div className="new-project-header-section">
          <div className="new-project-header-content">
            {/* <FaMusic className="header-icon" /> */}
            <h1>Create New Project</h1>
          </div>
          <p className="new-project-subtitle">
            Start your musical journey with a new project. Fill in the details below to get started.
          </p>
        </div>

        <form className="project-form" onSubmit={handleSubmit}>
          <div className="form-card">
            <div className="form-section">
              <div className="form-section-header">
                <h2>Basic Information</h2>
                <p className="section-description">Project details and visibility settings</p>
              </div>

              <div className="form-group">
                <label htmlFor="owner">Owner</label>
                <div className="owner-select" onClick={toggleOwnerDropdown}>
                  <img 
                    src={selectedOwner === "user" ? user?.photos?.[0]?.value || "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" : "https://cdn-icons-png.flaticon.com/512/25/25231.png"}
                    alt="Owner" 
                    className="owner-avatar" 
                  />
                  <span>{selectedOwner === "user" ? user?.username : "Your Organization"}</span>
                  <i className="fas fa-chevron-down dropdown-arrow"></i>
                  
                  {ownerDropdownOpen && (
                    <div className="owner-dropdown active">
                      <div className="dropdown-option" onClick={() => selectOwner("user")}>
                        <img 
                          src={user?.photos?.[0]?.value || "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"}
                          alt="User"
                        />
                        <span>{user?.username}</span>
                      </div>
                      <div className="dropdown-option" onClick={() => selectOwner("org")}>
                        <img 
                          src="https://cdn-icons-png.flaticon.com/512/25/25231.png"
                          alt="Organization"
                        />
                        <span>Your Organization</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="project-name">
                  Project name <span className="required">*</span>
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  placeholder="My awesome track"
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">
                  Description <span className="optional">(optional)</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your music project"
                  className="input-field description-textarea"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Visibility <span className="required">*</span></label>
                <div className="visibility-cards">
                  <div 
                    className={`visibility-card ${isPublic ? 'selected' : ''}`}
                    onClick={() => setIsPublic(true)}
                  >
                    <div className="visibility-card-header">
                      <FaGlobe className="visibility-icon public" />
                      <h3>Public</h3>
                      <input
                        type="radio"
                        name="visibility"
                        checked={isPublic}
                        onChange={() => setIsPublic(true)}
                        style = {{opacity: 0}}
                      />
                    </div>
                    <p>Anyone can see and collaborate on this project</p>
                  </div>
                  
                  <div 
                    className={`visibility-card ${!isPublic ? 'selected' : ''}`}
                    onClick={() => setIsPublic(false)}
                  >
                    <div className="visibility-card-header">
                      <FaLock className="visibility-icon private" />
                      <h3>Private</h3>
                      <input
                        type="radio"
                        name="visibility"
                        checked={!isPublic}
                        onChange={() => setIsPublic(false)}
                        style = {{opacity: 0}}
                      />
                    </div>
                    <p>You choose who can see and collaborate on this project</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-card">
            <div className="form-section">
              <div className="form-section-header">
                <h2>Project Settings</h2>
                <p className="section-description">Musical properties and additional options</p>
              </div>

              <div className="form-group">
                <label htmlFor="tags">
                  Tags <span className="optional">(optional)</span>
                </label>
                <div className="tags-input-container">
                  <FaTags className="input-icon" />
                  <input
                    id="tags"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="EDM, Ambient, 120BPM, Cmaj (comma-separated)"
                    className="input-field with-icon"
                  />
                </div>
              </div>
              
              {/* <div className="form-row">
                <div className="form-group half-width">
                  <label htmlFor="bpm">BPM</label>
                  <input
                    type="number"
                    id="bpm"
                    min="1"
                    max="300"
                    value={bpm}
                    onChange={(e) => setBpm(parseInt(e.target.value))}
                    className="input-field"
                  />
                </div>
                
                <div className="form-group half-width">
                  <label htmlFor="key">Key</label>
                  <div className="key-select input-field" onClick={toggleKeyDropdown}>
                    <span>{key}</span>
                    <i className="fas fa-chevron-down dropdown-arrow"></i>
                    {keyDropdownOpen && (
                      <div className="key-dropdown active">
                        <div className="dropdown-section">
                          <h4>Major Keys</h4>
                          <div className="key-grid">
                            {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map((k) => (
                              <div key={k} className="key-option" onClick={() => setKey(k + " maj")}>
                                {k}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="dropdown-section">
                          <h4>Minor Keys</h4>
                          <div className="key-grid">
                            {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map((k) => (
                              <div key={k} className="key-option" onClick={() => setKey(k + " min")}>
                                {k}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="dropdown-section">
                          <div className="key-option" onClick={() => setKey("None")}>
                            None
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div> */}

              {/* <div className="form-group">
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id="readme"
                    checked={initWithReadme}
                    onChange={() => setInitWithReadme(!initWithReadme)}
                    className="styled-checkbox"
                  />
                  <label htmlFor="readme" className="checkbox-label">
                    <FaFileAlt className="checkbox-icon" />
                    Initialize this repository with a README
                  </label>
                </div>
                <p className="help-text">This will create a README.md file with project details</p>
              </div> */}
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => navigate("/dashboard")}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="create-btn"
              disabled={!projectName || !selectedOwner || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-small"></span>
                  Creating...
                </>
              ) : (
                <>
                  <FaPlus className="btn-icon" />
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

export default NewProject;