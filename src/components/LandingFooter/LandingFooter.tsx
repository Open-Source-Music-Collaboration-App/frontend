import "./LandingFooter.css";

function LandingFooter() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-logo">🎧 OpenSync</div>

        <nav className="footer-nav">
          <ul>
            <li><a href="#">About</a></li>
            {/* <li><a href="#">Open Source</a></li>
            <li><a href="#">Pricing</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Contact</a></li> */}
          </ul>
        </nav>

        <div className="social-icons">
          <a href="https://github.com/open-source-music-collaboration-app"><i className="fab fa-github"></i></a>
        </div>

        <p className="copyright">© 2025 OpenSync. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default LandingFooter;