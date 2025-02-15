import "./LandingHeader.css";
import { useNavigate } from "react-router-dom";


function LandingHeader() {
const navigate = useNavigate(); // React Router navigation hook
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">🎧</div>
        <nav className="nav">
          <ul>
            <li><a href="#">About</a></li>
            <li><a href="#">Open Source</a></li>
            <li><a href="#">Pricing</a></li>
          </ul>
        </nav>
        <div className="auth-buttons">
          <a className={"sign-in"} onClick={() => navigate("/login")}>Sign in</a>
          <a href="#" className="sign-up ml-3">Sign up</a>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;