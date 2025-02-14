import React, { useEffect, useState } from "react";
import { CiMusicNote1 } from "react-icons/ci";
import { FaUser } from "react-icons/fa";
import { IoEllipsisHorizontal } from "react-icons/io5";

function Sidebar() {
  const buttons = [
    { label: "All Projects", icon: <CiMusicNote1 /> },
    { label: "Another Project", icon: <FaUser /> },
    { label: "Discover Projects", icon: <IoEllipsisHorizontal /> },
  ];
  const [selected, setSelected] = useState(buttons[0].label);

  return (
    <div className="flex flex-col space-y-4 font-extrabold text-lg">
      {buttons.map((button) => (
        <button
          key={button.label}
          onClick={() => setSelected(button.label)}
          className={`py-2.5 px-5 flex items-center justify-center space-x-2  focus: border transition-colors 
          ${selected === button.label ? "bg-gray-400 border-gray-500" : "bg-transparent cursor-pointer"}
          hover:bg-gray-500 hover:text-white `}
        >
          <span className="mr-2 bg-gray-300 px-1.5 py-1.5 rounded-sm">
            {button.icon}
          </span>
          {button.label}
        </button>
      ))}
    </div>
  );
}

export default Sidebar;
