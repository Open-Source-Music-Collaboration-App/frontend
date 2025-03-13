import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import OnboardingSettingsToggle from '../../components/OnboardingSettingsToggle/OnboardingSettingsToggle';
import { motion } from "framer-motion";
import {
  FaUser,
  FaToggleOn,
  FaShieldAlt,
  FaPalette,
  FaGithub,
  FaTrash,
  FaSave,
  FaMoon,
  FaDesktop,
  FaCompress,
  FaEye,
  FaKey,
  FaCog,
  FaUserCog
} from "react-icons/fa";
import "./Settings.css";

function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Profile form state
  const [name, setName] = useState(user?.displayName || "");
  const [bio, setBio] = useState("some bio text");

  // Appearance settings
  const [darkMode, setDarkMode] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [collaborationAlerts, setCollaborationAlerts] = useState(true);
  const [versionUpdates, setVersionUpdates] = useState(true);

  const handleSaveProfile = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    logout();
    navigate("/login");
  };

  return (
    <motion.div 
      className="settings-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="settings-header">
        <div className="settings-header-content">
          <h1 style={{ display: "flex", alignItems: "center" }}>
            <FaUserCog className="settings-icon" style={{ marginRight: "1rem", color: "#9806dbdd" }} />
            Settings</h1>
          <p className="settings-subtitle">Personalize your experience and manage your account preferences</p>
        </div>
      </div>

      <div className="settings-content">
        <div className="settings-sidebar">
          <div className="user-profile-card">
            <div className="profile-card-content">
              <img 
                src={user && `https://avatars.githubusercontent.com/u/${user.id}?v=4`}
                alt="GitHub Avatar" 
                className="settings-avatar" 
              />
              <div className="profile-card-info">
                <h3>{user?.displayName || user?.username}</h3>
                <div className="github-username">
                  <FaGithub /> @{user?.username}
                </div>
              </div>
            </div>
          </div>
          
          <div className="settings-nav">
            <button 
              className={`settings-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <FaUser className="settings-nav-icon" />
              Profile
            </button>
            
            <button 
              className={`settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <FaToggleOn className="settings-nav-icon" />
              Notifications
            </button>
            
            <button 
              className={`settings-nav-item ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              <FaPalette className="settings-nav-icon" />
              Appearance
            </button>
            
            <button 
              className={`settings-nav-item ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              <FaShieldAlt className="settings-nav-icon" />
              Account & Security
            </button>

            <button
              className={`settings-nav-item ${activeTab === 'onboarding' ? 'active' : ''}`}
              onClick={() => setActiveTab('onboarding')}
            >
              <FaCog className="settings-nav-icon" />
              Onboarding
            </button>
          </div>
        </div>
        
        <main className="settings-panel">
          {saveSuccess && (
            <div className="settings-success-message">
              <div className="success-icon">✓</div>
              <span>Changes saved successfully</span>
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div className="settings-tab-content profile-settings">
              <div className="settings-section-header">
                <h2>Profile Settings</h2>
                <p className="settings-description">Manage your personal information and how others see you</p>
              </div>
              
              <div className="settings-form">
                <div className="form-group">
                  <label htmlFor="display-name">Display Name</label>
                  <input 
                    id="display-name"
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="bio">Bio</label>
                  <textarea 
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                    rows={4}
                  />
                </div>
                
                <div className="form-actions">
                  <button 
                    className="save-btn"
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : (
                      <>
                        <FaSave className="btn-icon" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div className="settings-tab-content notification-settings">
              <div className="settings-section-header">
                <h2>Notification Preferences</h2>
                <p className="settings-description">Control how and when you receive updates and alerts</p>
              </div>
              
              <div className="settings-form">
                <div className="toggle-group">
                  <div className="toggle-item">
                    <div className="toggle-text">
                      <h3>Email Notifications</h3>
                      <p>Receive important updates via email</p>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={emailNotifications}
                        onChange={() => setEmailNotifications(!emailNotifications)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="toggle-item">
                    <div className="toggle-text">
                      <h3>Collaboration Alerts</h3>
                      <p>Get notified when someone invites you to collaborate</p>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={collaborationAlerts}
                        onChange={() => setCollaborationAlerts(!collaborationAlerts)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="toggle-item">
                    <div className="toggle-text">
                      <h3>Version Updates</h3>
                      <p>Notifications when there are updates to projects you follow</p>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={versionUpdates}
                        onChange={() => setVersionUpdates(!versionUpdates)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="form-actions">
                  <button 
                    className="save-btn"
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : (
                      <>
                        <FaSave className="btn-icon" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'appearance' && (
            <div className="settings-tab-content appearance-settings">
              <div className="settings-section-header">
                <h2>Appearance</h2>
                <p className="settings-description">Customize how the application looks and feels</p>
              </div>
              
              <div className="settings-form">
                <div className="toggle-group">
                  <div className="toggle-item">
                    <div className="toggle-text">
                      <h3>Dark Mode</h3>
                      <p>Use dark theme for the interface</p>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={darkMode}
                        onChange={() => setDarkMode(!darkMode)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="toggle-item">
                    <div className="toggle-text">
                      <h3>Compact View</h3>
                      <p>Show more content with condensed spacing</p>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={compactView}
                        onChange={() => setCompactView(!compactView)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="toggle-item">
                    <div className="toggle-text">
                      <h3>High Contrast Mode</h3>
                      <p>Improve visibility with higher contrast</p>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={highContrastMode}
                        onChange={() => setHighContrastMode(!highContrastMode)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="appearance-preview">
                  <h3>Preview</h3>
                  <div className={`preview-box ${darkMode ? 'dark' : 'light'} ${compactView ? 'compact' : ''} ${highContrastMode ? 'high-contrast' : ''}`}>
                    <div className="preview-header">
                      Project View
                    </div>
                    <div className="preview-content">
                      <div className="preview-item"></div>
                      <div className="preview-item"></div>
                      <div className="preview-item"></div>
                    </div>
                  </div>
                </div>
                
                <div className="form-actions">
                  <button 
                    className="save-btn"
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : (
                      <>
                        <FaSave className="btn-icon" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'onboarding' && (
            <div className="settings-tab-content onboarding-settings">
              <div className="settings-section-header">
                <h2>Onboarding</h2>
                <p className="settings-description">Customize your onboarding experience</p>
              </div>

              <OnboardingSettingsToggle />
            </div>
          )}
          
          {activeTab === 'account' && (
            <div className="settings-tab-content account-settings">
              <div className="settings-section-header">
                <h2>Account & Security</h2>
                <p className="settings-description">Manage your account security and connected services</p>
              </div>
              
              <div className="settings-form">
                <div className="account-section">
                  <h3>Connected Accounts</h3>
                  <div className="connected-account">
                    <div className="account-info">
                      <FaGithub className="account-icon github" />
                      <div className="account-details">
                        <h4>GitHub</h4>
                        <p>@{user?.username}</p>
                      </div>
                    </div>
                    <span className="account-connected">Connected</span>
                  </div>
                </div>
                
                <div className="account-section danger-zone">
                  <h3>Danger Zone</h3>
                  <div className="danger-actions">
                    <div className="danger-action">
                      <div>
                        <h4>Delete Account</h4>
                        <p>Permanently remove your account and all associated data. This action cannot be undone.</p>
                      </div>
                      <button 
                        className="danger-btn"
                        onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                    
                    {showDeleteConfirm && (
                      <div className="delete-confirmation">
                        <p>This action cannot be undone. Please type <strong>{user?.username}</strong> to confirm:</p>
                        <input 
                          type="text"
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          placeholder={`Type "${user?.username}" to confirm`}
                        />
                        <div className="confirmation-actions">
                          <button 
                            className="cancel-btn"
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteConfirm("");
                            }}
                          >
                            Cancel
                          </button>
                          <button 
                            className="delete-confirm-btn"
                            disabled={deleteConfirm !== user?.username}
                            onClick={handleDeleteAccount}
                          >
                            Delete Account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </motion.div>
  );
}

export default Settings;