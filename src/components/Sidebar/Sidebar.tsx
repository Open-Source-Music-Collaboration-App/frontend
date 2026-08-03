import React, { useEffect, useState } from "react";
import { CiMusicNote1 } from "react-icons/ci";
import { FaCompass, FaHome, FaPlus, FaStar } from "react-icons/fa";
// import { useAuth } from "../../context/AuthProvider";
import { useNavigate } from "react-router-dom";

import "./Sidebar.css";

function Sidebar({ isOpen }) {
  const buttons = [
    { label: "Home", icon: <FaHome />, path:"/" },
    { label: "Explore", icon: <FaCompass />, path:"/explore" },
    { label: "Create with Artists", icon: <FaStar />, path:"/outside-lands" },
    { label: "My Projects", icon: <CiMusicNote1 />, path:"/dashboard" },
    { label: "+ New Project", icon: <FaPlus />, path:"/new-project" },
  ];
  const [selected, setSelected] = useState(buttons[0].label);

  const navigate = useNavigate();
  // const { user } = useAuth() as { user: any };

  function buttonClicked(label, path) {
    setSelected(label);
    navigate(path);
  }

  //when user clcs new project from the header the sidebar clicked button selected button should be updated and not be selecting both buttons
  useEffect(() => {
    if (window.location.pathname === "/new-project") {
      setSelected("+ New Project");
    } else if (window.location.pathname === "/outside-lands") {
      setSelected("Create with Artists");
    } else if (window.location.pathname === "/dashboard") {
      setSelected("My Projects");
    }
  }, [window.location.pathname]);


  return (
    <div className={`sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <div className ="top">
        <p className="sidebar-label">NAVIGATE</p>
        {buttons.map((button) => (
          <button
            key={button.label}
            onClick={() => buttonClicked(button.label, button.path)}
            // className={`sidebar-btn ${selected === button.label || ? "selected" : ""}`}
            className={`sidebar-btn ${(window.location.pathname === button.path || selected == button.label) ? "selected" : ""}`}
          >
            <span className="icon">{button.icon}</span>
            <a>{button.label}</a>
          </button>
        ))}
      </div>

      {/* May be useful later, dont delete commented code */}
      {/* <div className="bottom">
        <button className="buttonoutline" style = {{ height: "40px" }} type="button" aria-label="Sign out">
          <span className = "icon"><i className="fas fa-sign-out-alt"></i></span>
        </button>

        <button className="buttonoutline" style = {{ height: "40px"}} type="button" aria-label="Sign out">
          <span className = "icon"><i className="fas fa-cog"></i></span>
        </button>
      </div> */}
    </div>
  );
}

export default Sidebar;
