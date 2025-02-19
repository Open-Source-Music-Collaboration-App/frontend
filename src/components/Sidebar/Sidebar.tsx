import React, { useEffect, useState } from "react";
import { CiMusicNote1 } from "react-icons/ci";
import { FaUser } from "react-icons/fa";
import { IoEllipsisHorizontal } from "react-icons/io5";

import "./Sidebar.css";

function Sidebar({ isOpen }) {
  const buttons = [
    { label: "All Projects", icon: <CiMusicNote1 /> },
    { label: "My Projects", icon: <FaUser /> },
    { label: "Discover Projects", icon: <IoEllipsisHorizontal /> }
  ];
  const [selected, setSelected] = useState(buttons[0].label);

  return (
    <div className={`sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <div className ="top">
        {buttons.map((button) => (
          <button
            key={button.label}
            onClick={() => setSelected(button.label)}
            className={`sidebar-btn ${selected === button.label ? "selected" : ""}`}
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
