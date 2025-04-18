import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import "./Features.css";
import { 
  FaPlus, FaArrowLeft, FaMusic, FaEdit, FaToolbox, 
  FaSlidersH, FaTrash, FaChevronDown, FaPuzzlePiece,
  FaTags, FaCalendarAlt, FaUser, FaCheck, FaSearch,
  FaFilter, FaSort, FaEllipsisV, FaInfoCircle
} from "react-icons/fa";

import Comments from '../../components/Comments/Comments';

import featuresicon from '../../assets/plus-circle-svgrepo-com.svg';
import HoverInfo from "../../components/HoverInfo/HoverInfo";
import OnboardingTooltip from "../../components/OnboardingTooltip/OnboardingTooltip";
import Tooltip from "../../components/Tooltip/Tooltip";

interface Feature {
  id: number;
  project_id: string;
  author_id: string;
  message: string;
  description: string;
  label: string;
  open: boolean;
  created_at: string;
  updated_at: string;
  author?: string; // For display purposes
  votes?: number; // For future implementation
  priority?: "low" | "medium" | "high"; // For future implementation
}

const FEATURE_CATEGORIES = [
  { name: "Instrumental Layer", icon: <FaMusic />, color: "#6a5acd" },
  { name: "Autotune / Pitch Correction", icon: <FaSlidersH />, color: "#ff6b81" },
  { name: "Editing / Mixing", icon: <FaEdit />, color: "#f39c12" },
  { name: "Sound Design", icon: <FaToolbox />, color: "#2ecc71" },
];

const PRIORITY_LEVELS = [
  { name: "low", color: "#4caf50", label: "Low" },
  { name: "medium", color: "#ff9800", label: "Medium" },
  { name: "high", color: "#f44336", label: "High" }
];

function Features() {
  const { user } = useAuth() as { user: any };
  const { id } = useParams();
  const navigate = useNavigate();
  const modalRef = useRef(null);
  
  // Data states
  const [features, setFeatures] = useState<Feature[]>([]);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title" | "priority" | "votes">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterCategory, setFilterCategory] = useState<string>("");
  
  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewFeatureModal, setShowNewFeatureModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [showFeatureDetails, setShowFeatureDetails] = useState(false);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedLabel, setSelectedLabel] = useState(FEATURE_CATEGORIES[0].name);
  const [selectedPriority, setSelectedPriority] = useState<"low" | "medium" | "high">("medium");

  // Fetch features from the backend
  useEffect(() => {
    if (!user || !id) return;
    
    const fetchFeatures = async () => {
      setLoadingFeatures(true);
      setError(null);
      
      try {
        const response = await axios.get(
          `http://${window.location.hostname}:3333/api/features/project/${id}`,
          { withCredentials: true }
        );
        
        // Process the data to fit our interface
        const fetchedFeatures = response.data.map(feature => ({
          ...feature,
          author: feature.User.name,
          status: feature.open ? "open" : "closed", // Map 'open' boolean to status string for UI
          title: feature.message, // Map message field to title for UI
          date: feature.created_at, // Use created_at as date for sorting/display
          // Default values for future implementation
          votes: feature.votes || 0,
          priority: feature.priority || "medium"
        }));
        
        setFeatures(fetchedFeatures);
      } catch (err) {
        console.error("Failed to fetch features:", err);
        setError("Failed to load features. Please try again.");
      } finally {
        setLoadingFeatures(false);
      }
    };

    fetchFeatures();
  }, [user, id]);

  // Click outside handler for modals
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && 
          !(modalRef.current as any).contains(event.target) && 
          !event.target.closest('.feature-card') &&
          !event.target.closest('.request-feature-btn')) {
        setShowNewFeatureModal(false);
        setShowFeatureDetails(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply sorting and filtering
  const getFilteredAndSortedFeatures = () => {
    // First filter by tab status (open/closed)
    let result = features.filter(f => 
      (activeTab === "open" && f.open) || (activeTab === "closed" && !f.open)
    );
    
    // Then filter by category if one is selected
    if (filterCategory) {
      result = result.filter(f => f.label === filterCategory);
    }
    
    // Then filter by search query
    if (searchQuery) {
      result = result.filter(f => 
        f.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
        f.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Then apply sorting
    return result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "title":
          comparison = a.message.localeCompare(b.message);
          break;
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
        case "votes":
          comparison = (a.votes || 0) - (b.votes || 0);
          break;
        case "date":
        default:
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  };

  const filteredFeatures = getFilteredAndSortedFeatures();

  const handleBackToProject = () => {
    if (id) navigate(`/project/${id}`);
  };

  const handleNewFeatureSubmit = async () => {
    if (!newTitle.trim() || !newDescription.trim()) return;
    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `http://${window.location.hostname}:3333/api/features/`, 
        {
          project_id: id,
          author_id: user?.id,
          message: newTitle,
          description: newDescription,
          label: selectedLabel,
          open: true,
          // Additional field for future implementation
          priority: selectedPriority
        },
        { withCredentials: true }
      );
      
      const newFeature = {
        ...response.data,
        author: user?.username,
        status: "open", // Map 'open' boolean to status string for UI
        title: response.data.message, // Map message field to title for UI
        date: response.data.created_at, // Use created_at as date for sorting/display
        votes: 0
      };
      
      setFeatures((prev) => [...prev, newFeature]);
      setNewTitle("");
      setNewDescription("");
      setSelectedLabel(FEATURE_CATEGORIES[0].name);
      setSelectedPriority("medium");
      setShowNewFeatureModal(false);
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to create feature", err);
      alert("Error creating feature. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseFeature = async (featureId: number) => {
    try {
      await axios.put(
        `http://${window.location.hostname}:3333/api/features/${featureId}`,
        { open: false },
        { withCredentials: true }
      );
      
      setFeatures((prev) =>
        prev.map((f) =>
          f.id === featureId ? { ...f, open: false, status: "closed" } : f
        )
      );
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Close detail view if the closed feature was being viewed
      if (selectedFeature?.id === featureId) {
        setShowFeatureDetails(false);
      }
    } catch (err) {
      console.error("Failed to close feature", err);
      alert("Error closing feature. Please try again.");
    }
  };

  const handleDeleteFeature = async (featureId: number) => {
    try {
      console.log("Deleting feature with ID:", featureId);
      await axios.delete(
        `http://${window.location.hostname}:3333/api/features/${featureId}`,
        { withCredentials: true }
      );
      
      setFeatures((prev) => prev.filter((f) => f.id !== featureId));
      
      // Close detail view if the deleted feature was being viewed
      if (selectedFeature?.id === featureId) {
        setShowFeatureDetails(false);
      }
    } catch (err) {
      console.error("Failed to delete feature", err);
      alert("Error deleting feature. Please try again.");
    }
  };

  const handleVoteFeature = (featureId: number) => {
    // This would connect to a future API endpoint for voting
    // For now, we're just updating the UI
    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId ? { ...f, votes: (f.votes || 0) + 1 } : f
      )
    );
    
    // Update selected feature if it's the one being voted on
    if (selectedFeature?.id === featureId) {
      setSelectedFeature({
        ...selectedFeature,
        votes: (selectedFeature.votes || 0) + 1
      });
    }
  };

  const openFeatureDetails = (feature: Feature) => {
    setSelectedFeature(feature);
    setShowFeatureDetails(true);
  };

  const toggleSort = (sortType: "date" | "title" | "priority" | "votes") => {
    if (sortBy === sortType) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(sortType);
      setSortDirection("desc"); // Default to descending when changing sort type
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilterCategory("");
    setSortBy("date");
    setSortDirection("desc");
  };
  
  return (
    <motion.div 
      className="features-container" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.3 }}
    >
      <div className="features-header">
        <div className="features-back">
          <button type="button" className="back-btn" onClick={handleBackToProject}>
            <FaArrowLeft /> Back to Project
          </button>
        </div>
        
        <div className="features-title-container">
          <img src={featuresicon} alt="Features Icon" className="features-icon" />
          <h1 className="features-title">Features & Requests</h1>
          <HoverInfo
            title="Feature Requests"
            description="Create and manage feature requests for your project. Collaborate with team members on implementation details."
          />

        </div>
        
        <p className="features-description">
          Create and manage feature requests for your project. Collaborate with team members on implementation details.
        </p>
      </div>

      <div className="features-toolbar">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search features..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="clear-search" 
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </div>
        
        <div className="toolbar-actions">
          <div className="filter-sort-container">
            <button 
              className={`filter-btn ${showFilters || filterCategory ? 'active' : ''}`} 
              onClick={() => setShowFilters(!showFilters)}
              title="Filter options"
            >
              <FaFilter /> 
              {filterCategory && <span className="filter-indicator"></span>}
            </button>
            
            <div className="sort-dropdown">
              <button className="sort-btn" title="Sort options">
                <FaSort /> 
                <span className="sort-label">Sort: {sortBy}</span>
                <FaChevronDown className="dropdown-icon" />
              </button>
              <div className="sort-menu">
                <button 
                  className={`sort-option ${sortBy === 'date' ? 'active' : ''}`} 
                  onClick={() => toggleSort('date')}
                >
                  Date {sortBy === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={`sort-option ${sortBy === 'title' ? 'active' : ''}`} 
                  onClick={() => toggleSort('title')}
                >
                  Title {sortBy === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={`sort-option ${sortBy === 'priority' ? 'active' : ''}`} 
                  onClick={() => toggleSort('priority')}
                >
                  Priority {sortBy === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={`sort-option ${sortBy === 'votes' ? 'active' : ''}`} 
                  onClick={() => toggleSort('votes')}
                >
                  Votes {sortBy === 'votes' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
            
            {(searchQuery || filterCategory || sortBy !== 'date' || sortDirection !== 'desc') && (
              <button className="reset-filters" onClick={resetFilters} title="Reset all filters">
                Reset
              </button>
            )}
          </div>
          
          <OnboardingTooltip
            stepId="request-feature"
            title="Create New Features"
            content="Add new feature requests to track ideas and improvements for your project."
            position="top"
          >
            <button 
              type="button" 
              className="request-feature-btn" 
              onClick={() => setShowNewFeatureModal(true)}
            >
              <FaPlus /> New Feature
            </button>
          </OnboardingTooltip>
        </div>
      </div>
      
      {showFilters && (
        <motion.div 
          className="filter-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <div className="filter-section">
            <h3 className="filter-title">Filter by Category</h3>
            <div className="category-filters">
              <button 
                className={`category-filter-btn ${filterCategory === '' ? 'active' : ''}`}
                onClick={() => setFilterCategory('')}
              >
                All
              </button>
              {FEATURE_CATEGORIES.map(category => (
                <button 
                  key={category.name}
                  className={`category-filter-btn ${filterCategory === category.name ? 'active' : ''}`}
                  onClick={() => setFilterCategory(category.name)}
                  style={{ 
                    backgroundColor: filterCategory === category.name ? category.color : 'transparent',
                    borderColor: category.color
                  }}
                >
                  {category.icon} {category.name}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <div className="features-tabs">
        <button 
          className={`tab-btn ${activeTab === "open" ? "active" : ""}`} 
          onClick={() => setActiveTab("open")}
        >
          Open ({features.filter(f => f.open).length})
        </button>
        
        <button 
          className={`tab-btn ${activeTab === "closed" ? "active" : ""}`} 
          onClick={() => setActiveTab("closed")}
        >
          Closed ({features.filter(f => !f.open).length})
        </button>
      </div>

      {showSuccess && (
          <motion.div 
            className="success-notification"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <FaCheck className="success-icon" />
            <span>Feature request {activeTab === "open" ? "created" : "closed"} successfully!</span>
          </motion.div>
      )}

      {error && (
        <motion.div 
          className="error-notification"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <FaInfoCircle className="error-icon" />
          <span>{error}</span>
        </motion.div>
      )}

      <div className="features-list">
        {loadingFeatures ? (
          <div className="loading-features">
            <div className="spinner"></div>
            <p>Loading features...</p>
          </div>
        ) : filteredFeatures.length === 0 ? (
          <motion.div 
            className="no-features"
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="empty-icon">
              <FaPuzzlePiece />
            </div>
            <h3>No {activeTab} features found</h3>
            <p className="empty-subtitle">
              {searchQuery || filterCategory ? 
                "Try adjusting your search or filters" :
                activeTab === "open" 
                  ? "Create a new feature request to get started." 
                  : "Closed features will appear here."
              }
            </p>
            {(searchQuery || filterCategory) && (
              <button className="reset-search-btn" onClick={resetFilters}>
                Reset filters
              </button>
            )}
          </motion.div>
        ) : (
          filteredFeatures.map((feature, i) => (
            <div 
              key={feature.id} 
              className="feature-card"
              custom={i}
              initial="hidden"
              animate="visible"
              exit="exit"
              layoutId={`feature-${feature.id}`}
              onClick={() => openFeatureDetails(feature)}
            >
              <div className="feature-header">
                <h3 className="feature-title">{feature.message}</h3>
                <div className="feature-category" style={{ backgroundColor: FEATURE_CATEGORIES.find(c => c.name === feature.label)?.color }}>
                  {FEATURE_CATEGORIES.find(c => c.name === feature.label)?.icon} {feature.label}
                </div>
              </div>

              <div className="feature-metadata">
                <div className="feature-author">
                  <FaUser className="metadata-icon" /> 
                  <span>{feature.author}</span>
                </div>
                <div className="feature-date">
                  <FaCalendarAlt className="metadata-icon" />
                  <span>{new Date(feature.created_at).toLocaleDateString()}</span>
                </div>
                {feature.priority && (
                  <div className={`feature-priority priority-${feature.priority}`}>
                    {feature.priority}
                  </div>
                )}
              </div>
              
              <p className="feature-description">{feature.description.length > 120 ? `${feature.description.substring(0, 120)}...` : feature.description}</p>
              
              <div className="feature-footer">
                <div className="feature-id-votes">
                  <span className="feature-id">#{feature.id}</span>
                  <div className="feature-votes">
                    <button 
                      className="vote-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVoteFeature(feature.id);
                      }}
                    >
                      ▲
                    </button>
                    <span className="vote-count">{feature.votes || 0}</span>
                  </div>
                </div>
                
                <div className="feature-actions">
                  {feature.open ? (
                    <button 
                      type="button" 
                      className="close-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseFeature(feature.id);
                      }}
                    >
                      Close Feature
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      className="delete-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFeature(feature.id);
                      }}
                    >
                      <FaTrash /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Feature Details Modal */}
      {showFeatureDetails && selectedFeature && (
  <motion.div 
    className="modal-overlay"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <div 
      className="feature-detail-modal"
      ref={modalRef}
    >
      <div className="feature-content">
          <div className="feature-detail-header">
            <div className="feature-category large" style={{ backgroundColor: FEATURE_CATEGORIES.find(c => c.name === selectedFeature.label)?.color }}>
              {FEATURE_CATEGORIES.find(c => c.name === selectedFeature.label)?.icon} {selectedFeature.label}
            </div>
            <button className="close-modal-btn" onClick={() => setShowFeatureDetails(false)}>×</button>
          </div>
          
          <h2 className="feature-detail-title">{selectedFeature.message}</h2>
          
          <div className="feature-detail-metadata">
            <div className="feature-id-label">#{selectedFeature.id}</div>
            
            <div className="detail-metadata-group">
              <div className="detail-author">
                <FaUser className="metadata-icon" />
                <span>{selectedFeature.author}</span>
              </div>
              
              <div className="detail-date">
                <FaCalendarAlt className="metadata-icon" />
                <span>{new Date(selectedFeature.created_at).toLocaleDateString()}</span>
              </div>
              
              {selectedFeature.priority && (
                <div className={`feature-priority large priority-${selectedFeature.priority}`}>
                  {selectedFeature.priority} priority
                </div>
              )}
            
              <div className="detail-votes">
                <button 
                  className="vote-btn large"
                  onClick={() => handleVoteFeature(selectedFeature.id)}
                >
                  ▲ Upvote
                </button>
                <span className="vote-count large">{selectedFeature.votes || 0} votes</span>
              </div>
            </div>
          </div>
        
        <div className="feature-detail-description">
          <p>{selectedFeature.description}</p>
        </div>
        
        <div className="feature-detail-actions">
          {selectedFeature.open ? (
            <button 
              type="button" 
              className="close-btn large" 
              onClick={() => handleCloseFeature(selectedFeature.id)}
            >
              <FaCheck /> Mark as Completed
            </button>
          ) : (
            <button 
              type="button" 
              className="delete-btn large" 
              onClick={() => handleDeleteFeature(selectedFeature.id)}
            >
              <FaTrash /> Delete Feature
            </button>
          )}
        </div>
      </div>

      {/* Add the Comments component here */}
      <Comments featureId={selectedFeature.id} />
    </div>
  </motion.div>
)}

      {/* New Feature Modal */}
        {showNewFeatureModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div 
              className="modal-content"
              ref={modalRef}
            >
              <div className="modal-header">
                <h2 className="modal-title">
                  <FaPlus className="modal-icon" /> Create Feature Request
                </h2>
                <button className="close-modal-btn" onClick={() => setShowNewFeatureModal(false)}>×</button>
              </div>
              
              <div className="form-group">
                <label>Title <span className="required">*</span></label>
                <input 
                  type="text" 
                  placeholder="Feature title (e.g., 'Add piano verse')" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <div className="field-hint">Be clear and specific about what needs to be done.</div>
              </div>
              
              <div className="form-group">
                <label>Description <span className="required">*</span></label>
                <textarea 
                  placeholder="Describe your feature request in detail..." 
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={5}
                ></textarea>
                <div className="field-hint">Include any relevant details that will help implement this feature.</div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <div className="fancy-select-wrapper">
                    <select 
                      value={selectedLabel}
                      onChange={(e) => setSelectedLabel(e.target.value)}
                      className="fancy-select"
                    >
                      {FEATURE_CATEGORIES.map(cat => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <FaChevronDown className="select-arrow" />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Priority</label>
                  <div className="priority-selector">
                    {PRIORITY_LEVELS.map(priority => (
                      <button
                        key={priority.name}
                        type="button"
                        className={`priority-btn ${selectedPriority === priority.name ? 'selected' : ''}`}
                        onClick={() => setSelectedPriority(priority.name.toLowerCase() as "low" | "medium" | "high")}
                        style={{ 
                          backgroundColor: selectedPriority === priority.name ? priority.color : 'transparent',
                          borderColor: priority.color
                        }}
                      >
                        {priority.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="cancel-btn" 
                  onClick={() => setShowNewFeatureModal(false)}
                >
                  Cancel
                </button>
                
                <button 
                  type="button" 
                  className="submit-btn"
                  onClick={handleNewFeatureSubmit}
                  disabled={isSubmitting || !newTitle.trim() || !newDescription.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-small"></span> Creating...
                    </>
                  ) : (
                    "Create Feature"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
    </motion.div>
  );
}

export default Features;