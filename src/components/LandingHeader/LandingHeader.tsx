import "./LandingHeader.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";


function LandingHeader() {
const navigate = useNavigate(); // React Router navigation hook
const { user } = useAuth();
  return (
    <header className="landingheader">
      <div className="header-container">
        <button className="logo" onClick={() => navigate(user ? "/dashboard" : "/")}>OUTSIDESYNQ</button>
        <div className="nav-spacer" aria-hidden="true" />
        <div className="auth-buttons">
          <button className="sign-in" onClick={() => navigate(user ? "/dashboard" : "/login")}>{user ? "Enter studio" : "Sign in"}</button>
          {!user && <button className="sign-up ml-3" onClick={() => navigate("/login")}>Get started</button>}
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
