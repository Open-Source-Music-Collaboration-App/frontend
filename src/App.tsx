import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "tailwindcss";
import "./App.css";
import Sidebar from "./components/Sidebar/Sidebar.tsx";
import Landing from "./pages/Landing/Landing.tsx";

function App() {
    return <Landing />;
//   return <Sidebar />;
}
export default App;
