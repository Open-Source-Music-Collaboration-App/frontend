import LandingHeader from "../LandingHeader/LandingHeader";
import Header from "../Header/Header";
import { Outlet, useLocation } from "react-router-dom";

const Layout = () => {
  const location = useLocation()
  return (
    <>
      {
        (location.pathname === '/login' || location.pathname === '/')
          ? <LandingHeader />
          : <Header />
      }
      <main><Outlet /></main>
    </>
  )
}

export default Layout;