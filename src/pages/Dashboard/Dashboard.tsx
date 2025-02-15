import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./Dashboard.css";

function Dashboard() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get("http://localhost:3333/api/me", { withCredentials: true })
        .then((res) => setUser(res.data.user))
        .catch(() => navigate("/login"));
    }, [navigate]);

    const handleLogout = () => {
        axios.get("http://localhost:3333/logout", { withCredentials: true })
            .then(() => {
                setUser(null);
                navigate("/");
            })
            .catch((error) => console.error("Logout error:", error));
    };

    return (
        <div className="dashboard-container">
            <Sidebar />
        {/* {user ? (
            <div className="dashboard-box">
            <h1>Welcome, {user.username} 👋</h1>
            <img src={user.photos[0].value} alt="GitHub Avatar" className="github-avatar" />
            <button className="logout-btn" onClick={handleLogout}>Log Out</button>
            </div>
        ) : (
            <p>Loading...</p>
        )} */}
        </div>
    );
}

export default Dashboard;

