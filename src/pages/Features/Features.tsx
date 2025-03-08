import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import axios from "axios";
import { motion } from "framer-motion";
import "./Features.css";
import { FaPlus, FaArrowLeft, FaMusic, FaEdit, FaToolbox, FaSlidersH, FaTrash, FaChevronDown } from "react-icons/fa";

interface Feature {
  id: number;
  title: string;
  description: string;
  label: string;
  author: string;
  date: string;
  status: "open" | "closed";
}

const FEATURE_CATEGORIES = [
  { name: "Instrumental Layer", icon: <FaMusic />, color: "#6a5acd" },
  { name: "Autotune / Pitch Correction", icon: <FaSlidersH />, color: "#ff6b81" },
  { name: "Editing / Mixing", icon: <FaEdit />, color: "#f39c12" },
  { name: "Sound Design", icon: <FaToolbox />, color: "#2ecc71" },
];

function Features() {
  const { user } = useAuth() as { user: any };
  const { id } = useParams();
  const navigate = useNavigate();

  const [features, setFeatures] = useState<Feature[]>([]);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showNewFeatureModal, setShowNewFeatureModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedLabel, setSelectedLabel] = useState(FEATURE_CATEGORIES[0].name);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    const fakeFeatures: Feature[] = [
      {
        id: 1,
        title: "Enhance drums &create variations",
        description: "Need additional percussions and snare rolls.",
        label: "Instrumental Layer",
        author: "Kanye West",
        date: "2025-02-01",
        status: "open",
      },
      {
        id: 2,
        title: "Add ambiance - make it more bright",
        description: "Layer some ethereal pads to fill the gaps.",
        label: "Sound Design",
        author: "Travis Scott",
        date: "2025-02-05",
        status: "open",
      },
      {
        id: 3,
        title: "Tweak Autotune on vocals",
        description: "Need a natural but processed autotune effect.",
        label: "Autotune / Pitch Correction",
        author: "Lil aki",
        date: "2025-02-12",
        status: "closed",
      },
    ];
    setFeatures(fakeFeatures);
  }, [user, id]);

  const filteredFeatures = features.filter((f) => {
    const matchesTab = f.status === activeTab;
    const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleBackToProject = () => {
    if (id) navigate(`/project/${id}`);
  };

  const handleNewFeatureSubmit = async () => {
    if (!newTitle.trim() || !newDescription.trim()) return;
    setIsSubmitting(true);

    try {
      const newFeature: Feature = {
        id: Math.floor(Math.random() * 10000),
        title: newTitle,
        description: newDescription,
        label: selectedLabel,
        author: user?.username || "Anonymous",
        date: new Date().toISOString().split("T")[0],
        status: "open",
      };
      setFeatures((prev) => [...prev, newFeature]);
      setNewTitle("");
      setNewDescription("");
      setShowNewFeatureModal(false);
    } catch (err) {
      console.error("Failed to create feature", err);
      alert("Error creating feature.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseFeature = async (featureId: number) => {
    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId ? { ...f, status: "closed" } : f
      )
    );
    alert("Feature closed!");
  };

  const handleDeleteFeature = async (featureId: number) => {
    setFeatures((prev) => prev.filter((f) => f.id !== featureId));
  };

  return (
    <motion.div className="features-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <button type="button" className="cancel-btn back-btn" onClick={handleBackToProject}>
        <FaArrowLeft className="btn-icon" />
        Back to Project
      </button>

      <div className="features-header-section">
        <h1>Features & Requests</h1>
      </div>

      <div className="features-form">
        <div className="features-actions-row">
          <input type="text" className="input-field features-search" placeholder="Search Features..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <button type="button" className="create-btn new-feature-button" onClick={() => setShowNewFeatureModal(true)}>
            <FaPlus className="btn-icon" /> New Feature
          </button>
        </div>

        <div className="features-tab-row">
          <button className={`features-tab-btn ${activeTab === "open" ? "selected" : ""}`} onClick={() => setActiveTab("open")}>
            Open ({features.filter((f) => f.status === "open").length})
          </button>
          <button className={`features-tab-btn ${activeTab === "closed" ? "selected" : ""}`} onClick={() => setActiveTab("closed")}>
            Closed ({features.filter((f) => f.status === "closed").length})
          </button>
        </div>

        <div className="features-list-card">
          <div className="features-list-section">
            {filteredFeatures.length === 0 ? (
              <div className="no-features">No {activeTab} features found.</div>
            ) : (
              filteredFeatures.map((feature) => (
                <div key={feature.id} className="feature-card">
                  <div className="feature-card-header">
                    <h3 className="feature-title">{feature.title}</h3>
                    <span className="feature-label" style={{ backgroundColor: FEATURE_CATEGORIES.find((c) => c.name === feature.label)?.color }}>{feature.label}</span>
                    {feature.status === "open" ? (
                      <button type="button" className="cancel-btn close-feature-btn" onClick={() => handleCloseFeature(feature.id)}>Close</button>
                    ) : (
                      <button type="button" className="cancel-btn delete-feature-btn" onClick={() => handleDeleteFeature(feature.id)}>
                        <FaTrash />
                      </button>
                    )}
                  </div>
                  <p className="feature-meta">#{feature.id} • {feature.author} • {feature.date}</p>
                  <p className="feature-description">{feature.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showNewFeatureModal && (
  <div className="feature-modal-overlay">
    <div className="feature-modal">
      <h2>Create a New Feature Request</h2>
      
      <input 
        type="text" 
        className="input-field" 
        placeholder="Title (e.g., 'Add piano verse')" 
        value={newTitle} 
        onChange={(e) => setNewTitle(e.target.value)} 
      />
      
      <textarea 
        className="input-field description-box" 
        placeholder="Describe your request..." 
        value={newDescription} 
        onChange={(e) => setNewDescription(e.target.value)} 
      />
      
      <select 
        className="feature-label-dropdown" 
        value={selectedLabel} 
        onChange={(e) => setSelectedLabel(e.target.value)}
      >
        {FEATURE_CATEGORIES.map((cat) => (
          <option key={cat.name} value={cat.name}>{cat.name}</option>
        ))}
      </select>

      <div className="feature-modal-actions">
        <button 
          type="button" 
          className="cancel-btn modal-cancel-btn" 
          onClick={() => setShowNewFeatureModal(false)}
        >
          Cancel
        </button>
        
        <button 
          type="button" 
          className="create-btn" 
          onClick={handleNewFeatureSubmit}
        >
          Create Feature
        </button>
      </div>
    </div>
  </div>
)}

    </motion.div>
  );
}

export default Features;
