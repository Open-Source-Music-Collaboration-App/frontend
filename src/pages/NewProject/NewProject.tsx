import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthProvider";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion"; // Import framer-motion for animations
import { FaPlus, FaTags, FaLock, FaGlobe, FaSearch } from "react-icons/fa";
import "./NewProject.css";
import { apiUrl } from "../../config/api";

function NewProject() {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [initWithReadme, setInitWithReadme] = useState(false);
  const [tags, setTags] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [artistQuery, setArtistQuery] = useState("");
  const [artistResults, setArtistResults] = useState<any[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<any[]>([]);
  const [recommendedArtists, setRecommendedArtists] = useState<any[]>([]);
  const [template, setTemplate] = useState("none");
  const [bpm, setBpm] = useState(120);
  const [key, setKey] = useState("C");
  const [keyDropdownOpen, setKeyDropdownOpen] = useState(false);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState("user");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "osl" ? "osl" : "regular";

  const navigate = useNavigate();
  const { user } = useAuth() as { user: any };
  const recommendedTags = ["Indie electronic", "House", "Hip-hop", "Ambient", "R&B", "Dance", "Alt-pop", "Disco", "Live drums", "Festival closer"];

  useEffect(() => {
    if (artistQuery.trim().length < 2) { setArtistResults([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/artists/search`, { params: { q: artistQuery } });
        setArtistResults(response.data.artists || []);
      } catch { setArtistResults([]); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [artistQuery]);

  useEffect(() => {
    if (!selectedTags.length) { setRecommendedArtists([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/artists/recommendations`, { params: { tags: selectedTags.join("|") } });
        setRecommendedArtists(response.data.artists || []);
      } catch { setRecommendedArtists([]); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [selectedTags]);

  const toggleTag = (tag: string) => setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  const toggleArtist = (artist: any) => setSelectedArtists((current) => current.some((item) => item.id === artist.id) ? current.filter((item) => item.id !== artist.id) : [...current, artist].slice(0, 10));

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    
    // Don't proceed if already submitting
    if (isSubmitting) return;
    
    if (!projectName || !user?.id) {
      console.error("Missing required fields");
      return;
    }
    
    setIsSubmitting(true);
    
    axios.post(`${apiUrl}/api/projects/`, {
      title: projectName,
      hashtags: [...selectedTags, ...tags.split(',').map(tag => tag.trim()).filter(Boolean)],
      userId: user.id,
      description,
      mode,
      visibility: isPublic ? "public" : "private",
      isStarter: mode === "osl",
      festivalSlug: mode === "osl" ? "outside-lands" : null,
      festivalYear: mode === "osl" ? 2026 : null,
      audioSource: mode === "osl" ? "inspired" : "original",
      inspiredByArtistId: selectedArtists[0]?.id || null,
      inspiredByArtistName: selectedArtists.map((artist) => artist.name).join(", ") || null,
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
            <h1>{mode === "osl" ? "Create Outside Lands v1" : "Start a Studio Circle"}</h1>
          </div>
          <p className="new-project-subtitle">
            {mode === "osl"
              ? "Publish an artist-led v1. The core stays yours; the community competes to build the strongest next version."
              : "Make a private place for your people to build, compare Ableton versions, and finish a record."}
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
                <label>
                  Sound tags <span className="optional">(pick the energy you are after)</span>
                </label>
                <div className="tag-chip-grid">
                  {recommendedTags.map((tag) => <button type="button" key={tag} className={`tag-chip ${selectedTags.includes(tag) ? "active" : ""}`} onClick={() => toggleTag(tag)}>{tag}</button>)}
                </div>
                <div className="tags-input-container">
                  <FaTags className="input-icon" />
                  <input
                    id="tags"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Add your own tags, comma-separated"
                    className="input-field with-icon"
                  />
                </div>
              </div>

              <div className="form-group artist-inspo-group">
                <label htmlFor="artist-inspo">Inspo <span className="optional">(artist reference, never a claim of collaboration)</span></label>
                <div className="selected-artists">{selectedArtists.map((artist) => <button type="button" key={artist.id} onClick={() => toggleArtist(artist)}>{artist.imageUrl && <img src={artist.imageUrl} alt="" />}<span>{artist.name}</span><b>×</b></button>)}</div>
                <div className="tags-input-container"><FaSearch className="input-icon" /><input id="artist-inspo" className="input-field with-icon" value={artistQuery} onChange={(event) => setArtistQuery(event.target.value)} placeholder="Search artists via JamBase" /></div>
                {artistResults.length > 0 && <div className="artist-results">{artistResults.map((artist) => <button type="button" key={artist.id} onClick={() => { toggleArtist(artist); setArtistResults([]); }}><span>{artist.name}</span><small>{artist.genres?.slice(0, 2).join(" · ")}</small></button>)}</div>}
                {recommendedArtists.length > 0 && <div className="artist-recommendations"><p>Recommended from your sound tags</p><div className="artist-card-grid">{recommendedArtists.map((artist) => <button type="button" className={selectedArtists.some((item) => item.id === artist.id) ? "artist-card selected" : "artist-card"} key={artist.id} onClick={() => toggleArtist(artist)}>{artist.imageUrl ? <img src={artist.imageUrl} alt="" /> : <span className="artist-avatar">{artist.name.slice(0, 1)}</span>}<span>{artist.name}</span><small>{artist.genres?.slice(0, 1).join("")}</small></button>)}</div></div>}
                {artistQuery.length >= 2 && artistResults.length === 0 && <p className="inspo-help">Artist results appear here when JamBase is configured.</p>}
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
