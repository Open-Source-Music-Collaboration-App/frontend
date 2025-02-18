import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthProvider";
import "./Dashboard.css";

function Dashboard() {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        if (user) {
            console.log("Fetching projects for user:", user);
            axios.get(`http://localhost:3333/api/user_projects/${user.id}`, { withCredentials: true })
                .then(response => setProjects(response.data))
                .catch(error => console.error("Error fetching projects:", error));
        }
    }, [user]);

    return (
        <div className="dashboard-container">
            <ul>
                {projects.map((project) => (
                    <li key={project.id}>
                        <h3>{project.title}</h3>
                        {/* Month Day, Year */}
                        <p>{project.createdBy} Last Updated: {new Date(project.updatedAt).toLocaleDateString()}</p>
                        {project.hashtags && (
                            <p>Tags: {project.hashtags.join(", ")}</p>
                        )}
                        {/* <button className = "buttonoutline" onClick={() => window.location.href = `/project/${project.id}`}>
                            View Project
                        </button> */}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Dashboard;