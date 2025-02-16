import "../LandingHeader/LandingHeader.css";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthProvider";


function Header() {
  const navigate = useNavigate(); // React Router navigation hook

  const { user } = useAuth();

  return (
    <header className="header" style = {{position: "relative", height: "100px", backgroundColor: "transparent"}}>
      <div className="header-container">
        <div className="logo">🎧</div>
        <nav className="nav">
          {/* FA hamburger icon outline button */}
            <button className="buttonoutline" type="button" aria-label="Toggle navigation"
            style =
            {{
            }}>
                <i className="fas fa-bars"></i>
            </button>
            
        </nav>
        <div className="auth-buttons flex justify-center" style = {{paddingRight: "20px"}}>
          <img src={user ? user.photos[0].value : ""} alt="GitHub Avatar" className="" style = {{borderRadius: "50%", width: "30px", height:"30px", marginRight: "10px"}}/>
          <a className={"user"} onClick={() => navigate("/dashboard")} style = {{whiteSpace:"nowrap"}}>{user ? user.username : "Sign in"}</a>
        </div>
      </div>
    </header>
  );
};

export default Header;