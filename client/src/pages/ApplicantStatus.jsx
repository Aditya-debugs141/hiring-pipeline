import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getApplicationStatus, acknowledgePromotion, getApplicationsByEmail, updateStatus } from "../api";

function ApplicantStatus() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Handle redirect from email acknowledge link
  useEffect(() => {
    const acknowledgedId = searchParams.get("acknowledged");
    const errorMsg = searchParams.get("error");
    const emailQuery = searchParams.get("email");

    if (acknowledgedId) {
      setQuery(acknowledgedId);
      setSuccessMessage("Your promotion has been acknowledged successfully!");
      fetchById(acknowledgedId);
    } else if (emailQuery) {
      setQuery(emailQuery);
      fetchByEmail(emailQuery);
    } else if (errorMsg) {
      setError(errorMsg);
    }
  }, [searchParams]);

  const fetchById = async (id) => {
    try {
      const data = await getApplicationStatus(id);
      setApplications([data]);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchByEmail = async (email) => {
    try {
      const data = await getApplicationsByEmail(email);
      if (data.length === 0) {
        setError("No applications found for this email.");
      } else {
        setApplications(data);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError(null);
    setApplications([]);
    setSuccessMessage(null);
    setLoading(true);

    const cleanQuery = query.trim();
    if (cleanQuery.includes("@")) {
      await fetchByEmail(cleanQuery);
    } else {
      await fetchById(cleanQuery);
    }
    setLoading(false);
  };

  const handleAcknowledge = async (appId) => {
    setLoading(true);
    try {
      await acknowledgePromotion(appId);
      setSuccessMessage("Your promotion has been acknowledged successfully!");
      // Re-fetch to update list
      if (query.includes("@")) {
        await fetchByEmail(query.trim());
      } else {
        await fetchById(appId);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleWithdraw = async (appId) => {
    if (!window.confirm("Are you sure you want to withdraw this application? This action cannot be undone.")) return;
    
    setLoading(true);
    try {
      await updateStatus(appId, "withdrawn");
      setSuccessMessage("Your application has been withdrawn.");
      // Re-fetch to update list
      if (query.includes("@")) {
        await fetchByEmail(query.trim());
      } else {
        await fetchById(appId);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="page-title" style={{ textAlign: "center" }}>
        Applicant Dashboard
      </h1>

      <div className="status-card" style={{ maxWidth: applications.length > 1 ? "800px" : "500px" }}>
        <form onSubmit={handleSearch}>
          <div className="form-group">
            <label>Email Address or Application ID</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your email to view all applications"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading ? "Searching..." : "Search Applications"}
          </button>
        </form>

        {successMessage && (
          <div className="alert alert-success" style={{ marginTop: "1rem" }}>
            {successMessage}
          </div>
        )}

        {error && <div className="alert alert-error" style={{ marginTop: "1rem" }}>{error}</div>}

        {applications.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            {applications.length > 1 && <h3>Your Applications ({applications.length})</h3>}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {applications.map((status) => (
                <div key={status.applicationId} className="status-result" style={{ padding: "1.5rem", border: "1px solid #e1e4e8", borderRadius: "6px" }}>
                  <div className="status-field">
                    <span className="status-field-label">Name</span>
                    <span className="status-field-value">{status.applicantName}</span>
                  </div>
                  <div className="status-field">
                    <span className="status-field-label">Job</span>
                    <span className="status-field-value">{status.jobTitle}</span>
                  </div>
                  <div className="status-field">
                    <span className="status-field-label">Status</span>
                    <span className={`badge badge-${status.status}`}>
                      {status.status.replace("_", " ")}
                    </span>
                  </div>
                  {status.waitlistPosition && (
                    <div className="status-field">
                      <span className="status-field-label">Waitlist Position</span>
                      <span className="status-field-value">
                        #{status.waitlistPosition}
                      </span>
                    </div>
                  )}
                  {status.decayCount > 0 && (
                    <div className="status-field">
                      <span className="status-field-label">Decay Count</span>
                      <span className="status-field-value">{status.decayCount}</span>
                    </div>
                  )}
                  {status.acknowledgeDeadline && (
                    <div className="status-field">
                      <span className="status-field-label">Acknowledge By</span>
                      <span className="status-field-value" style={{ color: "#d29922" }}>
                        {new Date(status.acknowledgeDeadline).toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="queue-message">{status.queueMessage}</div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
                    {status.status === "pending_acknowledgment" && (
                      <button
                        className="btn btn-warning"
                        style={{ flex: 1 }}
                        onClick={() => handleAcknowledge(status.applicationId)}
                        disabled={loading}
                      >
                        Acknowledge Promotion
                      </button>
                    )}
                    
                    {["active", "waitlisted", "pending_acknowledgment", "acknowledged"].includes(status.status) && (
                      <button
                        className="btn btn-danger"
                        style={{ flex: status.status === "pending_acknowledgment" ? "0 auto" : 1 }}
                        onClick={() => handleWithdraw(status.applicationId)}
                        disabled={loading}
                      >
                        Withdraw Application
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplicantStatus;
