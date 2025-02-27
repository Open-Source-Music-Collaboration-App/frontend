import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import LandingHeader from "../LandingHeader/LandingHeader";
import Header from "../Header/Header";
import ProjectHeader from "../ProjectHeader/ProjectHeader";
import Sidebar from "../Sidebar/Sidebar";
import PageTransition from "../PageTransition/PageTransition";


// function to return the correct type of header based on the page
function getHeader(path: string, toggleSidebar: () => void) {
  if( path === "/login" || path === "/" ) {
    return <LandingHeader />;
  }

  let formattedHeaderText = path.substring(1).replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  if( path === "/dashboard" || path === "/new-project" ) {
    return <Header toggleSidebar={toggleSidebar} page={formattedHeaderText} />;
  }

  else if( path.includes("/project/") ) {
    return <ProjectHeader toggleSidebar={toggleSidebar} page="Project" />;
  }
}




const Layout = () => {
  const location = useLocation();

  let landingOrLogin = (location.pathname === "/login" || location.pathname === "/");
  let needSidebar = (location.pathname === "/dashboard" || location.pathname === "/new-project");

  const [isSidebarOpen, setIsSidebarOpen] = useState( landingOrLogin ? false : true );

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <>
      { getHeader(location.pathname, toggleSidebar) }
      <div className="main-container">
        { needSidebar && <Sidebar isOpen={isSidebarOpen} /> }
          <main className={isSidebarOpen && needSidebar ? "content-shifted" : ""}>
            <Outlet />
          </main>
      </div>
    </>
  );
};

export default Layout;