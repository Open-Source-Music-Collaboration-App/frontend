import "../LandingHeader/LandingHeader.css";
import "../Header/Header.css";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthProvider";

import pullRequestIcon from "../../assets/pull-request.svg";

function Header({ toggleSidebar, page }) {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <header className="header" style={{ position: "relative", backgroundColor: "transparent" }}>
            <div className="header-container">
                <button className="buttonoutline" type="button" aria-label="Toggle navigation" onClick={toggleSidebar} style={{ marginRight: "10px" }}>
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
                        <span style = {{marginRight: "4px"}}>＋</span> New Project
                    </button>
                    <button className="buttonoutline" type="button" aria-label="Collab Requests">
                        <img src={pullRequestIcon} alt="Collab Requests" />
                    </button>
                    {user && user.photos?.[0]?.value ? (
                        <img
                            src={user.photos[0].value}
                            alt="GitHub Avatar"
                            style={{
                                borderRadius: "50%",
                                width: "40px",
                                height: "40px",
                                marginRight: "10px",
                            }}
                        />
                    ) : null}
                </div>
            </div>
        </header>
    );
}

export default Header;