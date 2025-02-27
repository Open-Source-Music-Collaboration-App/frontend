
import React from "react";
import "./ProfileDropdown.css";
import profileSvg from "../../assets/profile.svg";
import settingsSvg from "../../assets/settings.svg";
import logoutSvg from "../../assets/logout.svg";
import { useAuth } from "../../context/AuthProvider";

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface User {
  photos?: { value: string }[];
  username: string;
  id: string;
}



function ProfileDropdown({ toggleProfileDropdown }) {

  const navigate = useNavigate();
  const { user, logout } = useAuth() as { user: User; logout: () => void };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
      <div className={`profile-dropdown ${toggleProfileDropdown ? "active" : ""}`}>
          <div className="profile-dropdown-option">
              <img src={profileSvg} alt="Profile" />
              <a href="/profile">Profile</a>
          </div>
          <div className="profile-dropdown-option" >
              <img src={settingsSvg} alt="Settings" />
              <a href="/settings">Settings</a>
          </div>

          <hr/>

          <div className="profile-dropdown-option" onClick={handleLogout}>
              <img src={logoutSvg} alt="Logout" />
              <a>Sign out</a>
          </div>
      </div>
  );
}

export default ProfileDropdown;