import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import LandingHeader from "../LandingHeader/LandingHeader";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";

const Layout = () => {
  const location = useLocation();

  let landingOrLogin = (location.pathname === "/login" || location.pathname === "/");

  const [isSidebarOpen, setIsSidebarOpen] = useState( landingOrLogin ? false : true );

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  let headerLocationText = "";
  if (location.pathname === "/dashboard") {
    headerLocationText = "Dashboard";
  }
  else if (location.pathname === "/new-project") {
    headerLocationText = "New project";
  }
  else if (location.pathname === "/settings") {
    headerLocationText = "Settings";
  }
  else if (location.pathname === "/profile") {
    headerLocationText = "Profile";
  }
  else if (location.pathname === "/projects") {
    headerLocationText = "Projects";
  }

  return (
    <>
      { landingOrLogin
        ? <LandingHeader />
        : <Header toggleSidebar={toggleSidebar} page={headerLocationText} />
      }
      <div className="main-container">
        { !landingOrLogin && <Sidebar isOpen={isSidebarOpen} /> }
        <main className={isSidebarOpen && !landingOrLogin ? "content-shifted" : ""}>
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default Layout;