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
      <div className = "upload-container">
          <div className="upload-box">
              <h3 className="upload-title">Upload Folder</h3>
              <p className="upload-description">Upload your folder here</p>
              <input 
                type="file" className="upload-input" webkitdirectory="true" directory="true"

                />
              <button className="upload-btn"
                onClick={async () => {
                  const formData = new FormData();
                  const fileInput = document.querySelector(".upload-input") as HTMLInputElement;
                  const files = fileInput?.files;

                  if (files) {
                    for (let i = 0; i < files.length; i++) {
                      //if file name ends with .json or .wav then append it to the formData
                      if (files[i].name.endsWith(".json") || files[i].name.endsWith(".wav") || files[i].name.endsWith(".als")) {
                        formData.append("files", files[i]); // Append each file
                      }
                    }
                  }

                  // ✅ Convert JSON body to a Blob before appending to FormData
                  const jsonBlob = new Blob([JSON.stringify({
                    projectId: id,
                    userId: user.username,
                    commitMessage: "commit placeholder",
                  })], { type: "application/json" });

                  formData.append("jsonData", jsonBlob); // Append JSON as a Blob

                  

                  try {
                    const response = await axios.post("http://localhost:3333/api/upload", formData, {
                      withCredentials: true,
                      headers: {
                        "Content-Type": "multipart/form-data",
                      }
                    });

                    console.log("Upload successful:", response.data);
                  } catch (error) {
                    console.error("Error uploading files:", error);
                  }
                }}
              >
                Upload
              </button>


          </div>
      </div>

    </motion.div>
   )
}

export default Project;