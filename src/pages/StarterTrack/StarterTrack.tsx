import { useState } from "react";
import axios from "axios";
import { FaArrowLeft, FaDownload, FaMusic, FaPlus, FaWaveSquare } from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import NativeAudioPlayer from "../../components/NativeAudioPlayer/NativeAudioPlayer";
import { useAuth } from "../../context/AuthProvider";
import { apiUrl } from "../../config/api";
import StarterDiscussion from "../../components/StarterDiscussion/StarterDiscussion";
import "./StarterTrack.css";

const versions = [
  { name: "Maya Lin", title: "Low-light club mix", note: "Kept the original drums and added a rolling bass line.", time: "2h ago" },
  { name: "Jules R", title: "Sunset vocal cut", note: "Built a new topline around the starter chord stem.", time: "Yesterday" },
  { name: "Noa Park", title: "Peak-time edit", note: "Turned the original percussion into a faster festival break.", time: "2 days ago" },
];

export default function StarterTrack() {
  const [params] = useSearchParams();
  const artist = params.get("artist") || "Outside Lands artist";
  const genre = params.get("genre") || "Electronic";
  const { user } = useAuth() as { user: any };
  const navigate = useNavigate();
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");
  const [feedTab, setFeedTab] = useState<"versions" | "chat">("versions");
  const starterQuery = `?artist=${encodeURIComponent(artist)}`;

  const buildVersion = async () => {
    if (!user?.id || building) return;
    setBuilding(true);
    setError("");
    try {
      const { data } = await axios.post(`${apiUrl}/api/projects/starter-tracks/build`, {
        userId: user.id, username: user.username || user.displayName || user.id, artistName: artist, artistGenre: genre,
      }, { withCredentials: true });
      navigate(`/project/${data.id}`);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Could not open your version. Please try again.");
      setBuilding(false);
    }
  };

  return <main className="starter-track-page">
    <button className="starter-back" onClick={() => navigate("/outside-lands")}><FaArrowLeft /> Outside Lands</button>
    <section className="starter-track-hero">
      <div>
        <p className="starter-kicker">OUTSIDE LANDS / STARTER TRACK</p>
        <h1>Build with<br /><em>{artist}.</em></h1>
        <p className="starter-summary">Start from the artist’s original Ableton session, make it yours, and keep at least one source stem in your version.</p>
      </div>
      <div className="starter-player-card">
        <span><FaWaveSquare /> ORIGINAL STARTER</span>
        <h2>{artist} — Festival Sketch</h2>
        <NativeAudioPlayer src={`${apiUrl}/api/projects/starter-tracks/audio${starterQuery}`} label={`${artist} starter track`} />
        <a className="starter-download" href={`${apiUrl}/api/projects/starter-tracks/download${starterQuery}`}><FaDownload /> Download source files</a>
      </div>
    </section>

    <section className="starter-build-callout">
      <div><p>YOUR TURN</p><h2>Create your version with {artist}</h2><span>The original session and stems will be copied into a project under My Projects.</span></div>
      <button onClick={buildVersion} disabled={building}>{building ? "Opening your studio…" : <><FaPlus /> Build your version</>}</button>
      {error && <p className="starter-error">{error}</p>}
    </section>

    <section className="starter-feed">
      <div className="starter-feed-heading"><div><p className="starter-kicker">PUBLIC VERSIONS</p><h2>What the community is building</h2></div><span><FaMusic /> 48 versions</span></div>
      <div className="starter-feed-tabs"><button className={feedTab === "versions" ? "active" : ""} onClick={() => setFeedTab("versions")}>Versions</button><button className={feedTab === "chat" ? "active" : ""} onClick={() => setFeedTab("chat")}>Starter chat</button></div>
      {feedTab === "chat" ? <StarterDiscussion artist={artist} /> : <div className="starter-version-grid">
        {versions.map((version) => <article key={version.name}>
          <div className="starter-avatar">{version.name.split(" ").map((part) => part[0]).join("")}</div>
          <div><small>{version.name} · {version.time}</small><h3>{version.title}</h3><p>{version.note}</p><NativeAudioPlayer src={`${apiUrl}/api/projects/starter-tracks/audio${starterQuery}`} label={version.title} /><StarterDiscussion artist={`${artist}-${version.title}`} compact /></div>
        </article>)}
      </div>}
    </section>
  </main>;
}
