import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaCog, FaGlobe, FaLock } from "react-icons/fa";
import { useAuth } from "../../context/AuthProvider";
import { apiUrl } from "../../config/api";
import "./ProjectSettings.css";

function ProjectSettings() {
  const { id } = useParams();
  const { user } = useAuth() as { user: any };
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilityFeedback, setVisibilityFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;

    setLoading(true);
    axios
      .get(`${apiUrl}/api/projects/${id}`, { withCredentials: true })
      .then((response) => {
        setProject(response.data?.[0] ?? response.data);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load project settings.");
      })
      .finally(() => setLoading(false));
  }, [user, id]);

  if (loading) {
    return <div className="project-settings-page">Loading project settings…</div>;
  }

  if (error) {
    return (
      <div className="project-settings-page">
        <p className="project-settings-error">{error}</p>
        <button className="back-btn" onClick={() => navigate(`/project/${id}`)}>
          <FaArrowLeft /> Back to project
        </button>
      </div>
    );
  }

  const isOwner = String(project?.ownerGithubId || project?.user_id) === String(user?.id);
  const visibility = project?.visibility === "public" ? "public" : "private";
  const updateVisibility = async (nextVisibility: "public" | "private") => {
    if (!id || nextVisibility === visibility) return;
    const confirmation = nextVisibility === "public"
      ? "Make this project public? Anyone with the link can hear it and join its discussion."
      : "Make this project private? It will be removed from Explore.";
    if (!window.confirm(confirmation)) return;
    setSavingVisibility(true);
    setVisibilityFeedback(null);
    try {
      const { data } = await axios.put(`${apiUrl}/api/projects/${id}/visibility`, { visibility: nextVisibility, actorId: user?.id }, { withCredentials: true });
      setProject((current: any) => ({ ...current, visibility: data.visibility }));
      setVisibilityFeedback(nextVisibility === "public" ? "Public — this project is now listed in Explore." : "Private — this project has been removed from Explore.");
    } catch (err) {
      setVisibilityFeedback(axios.isAxiosError(err) ? err.response?.data?.error || "Couldn’t update visibility." : "Couldn’t update visibility.");
    } finally { setSavingVisibility(false); }
  };

  return (
    <div className="project-settings-page">
      <div className="project-settings-header">
        <FaCog className="project-settings-icon" />
        <div>
          <h1>Project Settings</h1>
          <p>Manage details for this project</p>
        </div>
      </div>

      <div className="project-settings-card">
        <div className="project-settings-row">
          <span className="label">Title</span>
          <span className="value">{project?.title || "Untitled"}</span>
        </div>
        <div className="project-settings-row">
          <span className="label">Owner</span>
          <span className="value">{project?.User?.name || "Unknown"}</span>
        </div>
        <div className="project-settings-row">
          <span className="label">Status</span>
          <span className="value">{project?.status || "active"}</span>
        </div>
        <div className="project-settings-row">
          <span className="label">Hashtags</span>
          <span className="value">
            {Array.isArray(project?.hashtags) && project.hashtags.length > 0
              ? project.hashtags.map((tag: string) => `#${tag}`).join(" ")
              : "None"}
          </span>
        </div>
        <div className="project-visibility-settings">
          <div><span className="label">Visibility</span><p>{visibility === "public" ? "Listed in Explore and open for public field notes." : "Only collaborators you invite can access this session."}</p></div>
          <div className="visibility-toggle" aria-label="Project visibility">
            <button className={visibility === "private" ? "active active-private" : ""} aria-pressed={visibility === "private"} disabled={!isOwner || savingVisibility} onClick={() => updateVisibility("private")}><FaLock /> Private</button>
            <button className={visibility === "public" ? "active active-public" : ""} aria-pressed={visibility === "public"} disabled={!isOwner || savingVisibility} onClick={() => updateVisibility("public")}><FaGlobe /> Public</button>
          </div>
          {visibilityFeedback && <p className="visibility-feedback">{visibilityFeedback}</p>}
          {!isOwner && <small>Only the project owner can change visibility.</small>}
        </div>
      </div>

      <p className="project-settings-note">
        Account-wide preferences (notifications, appearance, onboarding) live in
        your profile Settings menu.
      </p>
    </div>
  );
}

export default ProjectSettings;
