import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Login/Login";
import "./App.css";
import Sidebar from "./components/Sidebar/Sidebar";

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
      {user ? (
        <div className="dashboard-box">
          <h1>Welcome, {user.username} 👋</h1>
          <img src={user.photos[0].value} alt="GitHub Avatar" className="github-avatar" />
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} /> {/* Landing Page */}
        <Route path="/login" element={<Login />} /> {/* Login Page */}
        <Route path="/dashboard" element={<Dashboard />} /> {/* Dashboard Page */}
      </Routes>
    </Router>
  );
}

export default App;