import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import CompanyDashboard from "./pages/CompanyDashboard";
import JobPipeline from "./pages/JobPipeline";
import ApplicantStatus from "./pages/ApplicantStatus";
import ApplyPage from "./pages/ApplyPage";
import InteractiveBackground from "./components/InteractiveBackground";
import "./App.css";

function NavBar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "nav-active" : "";

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        ⬡ Hiring Pipeline
      </Link>
      <div className="nav-links">
        <Link to="/" className={isActive("/")}>Jobs</Link>
        <Link to="/status" className={isActive("/status")}>Check Status</Link>
        <Link to="/admin" className={`${isActive("/admin")} nav-admin`}>Admin</Link>
      </div>
    </nav>
  );
}

import { useState, useEffect } from "react";

function AdminAuth({ children }) {
  const [adminRole, setAdminRole] = useState(
    sessionStorage.getItem("adminRole")
  );
  const [roleInput, setRoleInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "password") {
      sessionStorage.setItem("adminRole", roleInput);
      setAdminRole(roleInput);
    } else {
      setError("Incorrect password");
    }
  };

  if (adminRole) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span className="badge badge-active">Logged in as: {adminRole}</span>
          <button 
            className="btn btn-sm btn-danger"
            onClick={() => {
              sessionStorage.removeItem("adminRole");
              setAdminRole(null);
            }}
          >
            Logout
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="status-card" style={{ marginTop: "10vh" }}>
      <h2 style={{ marginBottom: "1.5rem", color: "#f0f6fc" }}>Admin Portal Login</h2>
      <form onSubmit={handleLogin}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label>Role / Company Name</label>
          <input
            type="text"
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            placeholder='e.g., "Google" or "owner"'
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password..."
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
          Login
        </button>
      </form>
    </div>
  );
}

function App() {
  useEffect(() => {
    const handleMouseMove = (e) => {
      document.body.style.setProperty('--x', `${e.clientX}px`);
      document.body.style.setProperty('--y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <BrowserRouter>
      <InteractiveBackground />
      <div className="pointer-glow" />
      <NavBar />
      <main className="container">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin" element={<AdminAuth><CompanyDashboard /></AdminAuth>} />
          <Route path="/admin/jobs/:id" element={<AdminAuth><JobPipeline /></AdminAuth>} />
          <Route path="/status" element={<ApplicantStatus />} />
          <Route path="/apply/:jobId" element={<ApplyPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
