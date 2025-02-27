import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthProvider";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Project.css";
import { motion } from "framer-motion";

function Project() {
    const { id } = useParams();
    const { user } = useAuth();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const [owner, setOwner] = useState<string | null>(null);

    // the img next tot he project name shhould be the github avatar of the user who created the project not the avatar of the user who is logged in
    // the image should  be fetched using the username of the user who created the project

    useEffect(() => {
        if (user && id) {
            axios.get(`http://localhost:3333/api/projects/${id}`, { withCredentials: true })
                .then(response => {
                    console.log("Project data:", response.data);
                    setProject(response.data);
                })
                .catch(error => {
                    console.error("Error fetching project:", error);
                    navigate("/dashboard");
                })
                .finally(() => setLoading(false));
        }
    }, [user, id]);

    if (!user) {
        navigate("/login");
        return <div>Redirecting to login...</div>;
    }

   return (
    <motion.div 
      className="project-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="project-abstract">
          <img src={project &&`https://avatars.githubusercontent.com/u/${project[0].user_id}?v=4`}
              alt="GitHub Avatar" className="profile-picture" />
          <h2 className="project-title">{project ? project[0].title : ""}</h2>
          <span className="project-visibility public">Public</span>
      </div>
    </motion.div>
   )
}

export default Project;