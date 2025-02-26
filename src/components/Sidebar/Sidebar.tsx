import React, { useEffect, useState } from "react";
import { CiMusicNote1 } from "react-icons/ci";
import { FaUser } from "react-icons/fa";
import { IoAdd, IoEllipsisHorizontal } from "react-icons/io5";
// import { useAuth } from "../../context/AuthProvider";
import { useNavigate } from "react-router-dom";

import "./Sidebar.css";

function Sidebar({ isOpen }) {
  const buttons = [
    { label: "All Projects", icon: <CiMusicNote1 />, id:"all-projects" },
    // { label: "My Projects", icon: <FaUser /> },
    // { label: "Discover Projects", icon: <IoEllipsisHorizontal /> }
    { label: "New Project", icon: <IoAdd />, id:"new-project" },
  ];
  const [selected, setSelected] = useState(buttons[0].label);

  const navigate = useNavigate();
  // const { user } = useAuth() as { user: any };

  function buttonClicked(label) {
    setSelected(label);
    if (label === "New Project") {
      navigate("/new-project");
    } else if (label === "All Projects") {
      navigate("/dashboard");
    }
  }

  //when user clcs new project from the header the sidebar clicked button selected button should be updated and not be selecting both buttons
  useEffect(() => {
    if (window.location.pathname === "/new-project") {
      setSelected("New Project");
    } else if (window.location.pathname === "/dashboard") {
      setSelected("All Projects");
    }
  }, [window.location.pathname]);


  return (
    <div className={`sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <div className ="top">
        {buttons.map((button) => (
          <button
            key={button.label}
            onClick={() => buttonClicked(button.label)}
            // className={`sidebar-btn ${selected === button.label || ? "selected" : ""}`}
            className={`sidebar-btn ${(window.location.pathname === `/${button.id}` || selected == button.label) ? "selected" : ""}`}
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
