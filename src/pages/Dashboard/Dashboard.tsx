import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthProvider";
import "./Dashboard.css";

function Dashboard() {
    const { user } = useAuth();
    interface Project {
        id: string;
        title: string;
        createdBy: string;
        updatedAt: string;
        hashtags?: string[];
    }

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const hasFetchedProjects = useRef(false);

    useEffect(() => {
        if (user && !hasFetchedProjects.current) {
            console.log("Fetching projects for user:", user);
            axios.get(`http://localhost:3333/api/user_projects/${user.id}`, { withCredentials: true })
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
                        <li key={project.id}>
                            <h3>{project.title}</h3>
                            <p>{project.createdBy} Last Updated: {new Date(project.updatedAt).toLocaleDateString()}</p>
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