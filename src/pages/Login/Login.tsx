import "./Login.css";
import { useAuth } from "../../context/AuthProvider";
import { apiUrl } from "../../config/api";
import { Navigate } from "react-router-dom";
function Login() {
const { user, loading, logout } = useAuth() as { user: any; loading: boolean; logout: () => void };

  const handleLogin = () => {
    window.location.href = `${apiUrl}/auth/github`;
  };

  const handleLogout = () => {
    logout()
  };

  if (loading) return <div className="login-container" />;
  if (user) return <Navigate to="/dashboard" replace />;

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
        <p className="login-note">
          Signing in with GitHub creates your account automatically.
        </p>
      </div>
    </>
  );
}

export default Login;
