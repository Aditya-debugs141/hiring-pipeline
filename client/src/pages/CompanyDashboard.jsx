import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getJobs, createJob, resetDatabase } from "../api";

function CompanyDashboard() {
  const adminRole = sessionStorage.getItem("adminRole") || "";
  const isOwner = adminRole.toLowerCase() === "owner";

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: "",
    companyName: isOwner ? "" : adminRole,
    description: "",
    activeCapacity: "",
    decayWindowMinutes: "30",
  });
  const navigate = useNavigate();

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await getJobs();
      
      if (isOwner) {
        setJobs(data);
      } else {
        // Filter jobs strictly for this company with trim to prevent space issues
        setJobs(data.filter(j => j.companyName.toLowerCase().trim() === adminRole.toLowerCase().trim()));
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await createJob({
        title: form.title,
        companyName: form.companyName.trim(),
        description: form.description,
        activeCapacity: Number(form.activeCapacity),
        decayWindowMinutes: Number(form.decayWindowMinutes),
      });
      setForm({
        title: "",
        companyName: isOwner ? "" : adminRole,
        description: "",
        activeCapacity: "",
        decayWindowMinutes: "30",
      });
      setShowForm(false);
      fetchJobs();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWipeData = async () => {
    if (window.confirm("WARNING: Are you sure you want to wipe the entire database? This cannot be undone!")) {
      try {
        
        await resetDatabase();
        setJobs([]);
        alert("Database completely wiped clean!");
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading) return <div className="loading">Loading jobs...</div>;

  return (
    <div>
      <div className="section-header">
        <h1 className="page-title">Company Dashboard</h1>
        <div className="btn-group">
          {isOwner && (
            <button className="btn btn-danger" onClick={handleWipeData}>
              💣 Wipe All Data
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "+ Create New Job"}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form className="form-inline" onSubmit={handleSubmit}>
          <h3>Create New Job Opening</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Job Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Company Name *</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) =>
                  setForm({ ...form, companyName: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              rows="2"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Active Capacity *</label>
              <input
                type="number"
                min="1"
                value={form.activeCapacity}
                onChange={(e) =>
                  setForm({ ...form, activeCapacity: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Decay Window (minutes)</label>
              <input
                type="number"
                min="1"
                value={form.decayWindowMinutes}
                onChange={(e) =>
                  setForm({ ...form, decayWindowMinutes: e.target.value })
                }
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Create Job
          </button>
        </form>
      )}

      {jobs.length === 0 ? (
        <div className="empty-state">
          <p>No jobs yet</p>
          <p>Create your first job opening to get started.</p>
        </div>
      ) : (
        jobs.map((job) => (
          <div
            key={job._id}
            className="card card-clickable"
            onClick={() => navigate(`/admin/jobs/${job._id}`)}
          >
            <div className="card-title">{job.title}</div>
            <div className="card-subtitle">{job.companyName}</div>
            <div className="card-meta">
              <span>
                {job.activeCount}/{job.activeCapacity} active
              </span>
              <span
                className={`badge ${job.isOpen ? "badge-open" : "badge-closed"}`}
              >
                {job.isOpen ? "Open" : "Closed"}
              </span>
              <span>
                Created {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default CompanyDashboard;
