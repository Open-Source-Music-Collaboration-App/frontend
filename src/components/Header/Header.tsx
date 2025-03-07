/**
 * @file Header.tsx
 * @description Header component that provides navigation and application branding.
 * This component is displayed at the top of the application and contains essential
 * navigation elements, branding, and user controls.
 *
 */

import "../LandingHeader/LandingHeader.css";
import "../Header/Header.css";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthProvider";

import pullRequestIcon from "../../assets/pull-request.svg";
import ProfileDropdown from "../ProfileDropdown/ProfileDropdown";

/**
 * @interface User
 * @description Interface for the user object.
 *
 * @property {Array<{ value: string }>} [photos] - Optional array of user photos.
 * @property {string} username - The username of the user.
 * @property {string} id - The ID of the user.
 */
interface User {
    photos?: { value: string }[],
    username: string,
    id: string,
}

/**
 * @interface HeaderProps
 * @description Interface for the props of the Header component.
 *
 * @property {() => void} toggleSidebar - Function to toggle the sidebar.
 * @property {string} page - The current page name.
 */
interface HeaderProps {
    toggleSidebar: () => void;
    page: string;
}

/**
 * @function Header
 * @description A functional component that renders the application header with navigation,
 * branding, and user controls. The header is responsive and adapts to various screen sizes.
 *
 * @param {HeaderProps} props - Component props.
 * @returns {React.ReactElement} The rendered Header component.
 */
function Header({ toggleSidebar, page }: HeaderProps): React.ReactElement {
    const navigate = useNavigate();
    const { user } = useAuth() as { user: User; logout: () => void };

    const [toggleProfileDropdown, setToggleProfileDropdown] = useState(false);
    useEffect(() => {
        /**
         * @function handleClickOutside
         * @description Handles clicks outside the profile dropdown to close it.
         *
         * @param {Event} event - The click event.
         * @returns {void}
         */
        function handleClickOutside(event: any): void {
            if (!event.target.closest(".profile-dropdown") && !event.target.closest(".profile-picture")) {
                setToggleProfileDropdown(false);
            }
        }

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    return (
        <header className="header">
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
                    <button className="buttonfill" type="button" aria-label="New Project" onClick={() => navigate("/new-project")}>
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
                            {toggleProfileDropdown && <ProfileDropdown toggleProfileDropdown={toggleProfileDropdown} />}
                        </div>
                    ) : null}
                </div>
            </div>
        </header>
    );
}

export default Header;