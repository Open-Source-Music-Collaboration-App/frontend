import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import LandingHeader from "../../components/LandingHeader/LandingHeader";
function Login() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("http://localhost:3333/api/me", { withCredentials: true })
      .then((res) => setUser(res.data.user))
      .catch(() => console.log("Not logged in"));
  }, []);

  const handleLogin = () => {
    window.location.href = "http://localhost:3333/auth/github"; // Redirect to GitHub OAuth
  };

  const handleLogout = () => {
    axios.get("http://localhost:3333/logout", { withCredentials: true }).then(() => {
      setUser(null);
      navigate("/"); // Redirect to home after logout
    });
  };

  return (
    <>
        {/* <LandingHeader /> */}
        <div className="login-container">
        <div className="login-box">
            <h1 className="login-title">🎧</h1>

            {user ? (
            <div className="user-info">
                <p>Welcome, <strong>{user.username}</strong>!</p>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
            ) : (
            <button className="github-login-btn" onClick={handleLogin}>
                <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub Logo" />
                Sign in with GitHub
            </button>
            )}
        </div>
        <div>
            <p
            className="text-center text-white"
            >Don't have an account? <a
            href="http://localhost:3000/signup"
            className="text-purple-500"
            >Sign Up</a></p>
        </div>
        </div>
    </>
  );
}

export default Login;