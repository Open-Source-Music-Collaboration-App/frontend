import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import "./App.css";
import Sidebar from "./components/Sidebar/Sidebar";
import LandingHeader from "./components/LandingHeader/LandingHeader";
import Header from "./components/Header/Header";
import Layout from "./components/Layout/Layout";
import AuthProvider from "./context/AuthProvider";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <>
      <Router>
        {/* if in Landing or Login page then show LandingHeader otherwise show Header */}
        {/* { (window.location.pathname === "/login" || window.location.pathname === "/")  ? <LandingHeader /> : <Header />} */}
        {/* <Header /> */}
        <Routes>
          <Route path="/" element={<Layout />}> 
            <Route index element={<Landing />} /> {/* Landing Page */}
            <Route path="/login" element={<Login />} /> {/* Login Page */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} /> {/* Dashboard Page */}
            </Route>
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;