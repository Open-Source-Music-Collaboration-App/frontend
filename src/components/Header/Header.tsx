import "../LandingHeader/LandingHeader.css";
import "../Header/Header.css";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthProvider";

import logoutSvg from "../../assets/logout.svg";
import profileSvg from "../../assets/profile.svg";
import settingsSvg from "../../assets/settings.svg";

import pullRequestIcon from "../../assets/pull-request.svg";

/*
A dropdown that shows a column of options when the profile picture is clicked.
The column of options includes Profile, Settings, and Logout.
*/
function ProfileDropdown({ toggleProfileDropdown, handleLogout }) {
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

function Header({ toggleSidebar, page }) {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [toggleProfileDropdown, setToggleProfileDropdown] = useState(false);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (!event.target.closest(".profile-dropdown") && !event.target.closest(".profile-picture")) {
                setToggleProfileDropdown(false);
            }
        }

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    return (
        <header className="header" style={{ position: "relative", backgroundColor: "transparent" }}>
            <div className="header-container">
                <button
                    className="buttonoutline"
                    type="button"
                    aria-label="Toggle navigation"
                    onClick={toggleSidebar}
                    style={{ marginRight: "10px" }}
                >
                    <i className="fas fa-bars"></i>
                </button>
                <div className="logo">🎧</div>
                <nav className="nav">
                    <div className="headerText">
                        <span className="bold">{page}</span>
                    </div>
                </nav>
                <div className="right">
                    <button className="buttonfill" type="button" aria-label="New Project">
                        <span style={{ marginRight: "4px" }}>＋</span> New Project
                    </button>
                    <button className="buttonoutline" type="button" aria-label="Collab Requests">
                        <img src={pullRequestIcon} alt="Collab Requests" />
                    </button>
                    {user && user.photos?.[0]?.value ? (
                        <div className="profile-container" style={{ position: "relative" }}>
                            <img
                                src={user.photos[0].value}
                                alt="GitHub Avatar"
                                className="profile-picture"
                                style={{
                                    borderRadius: "50%",
                                    width: "40px",
                                    height: "40px",
                                    marginRight: "10px",
                                    cursor: "pointer",
                                }}
                                onClick={() => setToggleProfileDropdown(!toggleProfileDropdown)}
                            />
                            {toggleProfileDropdown && <ProfileDropdown toggleProfileDropdown={toggleProfileDropdown} handleLogout={handleLogout} />}
                        </div>
                    ) : null}
                </div>
            </div>
        </header>
    );
}

export default Header;