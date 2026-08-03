import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import "./Landing.css";

function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const enterStudio = () => navigate(user ? "/dashboard" : "/login");

  return (
    <div className="outside-landing">
      <section className="outside-hero">
        <p className="outside-eyebrow">OUTSIDESYNQ · SAN FRANCISCO · 2026</p>
        <div className="outside-sun" aria-hidden="true" />
        <h1>MAKE<br />SOMETHING<br /><em>OUTSIDE.</em></h1>
        <p className="outside-intro">GitHub for music. Start an idea, invite producers to build on it, ask for the exact help your track needs, and let the strongest version rise together.</p>
        <div className="outside-actions">
          <button className="outside-primary" onClick={enterStudio}>{user ? "Back to the studio" : "Enter the studio"} <span>↗</span></button>
        </div>
        <p className="outside-scroll">SCROLL TO FIND YOUR SOUND ↓</p>
      </section>

      <section className="outside-how-it-works">
        <p className="outside-eyebrow">BUILT FOR THE SESSION</p>
        <h2>MORE PEOPLE.<br />MORE POSSIBILITIES.</h2>
        <div className="outside-steps">
          <article><span>01</span><h3>Share the spark</h3><p>Start with an idea, a rough track, or one missing piece—and make the creative brief clear.</p></article>
          <article><span>02</span><h3>Call in your people</h3><p>Ask peers for a bassline, a vocal moment, a drop, or a mix change. Anyone can make a version that moves the track forward.</p></article>
          <article><span>03</span><h3>Choose what hits</h3><p>Keep the strongest community-built version and give every contributor a real place in the song’s story.</p></article>
        </div>
      </section>

      <section className="outside-modes">
        <p className="outside-eyebrow">TWO WAYS TO BUILD</p>
        <h2>ONE SHARED<br />MUSIC ENGINE.</h2>
        <div className="mode-grid">
          <article className="mode-card regular-mode">
            <span>01 / EVERYDAY</span>
            <h3>Studio Circles</h3>
            <p>Private project rooms for producers, friends, and bandmates. Add genre and artist-reference tags, upload Ableton sessions, and shape a song together.</p>
            <button onClick={() => navigate(user ? "/new-project" : "/login")}>Start a regular collab →</button>
          </article>
          <article className="mode-card festival-mode">
            <span>02 / FESTIVAL</span>
            <h3>Outside Lands</h3>
            <p>Outside Lands artists open a V1 to the community. Emerging producers make new versions, and one standout community build can be selected for each festival day.</p>
            <button onClick={() => navigate(user ? "/outside-lands" : "/login")}>Explore the challenge →</button>
          </article>
        </div>
      </section>

      <section className="outside-manifesto">
        <p>THE PARK IS THE PROMPT.</p>
        <h2>MAKE THE VERSION<br />THE CROWD HEARS NEXT.</h2>
        <button className="outside-primary" onClick={() => navigate("/outside-lands")}>See the Outside Lands V1s <span>↗</span></button>
      </section>
    </div>
  );
}

export default Landing;
