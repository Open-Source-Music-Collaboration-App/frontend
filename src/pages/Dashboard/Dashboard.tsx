import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthProvider";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";

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

    return (
        <div className="dashboard-container">
            {loading ? (
                <div className="spinner"></div>
            ) : (
                <ul>
                    {projects.map((project) => (
                        <li key={project.id}
                            onClick={() => navigate(`/project/${project.id}`)}>
                            <h3>{project.title}</h3>
                            <p>{project.createdBy} Last Updated: {new Date(project.updated_at).toLocaleDateString()}</p>
                            {project.hashtags && (
                                <p>Tags: {project.hashtags.join(", ")}</p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default Dashboard;