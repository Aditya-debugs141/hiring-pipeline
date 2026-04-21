import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  getJob,
  getJobAudit,
  submitApplication,
  updateStatus,
} from "../api";

function JobPipeline() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditOpen, setAuditOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ applicantName: "", applicantEmail: "" });

  const fetchData = async () => {
    try {
      const [jobData, auditData] = await Promise.all([
        getJob(id),
        getJobAudit(id),
      ]);
      setData(jobData);
      setAudit(auditData);
    } catch (err) {
      console.error("Failed to fetch job:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleApply = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const result = await submitApplication(id, form);
      setMessage({ type: "success", text: result.message, applicationId: result.applicationId });
      setForm({ applicantName: "", applicantEmail: "" });
      fetchData();
      // Keep message visible longer so they have time to copy the ID
      setTimeout(() => setMessage(null), 15000);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    setMessage(null);
    try {
      await updateStatus(appId, newStatus);
      fetchData();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  if (loading) return <div className="loading">Loading pipeline...</div>;
  if (!data || !data.job) return <div className="loading">Job not found</div>;

  const { job, activeApplicants, waitlistedApplicants, exitedApplicants } = data;

  return (
    <div>
      {/* Job Header */}
      <div className="job-header">
        <h1>{job.title}</h1>
        <div className="card-subtitle">{job.companyName}</div>
        <div className="job-header-meta">
          <span>
            {job.activeCount}/{job.activeCapacity} active slots used
          </span>
          <span className={`badge ${job.isOpen ? "badge-open" : "badge-closed"}`}>
            {job.isOpen ? "Open" : "Closed"}
          </span>
          <span>Decay window: {job.decayWindowMinutes} min</span>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`alert alert-${message.type}`}>
          <div style={{ fontWeight: 600 }}>{message.text}</div>
          {message.applicationId && (
            <div style={{ marginTop: "0.6rem" }}>
              Application ID:{" "}
              <span
                style={{
                  fontFamily: "monospace",
                  background: "rgba(255, 255, 255, 0.1)",
                  padding: "0.15rem 0.4rem",
                  borderRadius: "6px",
                  userSelect: "all",
                  cursor: "copy",
                }}
              >
                {message.applicationId}
              </span>
              <div style={{ fontSize: "0.8rem", marginTop: "0.4rem", opacity: 0.8 }}>
                Save this ID to check your status at /status
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Applicant Form */}
      <form className="form-inline" onSubmit={handleApply}>
        <h3>Add Applicant</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={form.applicantName}
              onChange={(e) =>
                setForm({ ...form, applicantName: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={form.applicantEmail}
              onChange={(e) =>
                setForm({ ...form, applicantEmail: e.target.value })
              }
              required
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary">
          Submit Application
        </button>
      </form>

      {/* Active Applicants */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">
            Active Applicants ({activeApplicants.length})
          </h2>
        </div>
        {activeApplicants.length === 0 ? (
          <div className="empty-state">
            <p>No active applicants</p>
          </div>
        ) : (
          activeApplicants.map((app) => (
            <div key={app._id} className="applicant-row">
              <div className="applicant-info">
                <span className="applicant-name">{app.applicantName}</span>
                <span className="applicant-email">{app.applicantEmail}</span>
                {app.resumeUrl && (
                  <a
                    href={`http://localhost:5000${app.resumeUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.8rem", color: "#58a6ff", textDecoration: "none", marginTop: "0.2rem" }}
                  >
                    📄 View Resume
                  </a>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span className={`badge badge-${app.status}`}>
                  {app.status}
                </span>
                <div className="btn-group">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleStatusChange(app._id, "accepted")}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleStatusChange(app._id, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Waitlist */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">
            Waitlist ({waitlistedApplicants.length})
          </h2>
        </div>
        {waitlistedApplicants.length === 0 ? (
          <div className="empty-state">
            <p>No one in the waitlist</p>
          </div>
        ) : (
          waitlistedApplicants.map((app) => (
            <div key={app._id} className="applicant-row">
              <div className="applicant-left">
                {app.waitlistPosition && (
                  <span className="applicant-position">
                    #{app.waitlistPosition}
                  </span>
                )}
                <div className="applicant-info">
                  <span className="applicant-name">{app.applicantName}</span>
                  <span className="applicant-email">{app.applicantEmail}</span>
                  {app.resumeUrl && (
                    <a
                      href={`http://localhost:5000${app.resumeUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "0.8rem", color: "#58a6ff", textDecoration: "none", marginTop: "0.2rem" }}
                    >
                      📄 View Resume
                    </a>
                  )}
                  {app.status === "pending_acknowledgment" &&
                    app.acknowledgeDeadline && (
                      <span className="deadline-text">
                        Deadline:{" "}
                        {new Date(app.acknowledgeDeadline).toLocaleString()}
                      </span>
                    )}
                </div>
              </div>
              <span className={`badge badge-${app.status}`}>
                {app.status.replace("_", " ")}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Exited */}
      {exitedApplicants.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">
              Exited ({exitedApplicants.length})
            </h2>
          </div>
          {exitedApplicants.map((app) => (
            <div key={app._id} className="applicant-row">
              <div className="applicant-info">
                <span className="applicant-name">{app.applicantName}</span>
                <span className="applicant-email">{app.applicantEmail}</span>
              </div>
              <span className={`badge badge-${app.status}`}>{app.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Audit Log */}
      <div className="section">
        <div
          className="collapsible-header"
          onClick={() => setAuditOpen(!auditOpen)}
        >
          <span className="section-title">
            Audit Log ({audit.length} entries)
          </span>
          <span>{auditOpen ? "▲" : "▼"}</span>
        </div>
        {auditOpen && (
          <div className="collapsible-content">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Applicant</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((log) => (
                    <tr key={log._id}>
                      <td>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>{log.applicantName}</td>
                      <td>
                        {log.fromStatus ? (
                          <span className={`badge badge-${log.fromStatus}`}>
                            {log.fromStatus}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${log.toStatus}`}>
                          {log.toStatus}
                        </span>
                      </td>
                      <td>{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default JobPipeline;
