// src/App.tsx
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
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import NewProject from './pages/NewProject/NewProject';
import Project from './pages/Project/Project';
import History from './pages/History/History';
import CollabRequests from "./pages/CollabRequest/CollabRequests";
import PageTransition from "./components/PageTransition/PageTransition";
import Settings from "./pages/Settings/Settings";
import NotFound from "./pages/NotFound/NotFound";
import Features from "./pages/Features/Features";
import Admin from "./pages/Admin/Admin";
import Profile from "./pages/Profile/Profile";
import { OnboardingProvider } from "./context/OnboardingProvider";
import WelcomeTour from "./components/WelcomeTour/WelcomeTour";
import DiffViewer from "./components/DiffViewer/DiffViewer";

function App() {
  return (
    <>
      <Router>
        <ErrorBoundary>
          <AuthProvider>
            <OnboardingProvider>
              <WelcomeTour />
              <Routes>
                <Route path="/" element={
                    <Layout />
                }> 
                  <Route index element={<Landing />} /> {/* Landing Page */}
                  <Route path="/login" element={<Login />} /> {/* Login Page */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} /> {/* Dashboard Page */}
                    <Route path="/new-project" element={<NewProject />} /> {/* New Project Page */}
                    <Route path="/project/:id" element={<Project />} /> {/* Project Page */}
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/project/:id/history" element={<History />} />
                    <Route path="/project/:id/collabs" element={<CollabRequests/>}/>
                    <Route path="/project/:id/features" element={<Features />} />
                    <Route path="/project/:id/diff/:hash/:prevHash" element={<DiffViewer />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Route>
              </Routes>
            </OnboardingProvider>
          </AuthProvider>
        </ErrorBoundary>
      </Router>
    </>
  );
}

export default App;