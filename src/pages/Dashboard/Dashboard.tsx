import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./Dashboard.css";
import { useAuth } from "../../context/AuthProvider";

function Dashboard() {
    const { user } = useAuth();

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

