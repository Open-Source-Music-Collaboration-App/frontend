/**
 * @file Dashboard.tsx
 * @description Dashboard component that displays a list of user projects with search and filtering capabilities.
 * This is the main landing page after authentication where users can view, search, and create projects.
 */

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthProvider";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaStar, FaHistory, FaCodeBranch, FaSearch } from "react-icons/fa";
import { motion } from "framer-motion";
import OnboardingTooltip from '../../components/OnboardingTooltip/OnboardingTooltip';
import FeatureBanner from "../../components/FeatureBanner.tsx/FeatureBanner";


/**
 * @function Dashboard
 * @description Main dashboard component that presents the user's projects in a grid layout.
 * Provides functionality for searching projects, creating new projects, and navigating to existing ones.
 * 
 * @returns {JSX.Element} The rendered dashboard interface
 */
function Dashboard() {
    const { user } = useAuth();
    
    /**
     * @interface Project
     * @description Defines the structure of project data retrieved from the API.
     * 
     * @property {string} id - Unique identifier for the project
     * @property {string} title - The name/title of the project
     * @property {string} created_by - ID of the user who created the project
     * @property {string} updated_at - ISO timestamp of when the project was last updated
     * @property {string[]} [hashtags] - Optional array of hashtags associated with the project
     */
    interface Project {
        id: string;
        title: string;
        created_by: string;
        updated_at: string;
        hashtags?: string[];
    }

    /**
     * @state projects
     * @description State that stores the list of user projects
     */
    const [projects, setProjects] = useState<Project[]>([]);
    
    /**
     * @state loading
     * @description State that tracks whether projects are currently being fetched
     */
    const [loading, setLoading] = useState<boolean>(true);
    
    /**
     * @state searchTerm
     * @description State that stores the current search query for filtering projects
     */
    const [searchTerm, setSearchTerm] = useState<string>("");
    
    /**
     * @ref hasFetchedProjects
     * @description Reference to track whether projects have already been fetched to prevent duplicate requests
     */
    const hasFetchedProjects = useRef(false);
    
    /**
     * @hook navigate
     * @description Hook for programmatic navigation between routes
     */
    const navigate = useNavigate();

    /**
     * @hook useEffect
     * @description Effect hook that fetches user's projects when the component mounts.
     * Uses a ref to prevent duplicate API calls on re-renders.
     * 
     * @dependency user - Re-runs when the user object changes
     */
    useEffect(() => {
        if (user && !hasFetchedProjects.current) {
            console.log("Fetching projects for user:", user);
            axios.get(`http://${window.location.hostname}:3333/api/projects/?owner_id=${user.id}`, { withCredentials: true })
                .then(response => setProjects(response.data))
                .catch(error => console.error("Error fetching projects:", error))
                .finally(() => setLoading(false));
            hasFetchedProjects.current = true;
        }
    }, [user]);

    /**
     * @function handleCreateProject
     * @description Navigates to the new project creation page
     * 
     * @returns {void}
     */
    const handleCreateProject = () => {
        navigate("/new-project");
    };

    /**
     * @computed filteredProjects
     * @description Filters the projects array based on the current search term.
     * Matches against project titles and hashtags.
     * 
     * @returns {Project[]} Filtered list of projects
     */
    const filteredProjects = searchTerm 
        ? projects.filter(project => 
            project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.hashtags && project.hashtags.some(tag => 
                tag.toLowerCase().includes(searchTerm.toLowerCase())
            ))
        )
        : projects;

    return (
        <motion.div 
            className="dashboard-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
        >
            <div className="dashboard-header">
                <div className="dashboard-header-left">
                    <h1>Projects</h1>
                    <div className="project-count">
                        {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                    </div>
                </div>
                
                <div className="dashboard-header-right">
                    <div className="search-container">
                        <FaSearch className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search projects..." 
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <OnboardingTooltip
                      stepId="create-project"
                      title="Create New Projects"
                      content="Click here to create a new music project. You can set up collaborators, add tracks, and start working on your next masterpiece."
                      position="left"
                    >
                      <button className="create-project-btn" onClick={handleCreateProject}>
                          <FaPlus /> New Project
                      </button>
                    </OnboardingTooltip>
                </div>
            </div>

            <FeatureBanner
              featureId="collaboration-2025-mar12"
              title="New Feature Added: Collaborating on Projects"
              description="You can now contribute to projects created by other users and document your changes."
              ctaText={projects.length > 0 ? `Try it on ${projects[0].title}` : "Create a New Project"}
              ctaLink={projects.length > 0 ? `/project/${projects[0].id}` : "/new-project"}
            />
            
            {loading ? (
                <div className="dashboard-loading">
                    <div className="spinner"></div>
                    <p>Loading your projects...</p>
                </div>
            ) : filteredProjects.length > 0 ? (
                <div className="projects-grid">
                    {filteredProjects.slice(0, 1).map((project, index) => (
                      <OnboardingTooltip 
                        stepId="project-card-intro"
                        title="Project Cards"
                        content="Each card represents a project you've created. Click on a card to open the project studio and start working on your music."
                        position="left"
                        style = {{width: "100%"}}
                      >
                        <motion.div 
                            key={project.id}
                            className="project-card"
                            onClick={() => navigate(`/project/${project.id}`)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            whileHover={{ boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3), 0 0 15px rgba(147, 0, 215, 0.1)" }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                        >
                            <div className="project-card-header">
                                <h3 className="project-title">{project.title}</h3>
                                <span className="project-visibility public">Public</span>
                            </div>
                            
                            <div className="project-waveform">
                                <div className="waveform-visualization"></div>
                            </div>
                            
                            <div className="project-details">
                                <p className="project-description">
                                    Last modified {new Date(project.updated_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </p>
                                
                                {project.hashtags && project.hashtags.length > 0 && (
                                    <div className="project-tags">
                                        {project.hashtags.map((tag, index) => (
                                            <span key={index} className="project-tag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="project-stats">
                                <div className="stat-item">
                                    <FaStar className="stat-icon" />
                                    <span>0</span>
                                </div>
                                {/* <div className="stat-item">
                                    <FaCodeBranch className="stat-icon" />
                                    <span>0</span>
                                </div>
                                <div className="stat-item">
                                    <FaHistory className="stat-icon" />
                                    <span>1 commit</span>
                                </div> */}
                            </div>
                        </motion.div>
                      </OnboardingTooltip>
                    ))}
                    {filteredProjects.slice(1).map((project, index) => (
                        <motion.div 
                            key={project.id}
                            className="project-card"
                            onClick={() => navigate(`/project/${project.id}`)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            whileHover={{ boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3), 0 0 15px rgba(147, 0, 215, 0.1)" }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                        >
                            <div className="project-card-header">
                                <h3 className="project-title">{project.title}</h3>
                                <span className="project-visibility public">Public</span>
                            </div>
                            
                            <div className="project-waveform">
                                <div className="waveform-visualization"></div>
                            </div>
                            
                            <div className="project-details">
                                <p className="project-description">
                                    Last modified {new Date(project.updated_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </p>
                                
                                {project.hashtags && project.hashtags.length > 0 && (
                                    <div className="project-tags">
                                        {project.hashtags.map((tag, index) => (
                                            <span key={index} className="project-tag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="project-stats">
                                <div className="stat-item">
                                    <FaStar className="stat-icon" />
                                    <span>0</span>
                                </div>
                                {/* <div className="stat-item">
                                    <FaCodeBranch className="stat-icon" />
                                    <span>0</span>
                                </div>
                                <div className="stat-item">
                                    <FaHistory className="stat-icon" />
                                    <span>1 commit</span>
                                </div> */}
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : searchTerm ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <FaSearch />
                    </div>
                    <h2>No matching projects</h2>
                    <p>We couldn't find any projects matching "{searchTerm}"</p>
                    <button className="clear-search-btn" onClick={() => setSearchTerm("")}>
                        Clear search
                    </button>
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-state-content">
                        <h2>No projects yet</h2>
                        <p>Create your first music project to get started</p>
                        <OnboardingTooltip
                          stepId="empty-dashboard"
                          title="Welcome to Your Dashboard"
                          content="This is where all your projects will appear. Get started by creating your first project using the 'New Project' button above."
                          position="top"
                          showAlways={true}
                        >
                          <button className="create-first-project-btn" onClick={handleCreateProject}>
                              <FaPlus /> Create New Project
                          </button>
                        </OnboardingTooltip>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

export default Dashboard;