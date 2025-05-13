import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import axios from "axios";
import { motion } from "framer-motion";
import {
  FaUser, FaCalendarAlt, FaChartBar, FaMusic, FaPuzzlePiece, 
  FaGithub, FaArrowLeft, FaLink, FaStar, FaLock, FaGlobe,
  FaComments, FaHandshake, FaTag, FaUserEdit, FaExternalLinkAlt,
  FaFireAlt, FaAward, FaDiagnoses, FaPercentage, FaThumbsUp,
  FaFileAlt
} from "react-icons/fa";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import "./Profile.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function Profile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Profile data state
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      const profileId = userId || user?.id;
      console.log("Fetching profile for user:", profileId);
      if (!profileId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(
          `/api/profile/${profileId}`,
          { withCredentials: true }
        );
        
        setProfile(response.data.user);
        setStats(response.data.stats);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setError("Failed to load profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [userId, user]);
  
  const isOwnProfile = user && ((userId && userId === user.id) || (!userId));
  
  // Chart data for activity
  const activityChartData = {
    labels: stats?.activityData.map(d => d.month) || [],
    datasets: [
      {
        label: 'Projects',
        data: stats?.activityData.map(d => d.projects) || [],
        borderColor: 'rgba(147, 0, 215, 0.8)',
        backgroundColor: 'rgba(147, 0, 215, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Features',
        data: stats?.activityData.map(d => d.features) || [],
        borderColor: 'rgba(71, 187, 255, 0.8)',
        backgroundColor: 'rgba(71, 187, 255, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Collaborations',
        data: stats?.activityData.map(d => d.collabs) || [],
        borderColor: 'rgba(255, 159, 64, 0.8)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Comments',
        data: stats?.activityData.map(d => d.comments) || [],
        borderColor: 'rgba(75, 192, 192, 0.8)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      }
    ]
  };
  
  // Chart data for priority distribution
  const priorityChartData = stats ? {
    labels: ['High', 'Medium', 'Low'],
    datasets: [
      {
        data: [
          stats.features.byPriority.high,
          stats.features.byPriority.medium,
          stats.features.byPriority.low
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(75, 192, 192, 0.7)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1,
      },
    ],
  } : null;
  
  // Chart data for project visibility distribution
  const visibilityChartData = stats ? {
    labels: ['Public', 'Private'],
    datasets: [
      {
        data: [
          stats.projects.public,
          stats.projects.private
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 99, 132, 0.7)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1,
      },
    ],
  } : null;
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      }
    }
  };
  
  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      }
    },
    cutout: '70%'
  };
  
  // Format date for display
  const formatDate = (dateString, options = {}) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    });
  };
  
  return (
    <motion.div
      className="profile-container-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="profile-back">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
      </div>
      
      {loading ? (
        <div className="profile-loading">
          <div className="spinner"></div>
          <p>Loading profile data...</p>
        </div>
      ) : error ? (
        <div className="profile-error">
          <p>{error}</p>
        </div>
      ) : profile ? (
        <>
          <div className="profile-header">
            <div className="profile-header-content">
              <div className="profile-avatar-section">
                <img 
                  src={profile.photo || `https://avatars.githubusercontent.com/u/${profile.id}?v=4`}
                  alt={profile.name}
                  className="profile-avatar"
                />
                {isOwnProfile && (
                  <button className="edit-profile-btn" onClick={() => navigate("/settings")}>
                    <FaUserEdit /> Edit Profile
                  </button>
                )}
              </div>
              
              <div className="profile-info">
                <h1 className="profile-name">{profile.name}</h1>
                <div className="profile-metadata">
                  <div className="profile-meta-item">
                    <FaGithub className="meta-icon github" />
                    <span>@{profile.username || profile.name.toLowerCase().replace(/\s/g, '')}</span>
                  </div>
                  <div className="profile-meta-item">
                    <FaCalendarAlt className="meta-icon" />
                    <span>Joined {formatDate(profile.created_at)}</span>
                  </div>
                  {stats?.engagementScore && (
                    <div className="profile-meta-item highlight">
                      <FaFireAlt className="meta-icon fire" />
                      <span>{stats.engagementScore} Engagement Score</span>
                    </div>
                  )}
                </div>
                
                <p className="profile-bio">
                  {profile.bio || "No bio provided yet."}
                </p>
              </div>
            </div>
          </div>
          
          <div className="profile-nav">
            <button 
              className={`profile-nav-item ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <FaChartBar /> Overview
            </button>
            <button 
              className={`profile-nav-item ${activeTab === "projects" ? "active" : ""}`}
              onClick={() => setActiveTab("projects")}
            >
              <FaMusic /> Projects
            </button>
            <button 
              className={`profile-nav-item ${activeTab === "features" ? "active" : ""}`}
              onClick={() => setActiveTab("features")}
            >
              <FaPuzzlePiece /> Features
            </button>
            <button 
              className={`profile-nav-item ${activeTab === "collaborations" ? "active" : ""}`}
              onClick={() => setActiveTab("collaborations")}
            >
              <FaHandshake /> Collaborations
            </button>
            <button 
              className={`profile-nav-item ${activeTab === "comments" ? "active" : ""}`}
              onClick={() => setActiveTab("comments")}
            >
              <FaComments /> Comments
            </button>
          </div>
          
          <div className="profile-content">
            {activeTab === "overview" && (
              <div className="profile-overview">
                {/* Main Stats Grid */}
                <div className="stats-grid">
                  <div className="stat-card projects animate-fade-in">
                    <div className="stat-header">
                      <h3>Projects</h3>
                      <FaMusic className="stat-icon" />
                    </div>
                    <div className="stat-value">{stats.projects.total}</div>
                    <div className="stat-details">
                      <div className="stat-detail">
                        <FaGlobe className="detail-icon" />
                        <span>{stats.projects.public} Public</span>
                      </div>
                      <div className="stat-detail">
                        <FaLock className="detail-icon" />
                        <span>{stats.projects.private} Private</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="stat-card features animate-fade-in">
                    <div className="stat-header">
                      <h3>Features</h3>
                      <FaPuzzlePiece className="stat-icon" />
                    </div>
                    <div className="stat-value">{stats.features.created}</div>
                    <div className="stat-details">
                      <div className="stat-detail">
                        <span className="priority high"></span>
                        <span>{stats.features.byPriority.high} High</span>
                      </div>
                      <div className="stat-detail">
                        <span className="priority medium"></span>
                        <span>{stats.features.byPriority.medium} Medium</span>
                      </div>
                      <div className="stat-detail">
                        <span className="priority low"></span>
                        <span>{stats.features.byPriority.low} Low</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="stat-card collabs animate-fade-in">
                    <div className="stat-header">
                      <h3>Collaborations</h3>
                      <FaHandshake className="stat-icon" />
                    </div>
                    <div className="stat-value">{stats.collabs?.total || 0}</div>
                    <div className="stat-details">
                      <div className="stat-detail">
                        <FaThumbsUp className="detail-icon success" />
                        <span>{stats.collabs?.accepted || 0} Accepted</span>
                      </div>
                      <div className="stat-detail">
                        <FaPercentage className="detail-icon" />
                        <span>{stats.collabs?.total ? Math.round((stats.collabs.accepted / stats.collabs.total) * 100) : 0}% Success Rate</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="stat-card comments animate-fade-in">
                    <div className="stat-header">
                      <h3>Comments</h3>
                      <FaComments className="stat-icon" />
                    </div>
                    <div className="stat-value">{stats.comments?.total || 0}</div>
                    <div className="stat-details">
                      <div className="stat-detail">
                        <FaComments className="detail-icon" />
                        <span>On {stats.comments?.byFeature?.length || 0} Features</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Visualization Row */}
                <div className="viz-row">
                  <div className="viz-card activity-chart-container animate-fade-in">
                    <h3 className="section-title">Activity Over Time</h3>
                    <div className="activity-chart">
                      <Line data={activityChartData} options={chartOptions} />
                    </div>
                  </div>
                  
                  <div className="data-distributions">
                    <div className="viz-card donut-chart-container animate-fade-in">
                      <h3 className="section-title">Feature Priorities</h3>
                      <div className="donut-chart">
                        {priorityChartData && <Doughnut data={priorityChartData} options={doughnutOptions} />}
                      </div>
                    </div>

                  </div>
                </div>
                
                {/* Popular Tags */}
                {stats.projects.mostUsedTags && stats.projects.mostUsedTags.length > 0 && (
                  <div className="popular-tags-section animate-fade-in">
                    <h3 className="section-title">
                      <FaTag /> Popular Tags
                    </h3>
                    <div className="tags-cloud">
                      {stats.projects.mostUsedTags.map((tagItem, index) => (
                        <span 
                          key={index} 
                          className="popular-tag"
                          style={{
                            fontSize: `${Math.max(0.9, Math.min(1.5, 0.9 + (tagItem.count * 0.1)))}rem`
                          }}
                        >
                          {tagItem.tag}
                          <span className="tag-count">{tagItem.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Recent Activity */}
                <div className="recent-activity animate-fade-in">
                  <h3 className="section-title">Recent Activity</h3>
                  {stats.projects.recentActivity && stats.projects.recentActivity.length > 0 ? (
                    <div className="activity-cards">
                      {stats.projects.recentActivity.map((project) => (
                        <div 
                          key={project.id} 
                          className="activity-card"
                          onClick={() => navigate(`/project/${project.id}`)}
                        >
                          <div className="activity-icon">
                            <FaMusic />
                          </div>
                          <div className="activity-info">
                            <h4>{project.title}</h4>
                            <p>Updated {formatDate(project.updated_at, {year: 'numeric', month: 'short', day: 'numeric'})}</p>
                          </div>
                          <div className="activity-action">
                            <FaExternalLinkAlt />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <FaMusic className="empty-icon" />
                      <h4 className="empty-title">No recent activity</h4>
                      <p className="empty-subtitle">
                        Start creating projects or features to see activity here.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* User Achievements */}
                <div className="achievements-section animate-fade-in">
                  <h3 className="section-title">
                    <FaAward /> Achievements
                  </h3>
                  <div className="achievements-grid">
                    {stats.projects.total > 0 && (
                      <div className="achievement-card">
                        <div className="achievement-icon creator">
                          <FaMusic />
                        </div>
                        <div className="achievement-info">
                          <h4>Creator</h4>
                          <p>Created {stats.projects.total} music {stats.projects.total === 1 ? 'project' : 'projects'}</p>
                        </div>
                      </div>
                    )}
                    
                    {stats.features.created > 5 && (
                      <div className="achievement-card">
                        <div className="achievement-icon innovator">
                          <FaPuzzlePiece />
                        </div>
                        <div className="achievement-info">
                          <h4>Innovator</h4>
                          <p>Created over 5 feature requests</p>
                        </div>
                      </div>
                    )}
                    
                    {(stats.collabs?.total > 3) && (
                      <div className="achievement-card">
                        <div className="achievement-icon collaborator">
                          <FaHandshake />
                        </div>
                        <div className="achievement-info">
                          <h4>Collaborator</h4>
                          <p>Participated in multiple project collaborations</p>
                        </div>
                      </div>
                    )}
                    
                    {stats.comments?.total > 10 && (
                      <div className="achievement-card">
                        <div className="achievement-icon communicator">
                          <FaComments />
                        </div>
                        <div className="achievement-info">
                          <h4>Communicator</h4>
                          <p>Posted over 10 comments</p>
                        </div>
                      </div>
                    )}
                    
                    {stats.engagementScore > 100 && (
                      <div className="achievement-card">
                        <div className="achievement-icon enthusiast">
                          <FaFireAlt />
                        </div>
                        <div className="achievement-info">
                          <h4>Enthusiast</h4>
                          <p>Highly engaged with the platform</p>
                        </div>
                      </div>
                    )}
                    
                    {!(stats.projects.total > 0 || 
                       stats.features.created > 5 || 
                       (stats.collabs?.total > 3) ||
                       stats.comments?.total > 10) && (
                      <div className="empty-state">
                        <FaAward className="empty-icon" />
                        <h4 className="empty-title">No achievements yet</h4>
                        <p className="empty-subtitle">
                          Start creating projects, adding features, and collaborating with others to earn achievements.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Projects Tab */}
            {activeTab === "projects" && (
              <div className="projects-section">
                <h3 className="section-title">
                  <FaMusic /> Projects ({stats.projects.total})
                </h3>

                {stats.projects.projects && stats.projects.projects.length > 0 ? (
                  <div className="projects-grid">
                    {stats.projects.projects.map((project) => (
                      <div 
                        key={project.id} 
                        className="project-card"
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <div className="project-card-header">
                          <h3 className="project-title">{project.title}</h3>
                          <span className={`project-visibility ${project.visibility || 'public'}`}>
                            {project.visibility || 'Public'}
                          </span>
                        </div>
                        <div className="project-updated">
                          Updated {formatDate(project.updated_at, {year: 'numeric', month: 'short', day: 'numeric'})}
                        </div>
                        {project.hashtags && project.hashtags.length > 0 && (
                          <div className="project-tags">
                            {project.hashtags.map((tag, index) => (
                              <span key={index} className="project-tag">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <FaMusic className="empty-icon" />
                    <h4 className="empty-title">No projects yet</h4>
                    <p className="empty-subtitle">
                      {isOwnProfile ? 
                        "Start by creating your first music project!" : 
                        "This user hasn't created any projects yet."}
                    </p>
                    {isOwnProfile && (
                      <button 
                        className="create-new-btn"
                        onClick={() => navigate('/new-project')}
                      >
                        Create New Project
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Features Tab */}
            {activeTab === "features" && (
              <div className="features-section">
                <h3 className="section-title">
                  <FaPuzzlePiece /> Feature Requests ({stats.features.created})
                </h3>
                
                {stats.features.features && stats.features.features.length > 0 ? (
                  <div className="features-grid">
                    {stats.features.features.map((feature) => (
                      <div 
                        key={feature.id} 
                        className="feature-card"
                        onClick={() => navigate(`/project/${feature.project_id}/features`)}
                      >
                        <div className="feature-header">
                          <h3 className="feature-title">{feature.message}</h3>
                          <div className={`feature-priority priority-${feature.priority || 'medium'}`}>
                            {feature.priority || 'Medium'}
                          </div>
                        </div>
                        <p className="feature-description">
                          {feature.description && feature.description.length > 120 ? 
                            `${feature.description.substring(0, 120)}...` : 
                            feature.description}
                        </p>
                        <div className="feature-meta">
                          <div className="feature-date">
                            {formatDate(feature.created_at, {year: 'numeric', month: 'short', day: 'numeric'})}
                          </div>
                          <div className={`feature-status status-${feature.open ? 'open' : 'closed'}`}>
                            {feature.open ? 'Open' : 'Closed'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <FaPuzzlePiece className="empty-icon" />
                    <h4 className="empty-title">No features yet</h4>
                    <p className="empty-subtitle">
                      {isOwnProfile ? 
                        "Start by creating feature requests for your projects!" : 
                        "This user hasn't created any feature requests yet."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Collaborations Tab */}
            {activeTab === "collaborations" && (
              <div className="collaborations-section">
                <h3 className="section-title">
                  <FaHandshake /> Collaborations ({stats.collabs?.total || 0})
                </h3>
                
                {stats.collabs?.collabs && stats.collabs.collabs.length > 0 ? (
                  <div className="collaborations-grid">
                    {stats.collabs.collabs.map((collab) => (
                      <div 
                        key={collab.id} 
                        className="collab-card"
                        onClick={() => navigate(`/project/${collab.project_id}/collabs`)}
                      >
                        <div className="collab-header">
                          <h3 className="collab-project">{collab.Project.title}</h3>
                          <div className={`collab-status ${collab.status}`}>
                            {collab.status.charAt(0).toUpperCase() + collab.status.slice(1)}
                          </div>
                        </div>
                        
                        {/* <div className="collab-meta">
                          <div className="collab-meta-item">
                            <FaUser className="collab-meta-icon" />
                            <span>{collab.with_user || "Project Owner"}</span>
                          </div>
                          <div className="collab-meta-item">
                            <FaFileAlt className="collab-meta-icon" />
                            <span>{collab.file_count || "?"} Files</span>
                          </div>
                        </div> */}

                        <div className="collab-message">
                          "{collab.description && collab.description.length > 100 ? 
                            `${collab.description.substring(0, 100)}...` : 
                            collab.description || "No description provided"}"
                        </div>

                        {collab.tracks_modified && collab.tracks_modified.length > 0 && (
                          <div className="collab-meta tracks-meta">
                            <div className="collab-meta-item">
                              <FaMusic className="collab-meta-icon" />
                              <span>Modified: {collab.tracks_modified.slice(0, 2).join(", ")}
                              {collab.tracks_modified.length > 2 ? ` +${collab.tracks_modified.length - 2} more` : ""}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="collab-footer">
                          <div className="collab-date">
                            {formatDate(collab.created_at, {year: 'numeric', month: 'short', day: 'numeric'})}
                          </div>
                          <button className="collab-action">View Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <FaHandshake className="empty-icon" />
                    <h4 className="empty-title">No collaborations yet</h4>
                    <p className="empty-subtitle">
                      {isOwnProfile ? 
                        "Start collaborating with other musicians on their projects!" : 
                        "This user hasn't participated in any collaborations yet."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === "comments" && (
              <div className="comments-section">
                <h3 className="section-title">
                  <FaComments /> Comments ({stats.comments?.total || 0})
                </h3>
                
                {stats.comments?.comments && stats.comments.comments.length > 0 ? (
                  <div className="comments-list">
                    {stats.comments.comments.map((comment) => (
                      <div key={comment.id} className="comment-card">
                        <div className="comment-header">
                          <h4 className="comment-title">On feature #{comment.feature_id.substring(0, 8)}</h4>
                          <div className="comment-date">
                            {formatDate(comment.created_at, {year: 'numeric', month: 'short', day: 'numeric'})}
                          </div>
                        </div>
                        <p className="comment-message">{comment.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <FaComments className="empty-icon" />
                    <h4 className="empty-title">No comments yet</h4>
                    <p className="empty-subtitle">
                      {isOwnProfile ? 
                        "Start commenting on feature requests to get involved!" : 
                        "This user hasn't commented on any features yet."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="profile-error">
          <p>User profile not found.</p>
        </div>
      )}
    </motion.div>
  );
}

export default Profile;