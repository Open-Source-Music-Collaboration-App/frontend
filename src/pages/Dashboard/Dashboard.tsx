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
            <div>
                <h1>Dashboard</h1>
            </div>
        </div>
    );
}

export default Dashboard;

