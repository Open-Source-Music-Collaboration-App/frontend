import { useState } from "react";
import { useAuth } from "../../context/AuthProvider";
import axios from "axios";
import { useNavigate } from "react-router-dom";

//add the useEffect
import { useEffect } from "react";
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

  const navigate = useNavigate(); // For redirecting after success
  const { user } = useAuth() as { user: any };

  const handleSubmit = (e) => {
    if (e) e.preventDefault(); // Prevent form submission if event exists
    
    console.log("Create project", { 
      projectName, description, isPublic, 
      initWithReadme, tags, template, bpm, key,
      selectedOwner 
    });
    
    // Make sure we have the required fields
    if (!projectName || !user?.id) {
      console.error("Missing required fields");
      return;
    }
    
    // Ensure user.id exists and is properly formatted
    console.log("User ID being sent:", user.id);
    
    axios.post("http://localhost:3333/api/projects/", {
      title: projectName,
      hashtags: tags,
      userId: user.id, // Make sure this matches the expected format
    }, {
      withCredentials: true // Include cookies if needed for authentication
    })
    .then((response) => {
      console.log("Project created successfully", response.data);
      // Redirect to the project page
      if (response.data && response.data?.id) {
        navigate(`/project/${response.data?.id}`);
      } else {
        navigate("/dashboard");
      }
    })
    .catch((error) => {
      console.error("Error creating project", error);
      alert("Failed to create project. Please try again.");
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest(".owner-dropdown") && !event.target.closest(".owner-select")) {
        setOwnerDropdownOpen(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="new-project-container">
      <div className="new-project-content">
        <h1 className="new-project-header">Create a new music project</h1>
        <p className="new-project-subheader">Start your musical journey with a new project. Fill in the details below to get started. All fields marked with an asterisk <span className="required">*</span> are required.</p>
        <hr className="new-project-divider" />
        
        <form className="project-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="owner">Owner</label>
              <div className="owner-select" onClick={toggleOwnerDropdown}>
                <img 
                  src={selectedOwner === "user" ? user.photos?.[0]?.value || "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" : "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"}
                  alt="User" 
                  className="owner-avatar" 
                />
                <span>{selectedOwner === "user" ? user.username : "Your Organization"}</span>
                <i className="fas fa-chevron-down" style={{ opacity: 0.7, marginLeft: "auto" }}></i>
                
                {ownerDropdownOpen && (
                  <div className="owner-dropdown active">
                    <div className="dropdown-option" onClick={() => selectOwner("user")}>
                      <img 
                        src={user.photos?.[0]?.value || "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"}
                        alt="User"
                      />
                      <span>{user.username}</span>
                    </div>
                    <div className="dropdown-option" onClick={() => selectOwner("org")}>
                      <img 
                      //not the gthub logo, but a placeholder for the organization
                        // src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
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
              <div className="form-group-header">
                <label htmlFor="project-name">Project name</label>
                <span className="required">*</span>
              </div>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                placeholder="My awesome track"
              />
            </div>

            <div className="form-group">
              <div className="form-group-header">
                <label htmlFor="description">Description</label>
                <span className="optional">(optional)</span>
              </div>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your music project"
              />
            </div>
          </div>

          {/* Rest of your form remains unchanged */}
          <div className="form-section">
            <div className="form-group visibility-group">
              <div className="form-group-header">
                <label>Visibility</label>
                <span className="required">*</span>
              </div>
              
              <div className="visibility-options">
                <div className="visibility-option">
                  <input
                    type="radio"
                    id="public"
                    name="visibility"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                  />
                  <label htmlFor="public">
                    <div className="option-icon">🌐</div>
                    <div className="option-content">
                      <h3>Public</h3>
                      <p>Anyone can see and collaborate on this project.</p>
                    </div>
                  </label>
                </div>

                <div className="visibility-option">
                  <input
                    type="radio"
                    id="private"
                    name="visibility"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                  />
                  <label htmlFor="private">
                    <div className="option-icon">🔒</div>
                    <div className="option-content">
                      <h3>Private</h3>
                      <p>You choose who can see and collaborate on this project.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-group">
              <div className="form-group-header">
                <label htmlFor="tags">Tags</label>
                <span className="optional">(optional)</span>
              </div>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="EDM, Ambient, 120BPM, Cmaj (comma-separated)"
              />
            </div>
            
            <div className="form-group inline-group">
              <div className="inline-form-group">
                <label htmlFor="bpm">BPM</label>
                <input
                  type="number"
                  id="bpm"
                  min="1"
                  max="300"
                  value={bpm}
                  onChange={(e) => setBpm(parseInt(e.target.value))}
                />
              </div>
              
              <label htmlFor="key">Key</label>
              <div className="key-select" onClick={toggleKeyDropdown}>
                <img src=" https://cdn-icons-png.flaticon.com/512/651/651717.png " alt="Key Icon" className="key-avatar" />
                <span>{key}</span>
                <i className="fas fa-chevron-down" style={{ opacity: 0.7, marginLeft: "auto" }}></i>
                {keyDropdownOpen && (
                  <div className="key-dropdown active">
                    {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map((k) => (
                      <div key={k} className="dropdown-option" onClick={() => setKey(k + "maj")}>
                        <img 
                          src=" https://cdn-icons-png.flaticon.com/512/651/651717.png "
                          alt="Key Icon" 
                          className="key-avatar"
                        />
                        <span>{k} maj</span>
                      </div>
                    ))}
                    <hr />
                    {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map((k) => (
                      <div key={k} className="dropdown-option" onClick={() => setKey(k + "min")}>
                        <img 
                          src=" https://cdn-icons-png.flaticon.com/512/651/651717.png "
                          alt="Key Icon" 
                          className="key-avatar"
                        />
                        <span>{k} min</span>
                      </div>
                    ))}
                    <hr />
                    <div className="dropdown-option" onClick={() => setKey("None")}>
                      <img 
                        src=" https://cdn-icons-png.flaticon.com/512/651/651717.png "
                        alt="Key Icon" 
                        className="key-avatar"
                      />
                      <span>None</span>
                     </div>
                  </div>
                  
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-group">
              <div className="form-group-header">
                <label>Initialize this project with:</label>
              </div>

              <div className="checkbox-option">
                <input
                  type="checkbox"
                  id="readme"
                  checked={initWithReadme}
                  onChange={() => setInitWithReadme(!initWithReadme)}
                />
                <label htmlFor="readme">
                  Add a README file with project details
                </label>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="buttonfill create-btn"
              disabled={!projectName || !selectedOwner}
            >
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewProject;