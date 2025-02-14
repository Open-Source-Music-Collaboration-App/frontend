import React, { useEffect, useState } from "react";

function Sidebar() {
  const buttons = [
    { label: "All Projects", icon: "/path/to/all-projects.svg" }, // Path to your SVG file
    { label: "Another Project", icon: "/path/to/another-project.svg" },
    { label: "Discover Projects", icon: "/path/to/discover-projects.svg" },
  ];
  const [selected, setSelected] = useState(buttons[0]);

  return (
    <div className="flex flex-col space-y-2">
      {buttons.map((button) => (
        <button
          key={button.label}
          onClick={() => setSelected(button)}
          className={`py-2.5 px-5 text-sm font-medium focus:          border transition-colors
          ${selected === button ? "bg-gray-400 border-gray-500" : "bg-transparent"}
          hover:bg-gray-500 hover:text-white`}
        >
          {button.label}
          <span className="mr-2">
            <img src={button.icon} alt={button.label} className="w-5 h-5" />
          </span>
        </button>
      ))}
    </div>
  );
}

export default Sidebar;
