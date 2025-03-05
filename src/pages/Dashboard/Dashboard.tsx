import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthProvider";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaStar, FaHistory, FaCodeBranch, FaSearch } from "react-icons/fa";
import { motion } from "framer-motion";

function Dashboard() {
    const { user } = useAuth();
    interface Project {
        id: string;
        title: string;
        created_by: string;
        updated_at: string;
        hashtags?: string[];
    }

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const hasFetchedProjects = useRef(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (user && !hasFetchedProjects.current) {
            console.log("Fetching projects for user:", user);
            axios.get(`http://localhost:3333/api/projects/?owner_id=${user.id}`, { withCredentials: true })
                .then(response => setProjects(response.data))
                .catch(error => console.error("Error fetching projects:", error))
                .finally(() => setLoading(false));
            hasFetchedProjects.current = true;
        }
    }, [user]);

    const handleCreateProject = () => {
        navigate("/new-project");
    };

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
            transition={{ duration: 0.3 }}
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
                    <button className="create-project-btn" onClick={handleCreateProject}>
                        <FaPlus /> New Project
                    </button>
                </div>
            </div>
            
            {loading ? (
                <div className="dashboard-loading">
                    <div className="spinner"></div>
                    <p>Loading your projects...</p>
                </div>
            ) : filteredProjects.length > 0 ? (
                <div className="projects-grid">
                    {filteredProjects.map((project) => (
                        <motion.div 
                            key={project.id}
                            className="project-card"
                            onClick={() => navigate(`/project/${project.id}`)}
                            whileHover={{ boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3), 0 0 15px rgba(147, 0, 215, 0.1)" }}
                            transition={{ duration: 0.2 }}
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
                                <div className="stat-item">
                                    <FaCodeBranch className="stat-icon" />
                                    <span>0</span>
                                </div>
                                <div className="stat-item">
                                    <FaHistory className="stat-icon" />
                                    <span>1 commit</span>
                                </div>
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
                        <button className="create-first-project-btn" onClick={handleCreateProject}>
                            <FaPlus /> Create New Project
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

export default Dashboard;