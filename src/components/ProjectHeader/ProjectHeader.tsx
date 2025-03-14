import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import "./ProjectHeader.css";

import { useAuth } from '../../context/AuthProvider';
import ProfileDropdown from '../ProfileDropdown/ProfileDropdown';

import musicicon from '../../assets/music-note-svgrepo-com.svg';
import featuresicon from '../../assets/plus-circle-svgrepo-com.svg';
import collabrequesticon from '../../assets/pull-request-svgrepo-com.svg';
import settingsicon from '../../assets/settings-svgrepo-com.svg';
import historyIcon from "../../assets/history-svgrepo-com.svg"; 

const tabs = ['track', 'history', 'settings', 'features', 'collabs'];

function ProjectHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<string>('track');

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [toggleProfileDropdown, setToggleProfileDropdown] = useState(false);
  
  // Determine active tab based on URL path
  useEffect(() => {
    const path = window.location.pathname;
    const tab = tabs.find(tab => path.includes(tab));
    if (tab) {
      setActiveTab(tab);
    }
    else {
      setActiveTab('track');
    }
    // Reset error when navigating to a new tab
    setError(null);
  }, [window.location.pathname]);

  // Close profile dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (
        !event.target.closest(".profile-dropdown") &&
        !event.target.closest(".profile-picture")
      ) {
        setToggleProfileDropdown(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Fetch project data (example from your existing code)
  useEffect(() => {
    if (user && id) {
      const domain = window.location.hostname;
      axios
        .get(`http://${domain}:3333/api/projects/${id}`)
        .then((response) => {
          console.log("Project data:", response.data);
          setProject(response.data);
        })
        .catch((err) => {
          console.error(err);
          // navigate("/dashboard"); // Redirect to dashboard if project not found
        })
        .finally(() => setLoading(false));
    }
  }, [user, id]);

  // Handle tab switching with smooth animations
  const handleTabSwitch = (tab: string) => {
    setActiveTab(tab);
    
    if (tab === 'track') {
      navigate(`/project/${id}`);
    } 
    else if( tabs.includes(tab) )
    {
      navigate(`/project/${id}/${tab}`);
    }
    else {
      navigate(`/project/${id}`);
    }
  };

  return (
    <header className="project-header">
      <div className="header-container">
        <div className="left">
          <div className="logo" onClick={() => navigate("/dashboard")}>
            🎧
          </div>
          <h2 className="user" onClick={() => navigate("/dashboard")}>
            {project ? project[0]?.User.name : ""}
          </h2>
          <span className="slash">/</span>
          <h2 className="project-name" onClick={() => navigate(`/project/${id}`)}>
            {project ? project[0]?.title : ""}
          </h2>
        </div>
        <div className="right">
          <button className="buttonoutline" onClick={() => navigate("/new-project")}>
            + New Project
          </button>
          <button className="buttonoutline icon" onClick={() => navigate("/invite")}>
            <i className="fas fa-user-plus"></i>
          </button>
          {user && user.photos?.[0]?.value ? (
            <div className="profile-container" style={{ position: "relative" }}>
              <img
                src={user.photos[0].value}
                alt="GitHub Avatar"
                className="profile-picture"
                style={{
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  marginRight: "10px",
                  cursor: "pointer",
                }}
                onClick={() => setToggleProfileDropdown(!toggleProfileDropdown)}
              />
              {toggleProfileDropdown && <ProfileDropdown toggleProfileDropdown={toggleProfileDropdown} />}
            </div>
          ) : null}
        </div>
      </div>
      <div className="btn-container">
        <button
          className={`header-btn ${activeTab === 'track' ? 'selected' : ''}`}
          onClick={() => handleTabSwitch('track')}
        >
          <img src={musicicon} alt="Music Icon" className="music-icon" />
          <span>Tracks</span>
        </button>
        <button
          className={`header-btn ${activeTab === 'history' ? 'selected' : ''}`}
          onClick={() => handleTabSwitch('history')}
        >
          <img src={historyIcon} alt="History Icon" className="history-icon" />
          <span>History</span>
        </button>
        <button
          className={`header-btn ${activeTab === 'features' ? 'selected' : ''}`}
          onClick={() => handleTabSwitch('features')}
        >
          <img src={featuresicon} alt="Features Icon" className="features-icon" />
          <span>Features</span>
        </button>
        <button className={`header-btn ${activeTab === 'collabs' ? 'selected' : ''}`}
          onClick={() => handleTabSwitch('collabs')}>
          <img src={collabrequesticon} alt="Collaboration Icon" className="collab-icon" />
          <span>Collab Requests</span>
        </button>
        <button
          className={`header-btn ${activeTab === 'settings' ? 'selected' : ''}`}
          onClick={() => handleTabSwitch('settings')}
        >
          <img src={settingsicon} alt="Settings Icon" className="settings-icon" />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
}

export default ProjectHeader;
