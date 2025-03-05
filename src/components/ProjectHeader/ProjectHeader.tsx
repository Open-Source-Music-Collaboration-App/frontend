import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import "./ProjectHeader.css";

import musicicon from '../../assets/music-note-svgrepo-com.svg'
import featuresicon from '../../assets/plus-circle-svgrepo-com.svg'
import collabrequesticon from '../../assets/pull-request-svgrepo-com.svg'
import settingsicon from '../../assets/settings-svgrepo-com.svg'
import historyIcon from "../../assets/history-svgrepo-com.svg"; 

import ProfileDropdown from '../ProfileDropdown/ProfileDropdown';

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
    if (path.includes('/history')) {
      setActiveTab('history');
    } else if (path.includes('/settings')) {
      setActiveTab('settings');
    } else {
      setActiveTab('track');
    }
  }, [window.location.pathname]);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (!event.target.closest(".profile-dropdown") && !event.target.closest(".profile-picture")) {
        setToggleProfileDropdown(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user && id) {
      axios.get(`http://localhost:3333/api/projects/${id}`, { withCredentials: true })
        .then(response => {
          console.log("Project data:", response.data);
          setProject(response.data);
        })
        .catch(error => 
          navigate("/dashboard") // Redirect to dashboard if project not found
        )
        .finally(() => setLoading(false));
    }
  }, [user, id]);

  // Handle tab switching with smooth animations
  const handleTabSwitch = (tab: 'track' | 'history' | 'settings') => {
    setActiveTab(tab);
    
    if (tab === 'history') {
      navigate(`/project/${id}/history`);
    } else if (tab === 'settings') {
      navigate(`/project/${id}/settings`);
    } else {
      navigate(`/project/${id}`);
    }
  };

  return (
    <header className="project-header">
      <div className="header-container">
        <div className="left">
          <div className="logo"
            onClick={() => navigate("/dashboard")}
          >🎧</div>
          <h2 className="user" onClick={() => navigate("/dashboard")}>{user?.username}</h2>
          <span className="slash">/</span>
          <h2 className="project-name" onClick={() => navigate(`/project/${id}`)}>{project ? project[0].title : ""}</h2>
        </div>
        <div className="right">
          <button className="buttonoutline" onClick={() => navigate("/new-project")}>+ New Project</button>
          <button className="buttonoutline icon" onClick={() => navigate("/invite")}><i className="fas fa-user-plus"></i></button>
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
          <span>Track</span>
        </button>
        <button 
          className={`header-btn ${activeTab === 'history' ? 'selected' : ''}`}
          onClick={() => handleTabSwitch('history')}
        >
          <img src={historyIcon} alt="History Icon" className="history-icon" />
          <span>History</span>
        </button>
        <button className="header-btn"> 
          <img src={featuresicon} alt="Features Icon" className="features-icon" />
          <span>Features</span>
        </button>
        <button className="header-btn">
          <img src={collabrequesticon} alt="Collaboration Icon" className="collab-icon" />
          <span>Collab Requests</span>
        </button>
        <button className={`header-btn ${activeTab === 'settings' ? 'selected' : ''}`}
          onClick={() => handleTabSwitch('settings')}>
          <img src={settingsicon} alt="Settings Icon" className="settings-icon" />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
}

export default ProjectHeader;