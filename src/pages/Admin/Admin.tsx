import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthProvider";
import axios from "axios";
import { motion } from "framer-motion";
import { FaUser, FaCalendarAlt, FaFolder, FaSearch } from "react-icons/fa";
import "./Admin.css";

/**
 * @interface User
 * @description Defines user data structure for the admin panel
 */
interface User {
  id: string;
  name: string;
  created_at: string;
  photo?: string;
  projects?: Project[];
}

/**
 * @interface Project
 * @description Defines project data structure for the admin panel
 */
interface Project {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * @function Admin
 * @description Admin component that displays all users and their projects
 */
function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [expandedUsers, setExpandedUsers] = useState<string[]>([]);

  // Fetch all users and their projects
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/admin/users`, { 
          withCredentials: true 
        });
        setUsers(response.data);
      } catch (err) {
        console.error("Failed to load users:", err);
        setError("Failed to load users. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchUsers();
    }
  }, [user]);

  // Toggle project list expansion for a user
  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Format date to readable string
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter users based on search term
  const filteredUsers = searchTerm
    ? users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(user.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.projects?.some(project => 
          project.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : users;

  return (
    <motion.div 
      className="admin-container" 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="admin-header">
        <div className="admin-title-section">
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">View and manage users and their projects</p>
        </div>
        
        <div className="admin-search">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search users or projects..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading user data...</p>
        </div>
      ) : (
        <div className="users-list">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div key={user.id} className="user-card">
                <div 
                  className="user-header" 
                  onClick={() => toggleUserExpansion(user.id)}
                >
                  <div className="user-info">
                    <img 
                      src={user.photo || `https://avatars.githubusercontent.com/u/${user.id}?v=4`}
                      alt={user.name} 
                      className="user-avatar" 
                    />
                    <div className="user-details">
                      <h2 className="user-name">{user.name}</h2>
                      <div className="user-metadata">
                        <div className="metadata-item">
                          <FaUser className="metadata-icon" />
                          <span>ID: {user.id}</span>
                        </div>
                        <div className="metadata-item">
                          <FaCalendarAlt className="metadata-icon" />
                          <span>Created: {formatDate(user.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="projects-count">
                    <FaFolder className="folder-icon" />
                    <span>{user.projects?.length || 0} Projects</span>
                  </div>
                </div>
                
                {expandedUsers.includes(user.id) && (
                  <motion.div 
                    className="projects-list"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {user.projects && user.projects.length > 0 ? (
                      user.projects.map((project) => (
                        <div key={project.id} className="project-item" onClick={() => window.location.href = `/project/${project.id}`}>
                          <div className="project-item-content">
                            <h3 className="project-title">{project.title}</h3>
                            <div className="project-dates">
                              <div className="date-item">
                                <FaCalendarAlt className="date-icon" />
                                <span>Created: {formatDate(project.created_at)}</span>
                              </div>
                              <div className="date-item updated">
                                <FaCalendarAlt className="date-icon" />
                                <span>Updated: {formatDate(project.updated_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-projects">No projects found for this user</div>
                    )}
                  </motion.div>
                )}
              </div>
            ))
          ) : (
            <div className="no-results">
              <FaSearch className="no-results-icon" />
              <h2>No users found</h2>
              <p>Try adjusting your search criteria</p>
              {searchTerm && (
                <button className="reset-search" onClick={() => setSearchTerm("")}>
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default Admin;